import asyncio
import threading
from datetime import datetime, timezone
from typing import Any, List, Literal, Optional

from cachetools import TTLCache
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from app.monitoring_store import get_response_time_metrics, get_ai_health_score
from app.system_status_store import ALL_CHECKS, ServiceCheckResult
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


_SYSTEM_STATUS_CACHE_TTL_SECONDS = 30
_system_status_cache: TTLCache = TTLCache(maxsize=1, ttl=_SYSTEM_STATUS_CACHE_TTL_SECONDS)
_system_status_lock = threading.Lock()
_SYSTEM_STATUS_CACHE_KEY = "system-status"


class ServiceStatusSchema(BaseModel):
    id: str
    name: str
    status: Literal["healthy", "warning", "offline"]
    latency_ms: Optional[int] = None
    detail: Optional[str] = None


class SystemStatusResponse(BaseModel):
    services: List[ServiceStatusSchema]
    checked_at: str
    cached: bool


async def _run_all_checks() -> list[ServiceCheckResult]:
    return await asyncio.gather(*(asyncio.to_thread(check) for check in ALL_CHECKS))

@router.get("/system-status", response_model=SystemStatusResponse)
async def system_status_endpoint(
    auth: AuthenticatedUser = Depends(get_current_user_with_role),
):
    with _system_status_lock:
        # نوع‌دهی صریح به کش برای رفع خطای Mypy
        cached: dict[str, Any] | None = _system_status_cache.get(_SYSTEM_STATUS_CACHE_KEY)
        
    if cached is not None:
        # پاس دادن متغیرها به صورت صریح
        return SystemStatusResponse(
            services=cached["services"],
            checked_at=cached["checked_at"],
            cached=True
        )

    results = await _run_all_checks()
    checked_at_str = datetime.now(timezone.utc).isoformat()
    
    services_list = [
        ServiceStatusSchema(
            id=r.id,
            name=r.name,
            status=r.status,
            latency_ms=r.latency_ms,
            detail=r.detail,
        )
        for r in results
    ]

    cache_payload: dict[str, Any] = {
        "services": [
            {
                "id": r.id,
                "name": r.name,
                "status": r.status,
                "latency_ms": r.latency_ms,
                "detail": r.detail,
            }
            for r in results
        ],
        "checked_at": checked_at_str,
    }

    with _system_status_lock:
        _system_status_cache[_SYSTEM_STATUS_CACHE_KEY] = cache_payload

    # ۳. برگرداندن شیء صریح بدون استفاده از **
    return SystemStatusResponse(
        services=services_list,
        checked_at=checked_at_str,
        cached=False
    )