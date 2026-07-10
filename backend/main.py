import asyncio
import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from config import settings
from database import init_db
from routes.predict import router as predict_router
from routes.feedback import router as feedback_router
from routes.retrain import router as retrain_router
from routes.review import router as review_router

logging.getLogger("asyncio").setLevel(logging.CRITICAL)

# Rate limiter — keyed by client IP
limiter = Limiter(key_func=get_remote_address)


@asynccontextmanager
async def lifespan(app: FastAPI):
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    os.makedirs(settings.FEEDBACK_DIR, exist_ok=True)
    os.makedirs(os.path.dirname(settings.MODEL_PATH) or ".", exist_ok=True)
    init_db()
    from migrate import run as run_migrations
    run_migrations()
    from model import get_model
    get_model()
    yield


app = FastAPI(
    title="SpectraSpatial AI",
    description="AI vs Real Image Detector — GradCAM + Admin Review + Retraining",
    version="2.1.0",
    lifespan=lifespan,
)

# Attach rate limiter to app
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH"],   # only what the app actually uses
    allow_headers=["Content-Type", "X-Admin-Token"],
)

app.include_router(predict_router)
app.include_router(feedback_router)
app.include_router(review_router)
app.include_router(retrain_router)


@app.get("/health")
def health():
    return {"status": "ok", "service": "SpectraSpatial AI", "version": "2.1.0"}