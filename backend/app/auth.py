"""Clerk JWT authentication: verification, identity + role extraction.

SECURITY MODEL
---------------
- Identity (`user_id`) and authorization (`role`) are ALWAYS derived from the verified JWT's
  claims (`sub`, `role`) — NEVER from anything the client sends in a request body, query
  string, or URL path. This is the single source of truth for "who is calling this API".
- Tokens are verified against Clerk's JWKS (JSON Web Key Set) using RS256 asymmetric
  signatures. The server never has (or needs) a shared secret that could leak; it only
  needs Clerk's public keys, fetched from `{issuer}/.well-known/jwks.json`.
- The signing algorithm is pinned explicitly to RS256 (`algorithms=["RS256"]`) to prevent
  "alg confusion" attacks, where an attacker crafts a token signed with a weaker/symmetric
  algorithm (e.g. HS256 using the *public* key as an HMAC secret) or with `alg: none`, and
  a naive verifier that doesn't pin the algorithm ends up accepting it as valid.
- The `iss` (issuer) claim is verified against our configured Clerk issuer URL, so a validly
  signed token from a *different* Clerk instance/tenant cannot be replayed against this API.
"""

from __future__ import annotations

import logging
import os
from functools import lru_cache

import jwt
from jwt import PyJWKClient, PyJWKClientError
from fastapi import HTTPException, Security, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel

from app.config import get_settings

logger = logging.getLogger(__name__)


security = HTTPBearer(auto_error=True)


class AuthenticatedUser(BaseModel):
    """Everything downstream code needs to know about the caller, taken from the verified JWT."""

    user_id: str
    role: str = "user"

    @property
    def is_admin(self) -> bool:
        return self.role == "admin"


_ISSUER_URL_SETTINGS_ATTRS = (
    "clerk_issuer_url",
    "clerk_frontend_api",
    "clerk_frontend_api_url",
    "clerk_issuer",
)
_ISSUER_URL_ENV_VARS = (
    "CLERK_ISSUER_URL",
    "CLERK_FRONTEND_API",
    "CLERK_FRONTEND_API_URL",
)


def _resolve_clerk_issuer_url() -> str:
    """Find the Clerk issuer URL from settings or environment, or fail with a clear message.

    Previously this was a hard `settings.clerk_issuer_url` attribute access, which raised a
    raw, confusing `AttributeError` at request time if the field wasn't defined on `Settings`
    (exactly what happened: `'Settings' object has no attribute 'clerk_issuer_url'`). This
    tries a few common naming conventions and, if truly nothing is configured, raises a
    single clear error telling you exactly what to set — instead of an opaque crash deep
    inside a dependency on every single request.
    """
    settings = get_settings()

    for attr in _ISSUER_URL_SETTINGS_ATTRS:
        value = getattr(settings, attr, None)
        if value:
            return value

    for env_var in _ISSUER_URL_ENV_VARS:
        value = os.environ.get(env_var)
        if value:
            return value

    raise RuntimeError(
        "Clerk issuer URL تنظیم نشده است. لطفاً یکی از این‌ها را در `Settings` (config.py) یا "
        "در فایل .env تعریف کنید: "
        f"attribute های ممکن در Settings: {_ISSUER_URL_SETTINGS_ATTRS} — یا "
        f"env varهای ممکن: {_ISSUER_URL_ENV_VARS}. "
        "مقدار باید چیزی شبیه 'https://your-app-name.clerk.accounts.dev' باشد "
        "(از Clerk Dashboard → API Keys → Frontend API قابل مشاهده است)."
    )


