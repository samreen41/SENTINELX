#input_type_name: PingIn
#output_type_name: PingOut
#function_name: ping

from pydantic import BaseModel
from lemma_sdk import FunctionContext, Pod

class PingIn(BaseModel): pass
class PingOut(BaseModel):
    msg: str
    n: int

async def ping(ctx: FunctionContext, data: PingIn) -> PingOut:
    return PingOut(msg="hello", n=42)
