#input_type_name: ListEmergenciesInput
#output_type_name: ListEmergenciesResult
#function_name: list_emergencies

from pydantic import BaseModel
from lemma_sdk import FunctionContext, Pod


class ListEmergenciesInput(BaseModel):
    limit: int = 25


class ListEmergenciesResult(BaseModel):
    rows: list
    count: int


async def list_emergencies(ctx: FunctionContext, data: ListEmergenciesInput) -> ListEmergenciesResult:
    pod = Pod.from_env()
    rows = [r.to_dict() for r in pod.table("emergencies").list(
        limit=data.limit,
        sort=[{"field": "created_at", "desc": True}],
    ).items]
    devices = [d.to_dict() for d in pod.table("devices").list(limit=200).items]
    by_dev = {d.get("id"): d for d in devices}

    out = []
    for r in rows[:data.limit]:
        d = by_dev.get(r.get("device_id")) or {}
        out.append({
            "id":                r.get("id"),
            "device_id":         r.get("device_id"),
            "device_code":       d.get("device_code") or "—",
            "owner_name":        d.get("owner_name")  or "—",
            "status":            r.get("status") or "open",
            "severity":          r.get("severity") or "—",
            "reason":            r.get("reason"),
            "action":            r.get("action"),
            "confidence":        r.get("confidence"),
            "contacts_notified": r.get("contacts_notified"),
            "lat":               r.get("lat"),
            "lng":               r.get("lng"),
            "location":          f"{float(r.get('lat') or 0):.4f}, {float(r.get('lng') or 0):.4f}",
            "created_at":        r.get("created_at"),
            "updated_at":        r.get("updated_at"),
        })
    return ListEmergenciesResult(rows=out, count=len(out))
