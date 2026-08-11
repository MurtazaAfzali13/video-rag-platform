import asyncio
import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.users_store import UsersStoreError, get_users_overview
from app.auth import get_current_user_with_role, AuthenticatedUser

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["Users"])


class UserOverview(BaseModel):
    user_id: str
    chats_count: int
    videos_count: int
    questions_count: int
    last_active: Optional[str] = None


class UsersOverviewResponse(BaseModel):
  
    is_admin: bool
    users: list[UserOverview]


@router.get("/users", response_model=UsersOverviewResponse)
async def list_users(
    auth: AuthenticatedUser = Depends(get_current_user_with_role),
) -> UsersOverviewResponse:
 
    try:
        target_user_id = None if auth.is_admin else auth.user_id
        rows = await asyncio.to_thread(get_users_overview, user_id=target_user_id)
        return UsersOverviewResponse(
            is_admin=auth.is_admin,
            users=[UserOverview(**row) for row in rows],
        )
    except UsersStoreError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
