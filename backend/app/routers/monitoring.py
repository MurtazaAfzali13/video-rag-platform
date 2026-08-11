

import asyncio
from typing import List, Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from typing import Optional

from app.monitoring_store import get_response_time_metrics, get_ai_health_score
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


class HealthMetricSchema(BaseModel):
    id: str
    label: str
    value: Optional[float] = None
    change: Optional[float] = None
    trend: Optional[Literal["up", "down"]] = None
    tone: Literal["positive", "negative", "neutral"]
    available: bool = True


class AIHealthScoreSchema(BaseModel):
    score: int
    label: str
    metrics: List[HealthMetricSchema]


@router.get("/health-score", response_model=AIHealthScoreSchema)
async def health_score_endpoint(
    timeframe: Timeframe = Query("week", description="بازه‌ی زمانی: today | week | month | all"),
    auth: AuthenticatedUser = Depends(get_current_user_with_role),
):
   
    try:
        score_data = await asyncio.to_thread(
            get_ai_health_score, auth.user_id, auth.is_admin, timeframe
        )
        return score_data
    except ChatStoreError as exc:
        raise HTTPException(
            status_code=503,
            detail="خطا در برقراری ارتباط با دیتابیس برای دریافت امتیاز سلامت.",
        ) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
