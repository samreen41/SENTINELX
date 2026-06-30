#input_type_name: NotifyContactsInput
#output_type_name: NotifyContactsResult
#function_name: notify_emergency_contacts

from datetime import datetime, timezone
from typing import List
from pydantic import BaseModel
from lemma_sdk import FunctionContext, Pod


class NotifyContactsInput(BaseModel):
    emergency_id: str


class ContactDispatch(BaseModel):
    name: str
    relationship: str
    channel: str
    target: str
    message: str


class NotifyContactsResult(BaseModel):
    emergency_id: str
    contacts_notified: int
    dispatch: List[ContactDispatch]


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


async def notify_emergency_contacts(ctx, data: NotifyContactsInput) -> NotifyContactsResult:
    pod = Pod.from_env()

    em = pod.table("emergencies").get(data.emergency_id)
    device = pod.table("devices").get(em["device_id"])

    contacts = pod.records.list(
        "contacts",
        filter=[{"field": "device_id", "op": "eq", "value": em["device_id"]}],
        sort=[{"field": "priority", "direction": "asc"}],
        limit=20,
    ).to_dict()["items"]

    if not contacts:
        # Even with no roster, log it.
        pod.records.bulk_create("alert_events", [{
            "emergency_id": data.emergency_id,
            "kind": "notified",
            "channel": "log",
            "message": f"No emergency contacts configured for {device['device_code']}.",
            "occurred_at": _now_iso(),
        }])
        return NotifyContactsResult(emergency_id=data.emergency_id, contacts_notified=0, dispatch=[])

    rows = []
    dispatch: List[ContactDispatch] = []
    maps_link = ""
    if em.get("lat") is not None and em.get("lng") is not None:
        maps_link = f"https://maps.google.com/?q={em['lat']},{em['lng']}"

    for c in contacts:
        body_line = (
            f"SentinelX ALERT ({em.get('severity','?').upper()}, "
            f"{int(em.get('confidence',0))}% confidence). "
            f"Wearer {device.get('owner_name','?')} needs help. "
        )
        if maps_link:
            body_line += f"Live location: {maps_link}"
        if em.get("reason"):
            body_line += f" Reason: {em['reason']}"

        # Dispatch SMS if phone, email if email. Always append a "notified" event.
        if c.get("phone"):
            rows.append({
                "emergency_id": data.emergency_id,
                "kind": "sms_sent",
                "recipient": c["name"],
                "channel": "sms",
                "message": f"SMS -> {c['phone']}: {body_line}",
                "occurred_at": _now_iso(),
            })
            dispatch.append(ContactDispatch(
                name=c["name"], relationship=c.get("relationship",""),
                channel="sms", target=c["phone"], message=body_line,
            ))
        if c.get("email"):
            rows.append({
                "emergency_id": data.emergency_id,
                "kind": "email_sent",
                "recipient": c["name"],
                "channel": "email",
                "message": f"Email -> {c['email']}: {body_line}",
                "occurred_at": _now_iso(),
            })
            dispatch.append(ContactDispatch(
                name=c["name"], relationship=c.get("relationship",""),
                channel="email", target=c["email"], message=body_line,
            ))
        if not c.get("phone") and not c.get("email"):
            # No channel — just log
            rows.append({
                "emergency_id": data.emergency_id,
                "kind": "notified",
                "recipient": c["name"],
                "channel": "log",
                "message": f"Could not dispatch: contact record has no phone/email.",
                "occurred_at": _now_iso(),
            })

    pod.records.bulk_create("alert_events", rows)
    pod.table("emergencies").update(data.emergency_id, {"status": "notified"})

    return NotifyContactsResult(
        emergency_id=data.emergency_id,
        contacts_notified=len(dispatch),
        dispatch=dispatch,
    )
