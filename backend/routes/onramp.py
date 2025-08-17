from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional
import httpx
import json
import logging

from config import settings

router = APIRouter()

class OnrampSessionRequest(BaseModel):
    address: str
    chain: str = Field(default="base")
    asset: str = Field(default="USDC")
    amountUsd: Optional[float] = None
    fiatCurrency: str = Field(default="USD")


@router.get("/health")
async def health():
    return {"ok": True}


@router.post("/onramp/session")
async def create_onramp_session(payload: OnrampSessionRequest):
    # Basic validation aligned with server.js
    if not payload.address:
        raise HTTPException(status_code=400, detail={"error": "address required"})
    if payload.amountUsd is None or float(payload.amountUsd) <= 0:
        raise HTTPException(status_code=400, detail={"error": "amountUsd > 0 required"})

    # Try preferred JWT/token flow first if KEY_NAME/KEY_SECRET provided and not forcing legacy
    if (settings.KEY_NAME and settings.KEY_SECRET) and not settings.FORCE_LEGACY:
        try:
            session_token = await _create_session_token_via_jwt(
                address=payload.address, chain=payload.chain, asset=payload.asset
            )
            if session_token:
                return {"sessionToken": session_token}
        except Exception as e:
            logging.exception("JWT/token flow failed, will attempt legacy fallback: %s", e)
            # fallthrough to legacy

    # Legacy fallback via project/app based session creation
    if not settings.CDP_API_KEY or not settings.CDP_PROJECT_ID:
        raise HTTPException(
            status_code=500,
            detail={
                "error": "server_config_error",
                "detail": "Missing KEY_NAME/KEY_SECRET or legacy CDP_API_KEY/CDP_PROJECT_ID",
            },
        )

    body = {
        "projectId": settings.CDP_PROJECT_ID,
        "addresses": {payload.address: [payload.chain]},
        "assets": [payload.asset],
        "presetFiatAmount": float(payload.amountUsd),
        "fiatCurrency": payload.fiatCurrency,
        "redirectUrl": settings.ONRAMP_REDIRECT_URL,
    }

    async with httpx.AsyncClient(timeout=20.0) as client:
        resp = await client.post(
            f"{settings.ONRAMP_API_BASE}/sessions",
            headers={
                "Authorization": f"Bearer {settings.CDP_API_KEY}",
                "Content-Type": "application/json",
            },
            content=json.dumps(body),
        )

    text = resp.text
    try:
        data = resp.json()
    except Exception:
        data = {"raw": text}

    if resp.status_code < 200 or resp.status_code >= 300:
        logging.error("Coinbase session error %s %s", resp.status_code, data)
        raise HTTPException(
            status_code=502,
            detail={
                "error": "coinbase_session_error",
                "status": resp.status_code,
                "detail": data,
            },
        )

    legacy_session_token = data.get("sessionToken") or data.get("token")
    if not legacy_session_token:
        raise HTTPException(
            status_code=502,
            detail={"error": "missing_session_token", "detail": data},
        )

    return {"sessionToken": legacy_session_token}


async def _create_session_token_via_jwt(address: str, chain: str, asset: str) -> Optional[str]:
    """
    Attempt to reproduce @coinbase/cdp-sdk generateJwt + POST /onramp/v1/token.
    This implementation intentionally avoids assuming exact JWT schema; if the request fails,
    the caller will fall back to the legacy flow. Adjust signing as needed if Coinbase changes.
    """
    try:
        # Lazy import to avoid hard dependency if only legacy is used
        import jwt  # PyJWT
        import time

        api_key_id = settings.KEY_NAME
        api_key_secret = settings.KEY_SECRET
        if not api_key_id or not api_key_secret:
            return None

        now = int(time.time())
        # Construct a best-effort JWT per Coinbase Developer Platform conventions.
        # Note: You may need to adjust claims per your API key setup. The Node SDK uses
        # method/host/path in the signature context. Here we include similar claims.
        payload = {
            "iss": api_key_id,
            "nbf": now,
            "iat": now,
            "exp": now + 120,
            "method": "POST",
            "path": "/onramp/v1/token",
            "host": "api.developer.coinbase.com",
        }
        token = jwt.encode(payload, api_key_secret, algorithm="HS256")

        body = {
            "addresses": [{"address": address, "blockchains": [chain]}],
            "assets": [asset],
        }

        async with httpx.AsyncClient(timeout=20.0) as client:
            resp = await client.post(
                "https://api.developer.coinbase.com/onramp/v1/token",
                headers={
                    "Authorization": f"Bearer {token}",
                    "Content-Type": "application/json",
                },
                content=json.dumps(body),
            )

        text = resp.text
        try:
            data = resp.json()
        except Exception:
            data = {"raw": text}

        if resp.status_code < 200 or resp.status_code >= 300:
            logging.error("Coinbase token error %s %s", resp.status_code, data)
            return None

        session_token = data.get("token") or data.get("sessionToken")
        return session_token
    except Exception:
        # Any error here is non-fatal; caller will attempt legacy
        logging.exception("Error during JWT token creation")
        return None
