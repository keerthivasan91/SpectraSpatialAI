import asyncio
import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from database import init_db
from routes.predict import router as predict_router
from routes.feedback import router as feedback_router
from routes.retrain import router as retrain_router
from routes.review import router as review_router

logging.getLogger("asyncio").setLevel(logging.CRITICAL)


@asynccontextmanager
async def lifespan(app: FastAPI):
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    os.makedirs(settings.FEEDBACK_DIR, exist_ok=True)
    os.makedirs(os.path.dirname(settings.MODEL_PATH) or ".", exist_ok=True)
    init_db()
    # Apply any pending column migrations (safe to run on every boot)
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

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(predict_router)
app.include_router(feedback_router)
app.include_router(review_router)
app.include_router(retrain_router)


@app.get("/health")
def health():
    return {"status": "ok", "service": "SpectraSpatial AI", "version": "2.1.0"}
