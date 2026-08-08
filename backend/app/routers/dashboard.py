import asyncio
from typing import List, Literal
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from app.chat_store import (
    get_user_workflow_distribution,
    get_user_metrics,
    get_user_questions_metrics,
    ChatStoreError,
)
from app.auth import get_current_user_with_role, AuthenticatedUser

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])

Timeframe = Literal["today", "week", "month", "all"]


class WorkflowDistributionSchema(BaseModel):
    id: str
    label: str
    value: int
    percentage: float
    color: str

class DashboardMetricsSchema(BaseModel):
    web_searches: int

class QuestionsChartPointSchema(BaseModel):
    label: str
    value: int

class QuestionsMetricsSchema(BaseModel):
    total_today: int
    percentage_change: float
    trend: Literal["up", "down"]
    chart_data: List[QuestionsChartPointSchema]


@router.get("/workflow-distribution", response_model=List[WorkflowDistributionSchema])
async def workflow_distribution_endpoint(
    timeframe: Timeframe = Query("all", description="بازه‌ی زمانی: today | week | month | all"),
    auth: AuthenticatedUser = Depends(get_current_user_with_role),
):
    """دریافت دیتای مربوط به چارت دونات برای نمایش توزیع گره‌های لنگ‌گراف، با فیلتر زمانی اختیاری"""
    try:
        raw_data = await asyncio.to_thread(
            get_user_workflow_distribution,
            auth.user_id,
            auth.is_admin,
            timeframe,
        )

        formatted_data = []
        for item in raw_data:
            formatted_data.append({
                "id": item.get("node_id", "unknown"),
                "label": item.get("node_label", "Unknown"),
                "value": item.get("execution_count", 0),
                "percentage": item.get("percentage", 0.0),
                "color": item.get("node_color", "#64748b"),
            })

        return formatted_data

    except ChatStoreError as exc:
        raise HTTPException(status_code=503, detail="خطا در برقراری ارتباط با دیتابیس توزیع پردازش.") from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("/metrics", response_model=DashboardMetricsSchema)
async def metrics_endpoint(
    auth: AuthenticatedUser = Depends(get_current_user_with_role)
):
    """دریافت آمارهای عددی بالای داشبورد مانند تعداد کل جستجوهای وب"""
    try:
        metrics_data = await asyncio.to_thread(get_user_metrics, auth.user_id, auth.is_admin)
        return metrics_data
    except ChatStoreError as exc:
        raise HTTPException(status_code=503, detail="خطا در برقراری ارتباط با دیتابیس برای دریافت متریک‌ها.") from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("/questions-metrics", response_model=QuestionsMetricsSchema)
async def questions_metrics_endpoint(
    auth: AuthenticatedUser = Depends(get_current_user_with_role)
):
    """دریافت آمار سوالات پرسیده‌شده (پیام‌های کاربر) برای KPI و چارت هفتگی"""
    try:
        metrics_data = await asyncio.to_thread(get_user_questions_metrics, auth.user_id, auth.is_admin)
        return metrics_data
    except ChatStoreError as exc:
        raise HTTPException(
            status_code=503,
            detail="خطا در برقراری ارتباط با دیتابیس برای دریافت متریک سوالات.",
        ) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))