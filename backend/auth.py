from typing import Optional
from fastapi import Header, HTTPException
from config import settings


def require_admin(x_admin_token: Optional[str] = Header(None)):
    """
    Dependency — all /retrain endpoints require the header:
        X-Admin-Token: <ADMIN_TOKEN from .env>

    Using Optional + Header(None) so FastAPI returns 403 (not 422)
    when the header is absent entirely.
    """
    if not x_admin_token or x_admin_token != settings.ADMIN_TOKEN:
        raise HTTPException(status_code=403, detail="Admin access required.")
