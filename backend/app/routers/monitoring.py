"""FastAPI router for the Monitoring dashboard (backend-only, brand-new file).

مسیر جدید و مستقل از dashboard.py — چون این صفحه (Monitoring / infra health)
از نظر دامنه با صفحه‌ی Analytics فرق دارد و قراره در آینده System Status و
AI Health Score هم به همین‌جا اضافه شوند.
"""

import asyncio
from typing import List, Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from app.monitoring_store import get_response_time_metrics
from app.chat_store import ChatStoreError
from app.auth import get_current_user_with_role, AuthenticatedUser

router = APIRouter(prefix="/api/monitoring", tags=["Monitoring"])

Timeframe = Literal["today", "week", "month", "all"]


class ResponseTimeChartPointSchema(BaseModel):
    label: str
    value: float


class ResponseTimeMetricsSchema(BaseModel):
    avg_response_time_s: float
    percentage_change: float
    trend: Literal["up", "down"]
    chart_data: List[ResponseTimeChartPointSchema]


@router.get("/response-time", response_model=ResponseTimeMetricsSchema)
async def response_time_endpoint(
    timeframe: Timeframe = Query("week", description="بازه‌ی زمانی: today | week | month | all"),
    auth: AuthenticatedUser = Depends(get_current_user_with_role),
):
    """میانگین زمان پاسخ (ثانیه) برای KPI و چارت Response Time در صفحه Monitoring."""
    try:
        metrics_data = await asyncio.to_thread(
            get_response_time_metrics, auth.user_id, auth.is_admin, timeframe
        )
        return metrics_data
    except ChatStoreError as exc:
        raise HTTPException(
            status_code=503,
            detail="خطا در برقراری ارتباط با دیتابیس برای دریافت متریک زمان پاسخ.",
        ) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
