#input_type_name: ProcessReadingInput
#output_type_name: ProcessReadingResult
#function_name: process_reading

import json
import time
from datetime import datetime, timezone
from typing import Optional
from pydantic import BaseModel, Field
from lemma_sdk import FunctionContext, Pod


class ProcessReadingInput(BaseModel):
    device_code: str
    heart_rate: int = Field(ge=0, le=300)
    body_temp_c: Optional[float] = None
    fall_detected: bool = False
    movement: str = "normal"
    sos_pressed: bool = False
    lat: Optional[float] = None
    lng: Optional[float] = None
    battery_pct: Optional[int] = None
    source: str = "manual"
    recorded_at: Optional[str] = None


class ProcessReadingResult(BaseModel):
    reading_id: str
    device_id: str
    emergency: bool
    severity: Optional[str] = None
    confidence: Optional[float] = None
    reason: Optional[str] = None
    action: Optional[str] = None
    emergency_id: Optional[str] = None
    agent_conversation_id: Optional[str] = None


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


async def process_reading(ctx: FunctionContext, data: ProcessReadingInput) -> ProcessReadingResult:
    pod = Pod.from_env()

    devices = pod.records.list(
        "devices",
        filter=[{"field": "device_code", "op": "eq", "value": data.device_code}],
        limit=1,
    ).to_dict()["items"]
    if not devices:
        raise ValueError(f"Unknown device_code: {data.device_code}")
    device = devices[0]
    device_id = device["id"]

    recorded_at = data.recorded_at or _now_iso()

    reading = pod.table("sensor_readings").create({
        "device_id": device_id,
        "heart_rate": data.heart_rate,
        "body_temp_c": data.body_temp_c,
        "fall_detected": data.fall_detected,
        "movement": data.movement,
        "sos_pressed": data.sos_pressed,
        "lat": data.lat,
        "lng": data.lng,
        "source": data.source,
        "recorded_at": recorded_at,
    })

    upd = {"last_seen_at": recorded_at}
    if data.lat is not None: upd["last_lat"] = data.lat
    if data.lng is not None: upd["last_lng"] = data.lng
    if data.battery_pct is not None: upd["battery_pct"] = data.battery_pct
    upd["status"] = "sos" if data.sos_pressed else "active"
    pod.table("devices").update(device_id, upd)

    payload = {
        "device_code": data.device_code,
        "owner_role": device.get("owner_role", "general"),
        "heart_rate": data.heart_rate,
        "body_temp_c": data.body_temp_c,
        "fall_detected": data.fall_detected,
        "movement": data.movement,
        "sos_pressed": data.sos_pressed,
        "lat": data.lat,
        "lng": data.lng,
        "recorded_at": recorded_at,
    }
    conv = pod.agents.run(
        "emergency-analyst",
        json.dumps(payload),
        title=f"analyze {data.device_code} @ {recorded_at}",
    )
    conv_id = str(conv.id)
    deadline = time.monotonic() + 100
    decision: dict = {}
    while time.monotonic() < deadline:
        snap = pod.conversations.get(conv_id)
        if str(snap.status) == "COMPLETED":
            decision = snap.output if isinstance(snap.output, dict) else {}
            break
        if str(snap.status) == "FAILED":
            raise RuntimeError(snap.last_run_error or "agent failed")
        time.sleep(1.0)
    if not decision:
        raise RuntimeError("emergency-analyst did not return a structured decision in 100s")

    emergency = bool(decision.get("emergency"))
    severity = decision.get("severity")
    confidence = decision.get("confidence")
    reason = decision.get("reason") or ""
    action = decision.get("action") or ""

    emergency_id = None
    if emergency:
        em = pod.table("emergencies").create({
            "device_id": device_id,
            "triggering_reading_id": reading["id"],
            "severity": severity,
            "confidence": float(confidence) if confidence is not None else 0.0,
            "reason": reason,
            "action": action,
            "status": "open",
            "lat": data.lat,
            "lng": data.lng,
            "opened_at": recorded_at,
        })
        emergency_id = em["id"]
        pod.records.bulk_create("alert_events", [{
            "emergency_id": emergency_id,
            "kind": "detected",
            "channel": "log",
            "message": f"AI severity={severity} confidence={confidence}. {reason}",
            "occurred_at": _now_iso(),
        }])

    return ProcessReadingResult(
        reading_id=reading["id"],
        device_id=device_id,
        emergency=emergency,
        severity=severity if emergency else None,
        confidence=float(confidence) if (confidence is not None and emergency) else None,
        reason=reason if emergency else None,
        action=action if emergency else None,
        emergency_id=emergency_id,
        agent_conversation_id=conv_id,
    )
