# app/routers/dashboard.py
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import List
import datetime
# فرض بر این است که شما تابعی برای اجرای کوئری در دیتابیس دارید
# from app.db import execute_query 

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])

class ChartDataPoint(BaseModel):
    label: str
    value: int

@router.get("/questions-overview", response_model=List[ChartDataPoint])
async def get_questions_overview(
    user_id: str = Query(..., min_length=1),
    time_range: str = Query("week", pattern="^(week|month|quarter)$")
):
 
    
    """
    نمونه کوئری SQL که باید در دیتابیس شما اجرا شود (با توجه به ساختار دیتابیس):
    
    SELECT 
        DATE(messages.created_at) as label, 
        COUNT(messages.id) as value
    FROM messages
    JOIN chats ON messages.chat_id = chats.id
    WHERE chats.user_id = :user_id 
      AND messages.role = 'user'
      AND messages.created_at >= :start_date
    GROUP BY DATE(messages.created_at)
    ORDER BY DATE(messages.created_at) ASC;
    """
    
    # داده‌های فیک برای تست تا زمانی که اتصال دیتابیس را تکمیل کنید:
    mock_data = [
        {"label": "Dec 21", "value": 2100},
        {"label": "Dec 22", "value": 2800},
        {"label": "Dec 23", "value": 2300},
        {"label": "Dec 24", "value": 3900},
        {"label": "Dec 25", "value": 3100},
        {"label": "Dec 26", "value": 3500},
        {"label": "Dec 27", "value": 4300},
    ]
    return mock_data