import asyncio
from typing import List
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from app.chat_store import get_user_workflow_distribution, ChatStoreError

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])

class WorkflowDistributionSchema(BaseModel):
    id: str
    label: str
    value: int
    percentage: float
    color: str

@router.get("/workflow-distribution", response_model=List[WorkflowDistributionSchema])
async def workflow_distribution_endpoint(user_id: str = Query(..., min_length=1)):
    try:
        data = await asyncio.to_thread(get_user_workflow_distribution, user_id)
        print("show data",data)
        return data
    except ChatStoreError as exc:
        raise HTTPException(status_code=503, detail="خطا در برقراری ارتباط با دیتابیس ارزیابی ردیابی.") from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))