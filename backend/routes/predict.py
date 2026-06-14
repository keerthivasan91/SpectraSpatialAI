import os
import uuid
import aiofiles
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from sqlalchemy.orm import Session
from PIL import Image
import io

from database import get_db, Prediction
from schemas import PredictionResponse
from model import predict
from gradcam import generate_gradcam
from config import settings

router = APIRouter(prefix="/predict", tags=["Prediction"])


@router.post("", response_model=PredictionResponse)
async def predict_image(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    if not file.content_type.startswith("image/"):
        raise HTTPException(400, "Only image files are accepted.")

    contents = await file.read()
    image = Image.open(io.BytesIO(contents)).convert("RGB")

    # Fix #3: always ensure upload dir exists before writing
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    filename = f"{uuid.uuid4().hex}_{file.filename}"
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