@lru_cache(maxsize=1)
def get_jwks_client() -> PyJWKClient:
    """Return a process-wide singleton PyJWKClient.

    IMPORTANT FIX: the previous implementation constructed a brand-new `PyJWKClient` on
    *every single request*. `PyJWKClient` has a built-in JWKS cache (`cache_jwk_set`), but
    that cache is only useful if the SAME client instance is reused across requests — a
    fresh instance means a fresh (empty) cache, so every request was silently doing a live
    network round-trip to Clerk's `/.well-known/jwks.json` just to authenticate one call.
    That's unnecessary latency on the hot path, and it makes every request in this API
    fail-dependent on Clerk's JWKS endpoint being reachable at that exact moment.
    Caching the client here means the JWKS is fetched once and reused for `lifespan`
    seconds (see below), with per-key caching enabled as a second layer of caching.
    """
    issuer_url = _resolve_clerk_issuer_url()
    jwks_url = f"{issuer_url}/.well-known/jwks.json"
    return PyJWKClient(
        jwks_url,
        cache_keys=True,    
        cache_jwk_set=True,  
        lifespan=3600,        
    )


def _decode_and_verify(token: str) -> dict:
    """Verify a Clerk-issued JWT's signature, issuer, and expiry, and return its claims.

    This is the ONLY place token verification happens — both `get_current_user` and
    `get_current_user_with_role` call into this, so there is exactly one code path to audit
    and no risk of the two dependencies drifting out of sync on security-relevant checks.
    """
    issuer_url = _resolve_clerk_issuer_url()

    try:
        jwks_client = get_jwks_client()
        signing_key = jwks_client.get_signing_key_from_jwt(token)
    except PyJWKClientError as exc:
     
        logger.warning("JWKS key resolution failed: %s", exc)
        raise HTTPException(status_code=401, detail="امکان تایید هویت وجود ندارد. لطفاً دوباره تلاش کنید.") from exc
    except RuntimeError:
        raise
    except Exception as exc: 
        logger.exception("Unexpected error while resolving JWKS signing key")
        raise HTTPException(status_code=401, detail="خطای غیرمنتظره در احراز هویت.") from exc

    try:
        payload = jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256"],
            issuer=issuer_url,
            leeway=10,
        )
    except jwt.ExpiredSignatureError as exc:
        raise HTTPException(status_code=401, detail="نشست شما منقضی شده است. لطفاً دوباره وارد شوید.") from exc
    except jwt.InvalidIssuerError as exc:
        logger.warning("Token with invalid issuer presented")
        raise HTTPException(status_code=401, detail="توکن نامعتبر است.") from exc
    except jwt.InvalidTokenError as exc:
        # Catches: bad signature, invalid claims format, malformed token structure, etc.
        logger.warning("Invalid token presented: %s", exc)
        raise HTTPException(status_code=401, detail="توکن نامعتبر است.") from exc

    return payload


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Security(security),
) -> str:
    """Return ONLY the verified user id (`sub` claim).

    Kept as its own dependency (rather than always returning the richer `AuthenticatedUser`)
    so existing routers that only need identity (e.g. dashboard endpoints) aren't forced to
    change their signature. Both this and `get_current_user_with_role` share the exact same
    verification logic via `_decode_and_verify` — there is no separate, weaker code path.
    """
    payload = _decode_and_verify(credentials.credentials)

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="ساختار توکن نامعتبر است.")

    return user_id


async def get_current_user_with_role(
    credentials: HTTPAuthorizationCredentials = Security(security),
) -> AuthenticatedUser:
    """Return the verified user id AND role, for endpoints that need RBAC/quota decisions.

    `role` is read directly from the verified JWT's `role` claim (populated in Clerk via a
    custom JWT template mapping `{{user.public_metadata.role}}` -> `role`). If the claim is
    absent, the caller is treated as the default "user" tier — this fails closed (nobody
    silently becomes admin by omission) rather than failing open.
    """
    payload = _decode_and_verify(credentials.credentials)

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="ساختار توکن نامعتبر است.")

    role = payload.get("role") or "user"
    if not isinstance(role, str):
        role = "user"

    return AuthenticatedUser(user_id=user_id, role=role)
