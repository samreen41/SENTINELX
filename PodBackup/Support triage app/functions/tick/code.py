#input_type_name: TickInput
#output_type_name: TickResult
#function_name: tick

import json
import time
import random
from datetime import datetime, timezone
from typing import Optional, List, Literal
from pydantic import BaseModel
from lemma_sdk import FunctionContext, Pod


class TickInput(BaseModel):
    scenario: Literal["normal", "fall", "sos", "bradycardia", "elevated_hr"] = "normal"
    device_code: Optional[str] = None  # if None, tick ALL active devices


class PerDevice(BaseModel):
    device_code: str
    device_id: str
    input_payload: dict
    emergency: bool
    severity: Optional[str] = None
    confidence: Optional[float] = None
    reason: Optional[str] = None
    action: Optional[str] = None
    reading_id: Optional[str] = None
    emergency_id: Optional[str] = None


class TickResult(BaseModel):
    ticks: List[PerDevice]
    count: int


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _drift(base: float, meters: float) -> float:
    return base + (meters / 111000.0) * random.uniform(-1, 1)


def _synthesize_reading(device: dict, scenario: str) -> dict:
    lat = device.get("last_lat") or 12.9716
    lng = device.get("last_lng") or 77.5946
    lat = _drift(lat, 20)
    lng = _drift(lng, 20)

    base_hr = 78 if device.get("owner_role") != "athlete" else 55
    hr = max(45, min(180, int(round(base_hr + random.gauss(0, 4)))))

    # In normal mode, random 1% chance of accidental fall to keep hero moment alive.
    s_used = scenario
    if scenario == "normal" and random.random() < 0.01:
        s_used = "fall"

    fall = False
    movement = "normal"
    sos = False
    body_temp = 36.8 + random.uniform(-0.3, 0.3)

    if s_used == "fall":
        fall = True; hr = max(hr, 110 + random.randint(0, 25)); movement = "none"
    elif s_used == "sos":
        sos = True; hr = max(hr, 100 + random.randint(0, 30))
    elif s_used == "bradycardia":
        hr = random.randint(35, 48); movement = "low"
    elif s_used == "elevated_hr":
        hr = random.randint(125, 155)

    battery = max(5, (device.get("battery_pct") or 100) - random.choice([0, 0, 1]))

    return {
        "heart_rate": hr,
        "body_temp_c": round(body_temp, 1),
        "fall_detected": fall,
        "movement": movement,
        "sos_pressed": sos,
        "lat": round(lat, 6),
        "lng": round(lng, 6),
        # battery_pct is a device-level field, not a reading column
        "source": "tick",
        "recorded_at": _now_iso(),
    }


async def tick(ctx: FunctionContext, data: TickInput) -> TickResult:
    pod = Pod.from_env()

    if data.device_code:
        devices = pod.records.list(
            "devices",
            filter=[{"field": "device_code", "op": "eq", "value": data.device_code}],
            limit=1,
        ).to_dict()["items"]
    else:
        devices = pod.records.list(
            "devices",
            filter=[{"field": "status", "op": "ne", "value": "offline"}],
            limit=20,
        ).to_dict()["items"]

    ticks: List[PerDevice] = []
    for device in devices:
        reading = _synthesize_reading(device, data.scenario)

        # 1) Persist sensor reading.
        sr = pod.table("sensor_readings").create({
            "device_id": device["id"],
            **{k: v for k, v in reading.items() if k != "recorded_at"},
            "recorded_at": reading["recorded_at"],
        })

        # 2) Update device last_seen / status / battery / coords.
        upd = {"last_seen_at": reading["recorded_at"]}
        if reading["lat"] is not None:
            upd["last_lat"] = reading["lat"]
        if reading["lng"] is not None:
            upd["last_lng"] = reading["lng"]
        # battery_pct computed above; updating device battery would need the column - skipped
        upd["status"] = "sos" if reading["sos_pressed"] else "active"
        pod.table("devices").update(device["id"], upd)

        # 3) Call the Emergency Analyst agent — agent.execute path, not nested function.
        payload = {
            "device_code": device["device_code"],
            "owner_role": device.get("owner_role", "general"),
            "heart_rate": reading["heart_rate"],
            "body_temp_c": reading["body_temp_c"],
            "fall_detected": reading["fall_detected"],
            "movement": reading["movement"],
            "sos_pressed": reading["sos_pressed"],
            "lat": reading["lat"],
            "lng": reading["lng"],
            "recorded_at": reading["recorded_at"],
        }
        try:
            conv = pod.agents.run(
                "emergency-analyst",
                json.dumps(payload),
                title=f"analyze {device['device_code']} @ {reading['recorded_at']}",
            )
            deadline = time.monotonic() + 100
            decision: dict = {}
            while time.monotonic() < deadline:
                snap = pod.conversations.get(str(conv.id))
                if str(snap.status) == "COMPLETED":
                    decision = snap.output if isinstance(snap.output, dict) else {}
                    break
                if str(snap.status) == "FAILED":
                    raise RuntimeError(snap.last_run_error or "agent failed")
                time.sleep(1.0)
            if not decision:
                decision = {"emergency": False, "reason": "agent timed out", "action": "manual review"}
        except Exception as e:
            decision = {"emergency": False, "reason": f"agent error: {e}", "action": "manual review"}

        # 4) If emergency, open an emergencies row + audit alert_event.
        emergency = bool(decision.get("emergency"))
        severity = decision.get("severity")
        confidence = decision.get("confidence")
        reason = decision.get("reason") or ""
        action = decision.get("action") or ""

        emergency_id = None
        if emergency:
            em = pod.table("emergencies").create({
                "device_id": device["id"],
                "triggering_reading_id": sr["id"],
                "severity": severity,
                "confidence": float(confidence) if confidence is not None else 0.0,
                "reason": reason,
                "action": action,
                "status": "open",
                "lat": reading["lat"],
                "lng": reading["lng"],
                "opened_at": reading["recorded_at"],
            })
            emergency_id = em["id"]
            pod.records.bulk_create("alert_events", [{
                "emergency_id": emergency_id,
                "kind": "detected",
                "channel": "log",
                "message": f"AI severity={severity} confidence={confidence}. {reason}",
                "occurred_at": _now_iso(),
            }])

        ticks.append(PerDevice(
            device_code=device["device_code"],
            device_id=device["id"],
            input_payload=reading,
            emergency=emergency,
            severity=severity if emergency else None,
            confidence=float(confidence) if (confidence is not None and emergency) else None,
            reason=reason if emergency else None,
            action=action if emergency else None,
            reading_id=sr["id"],
            emergency_id=emergency_id,
        ))

    return TickResult(ticks=ticks, count=len(ticks))
