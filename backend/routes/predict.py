import os
import uuid
import aiofiles
from pathlib import Path
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from PIL import Image
import io

from database import get_db, Prediction
from schemas import PredictionResponse
from model import predict
from gradcam import generate_gradcam
from config import settings
from main import limiter

router = APIRouter(prefix="/predict", tags=["Prediction"])

MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB
ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}


@router.post("", response_model=PredictionResponse)
@limiter.limit("10/minute")   # max 10 predictions per IP per minute
async def predict_image(
    request: Request,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    # 1. Strict content-type check (not just startswith)
    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(400, "Only JPEG, PNG, WEBP, or GIF images are accepted.")

    contents = await file.read()

    # 2. File size cap — reject before doing any processing
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(413, "File too large. Maximum allowed size is 5MB.")

    # 3. Actually validate it opens as an image (catches disguised files)
    try:
        image = Image.open(io.BytesIO(contents)).convert("RGB")
    except Exception:
        raise HTTPException(400, "Could not read the uploaded file as an image.")

    # 4. Sanitise filename — strip any directory traversal components
    safe_name = Path(file.filename).name if file.filename else "upload"
    filename = f"{uuid.uuid4().hex}_{safe_name}"

    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    filepath = os.path.join(settings.UPLOAD_DIR, filename)
    async with aiofiles.open(filepath, "wb") as f:
        await f.write(contents)

    label, p_real, confidence = predict(image)
    original_b64, heatmap_b64 = generate_gradcam(image, label)

    record = Prediction(
        filename=filename,
        filepath=filepath,
        label=label,
        confidence=confidence,
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    return PredictionResponse(
        prediction_id=record.id,
        label=label,
        p_real=p_real,
        confidence=confidence,
        gradcam_original=original_b64,
        gradcam_heatmap=heatmap_b64,
    )