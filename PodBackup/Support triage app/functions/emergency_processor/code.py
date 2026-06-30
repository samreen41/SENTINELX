#function_name: emergency_processor
#input_type_name: EmergencyInput
#output_type_name: EmergencyOutput

from typing import Literal
from pydantic import BaseModel


class EmergencyInput(BaseModel):
    message: str


class EmergencyOutput(BaseModel):
    severity: Literal["Low", "Medium", "High", "Critical"]
    status: str
    summary: str


def emergency_processor(context, input: EmergencyInput) -> EmergencyOutput:
    message = input.message.lower()

    severity = "Low"

    if any(word in message for word in [
        "fire",
        "explosion",
        "bomb",
        "gun",
        "accident",
        "collapse"
    ]):
        severity = "Critical"

    elif any(word in message for word in [
        "fight",
        "injury",
        "medical",
        "earthquake"
    ]):
        severity = "High"

    elif any(word in message for word in [
        "suspicious",
        "theft",
        "crowd"
    ]):
        severity = "Medium"

    return EmergencyOutput(
        severity=severity,
        status="processed",
        summary=f"Emergency classified as {severity}"
    )