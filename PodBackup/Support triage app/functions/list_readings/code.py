#input_type_name: ListReadingsInput
#output_type_name: ListReadingsResult
#function_name: list_readings

from pydantic import BaseModel
from lemma_sdk import FunctionContext, Pod


class ListReadingsInput(BaseModel):
    limit: int = 30


class ListReadingsResult(BaseModel):
    rows: list
    count: int


async def list_readings(ctx: FunctionContext, data: ListReadingsInput) -> ListReadingsResult:
    pod = Pod.from_env()
    rows = [r.to_dict() for r in pod.table("sensor_readings").list(
        limit=data.limit,
        sort=[{"field": "recorded_at", "desc": True}],
    ).items]
    devices = [d.to_dict() for d in pod.table("devices").list(limit=200).items]
    by_dev = {d.get("id"): d for d in devices}

    out = []
    for r in rows[:data.limit]:
        hr = r.get("heart_rate")
        if r.get("fall_detected"):
            sev, label = "critical", "FALL DETECTED"
        elif r.get("sos_pressed"):
            sev, label = "critical", "SOS PRESSED"
        elif hr is not None and (hr < 50 or hr > 130):
            sev, label = "high", "ABNORMAL HR"
        else:
            sev, label = "normal", "normal"
        d = by_dev.get(r.get("device_id")) or {}
        out.append({
            "id":             r.get("id"),
            "device_id":      r.get("device_id"),
            "device_code":    d.get("device_code") or "—",
            "owner_name":     d.get("owner_name")  or "—",
            "heart_rate":     hr,
            "fall_detected":  bool(r.get("fall_detected")),
            "sos_pressed":    bool(r.get("sos_pressed")),
            "motion":         r.get("motion"),
            "body_temp_c":    r.get("body_temp_c"),
            "severity":       sev,
            "severity_label": label,
            "location":       f"{float(r.get('lat') or 0):.4f}, {float(r.get('lng') or 0):.4f}",
            "recorded_at":    r.get("recorded_at"),
            "created_at":     r.get("created_at"),
        })
    return ListReadingsResult(rows=out, count=len(out))
