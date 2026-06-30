#input_type_name: StatsOverviewInput
#output_type_name: StatsOverviewResult
#function_name: stats_overview

import json, traceback
from datetime import datetime, timezone
from pydantic import BaseModel
from lemma_sdk import FunctionContext, Pod


class StatsOverviewInput(BaseModel):
    pass


class StatsOverviewResult(BaseModel):
    total_emergencies: int
    critical_last_hour: int
    normal_last_hour: int
    fall_events_last_hour: int
    sos_events_last_hour: int
    active_devices: int
    last_tick: str | None = None
    last_reading_at: str | None = None
    debug: str | None = None


def _parse(s):
    if not s: return None
    try: return datetime.fromisoformat(s.replace("Z", "+00:00"))
    except Exception: return None


async def stats_overview(ctx: FunctionContext, data: StatsOverviewInput) -> StatsOverviewResult:
    try:
        pod = Pod.from_env()
        emergencies = [r.to_dict() for r in pod.table("emergencies").list(limit=500).items]
        readings = [r.to_dict() for r in pod.table("sensor_readings").list(
            limit=500, sort=[{"field":"recorded_at","desc":True}]).items]
        devices = [d.to_dict() for d in pod.table("devices").list(limit=200).items]

        now = datetime.now(timezone.utc)
        crit_h = norm_h = falls_h = sos_h = 0
        last_reading_at = None
        for r in readings:
            ts = r.get("recorded_at") or r.get("created_at")
            pt = _parse(ts)
            is_crit = bool(r.get("fall_detected")) or bool(r.get("sos_pressed"))
            if pt and (now - pt).total_seconds() <= 3600:
                if is_crit: crit_h += 1
                else:       norm_h += 1
                if r.get("fall_detected"): falls_h += 1
                if r.get("sos_pressed"):   sos_h   += 1
            if pt and (last_reading_at is None or pt > _parse(last_reading_at)):
                last_reading_at = ts

        last_tick = None
        for e in emergencies:
            ts = e.get("updated_at") or e.get("created_at")
            pt = _parse(ts)
            if pt and (last_tick is None or pt > _parse(last_tick)):
                last_tick = ts

        active = sum(1 for d in devices if (d.get("status") or "active") == "active")
        return StatsOverviewResult(
            total_emergencies=len(emergencies),
            critical_last_hour=crit_h, normal_last_hour=norm_h,
            fall_events_last_hour=falls_h, sos_events_last_hour=sos_h,
            active_devices=active, last_tick=last_tick, last_reading_at=last_reading_at,
            debug=f"emerg={len(emergencies)} readings={len(readings)} devs={len(devices)}",
        )
    except Exception as e:
        return StatsOverviewResult(
            total_emergencies=0, critical_last_hour=0, normal_last_hour=0,
            fall_events_last_hour=0, sos_events_last_hour=0, active_devices=0,
            debug=f"{type(e).__name__}: {e} | {traceback.format_exc()[:500]}"
        )
