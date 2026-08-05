import asyncio
from typing import List
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel


from app.chat_store import (
    get_user_workflow_distribution, 
    get_user_metrics, 
    ChatStoreError
)

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])


class WorkflowDistributionSchema(BaseModel):
    id: str
    label: str
    value: int
    percentage: float
    color: str

class DashboardMetricsSchema(BaseModel):
    web_searches: int


@router.get("/workflow-distribution", response_model=List[WorkflowDistributionSchema])
async def workflow_distribution_endpoint(user_id: str = Query(..., min_length=1)):
    """دریافت دیتای مربوط به چارت دونات برای نمایش توزیع گره‌های لنگ‌گراف"""
    try:
        raw_data = await asyncio.to_thread(get_user_workflow_distribution, user_id)
        
        
        formatted_data = []
        for item in raw_data:
            formatted_data.append({
                "id": item.get("node_id", "unknown"),
                "label": item.get("node_label", "Unknown"),
                "value": item.get("execution_count", 0),
                "percentage": item.get("percentage", 0.0),
                "color": item.get("node_color", "#64748b")
            })
            
        return formatted_data
        
    except ChatStoreError as exc:
        raise HTTPException(status_code=503, detail="خطا در برقراری ارتباط با دیتابیس توزیع پردازش.") from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("/metrics", response_model=DashboardMetricsSchema)
async def metrics_endpoint(user_id: str = Query(..., min_length=1)):
    """دریافت آمارهای عددی بالای داشبورد مانند تعداد کل جستجوهای وب"""
    try:
        # اجرا در Thread جداگانه برای جلوگیری از بلاک شدن Event Loop
        metrics_data = await asyncio.to_thread(get_user_metrics, user_id)
        
        return metrics_data
        
    except ChatStoreError as exc:
        raise HTTPException(status_code=503, detail="خطا در برقراری ارتباط با دیتابیس برای دریافت متریک‌ها.") from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))