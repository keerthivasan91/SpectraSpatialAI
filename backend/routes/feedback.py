import os
import shutil
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db, Prediction
from schemas import FeedbackRequest, FeedbackResponse, FeedbackSample
from config import settings
from typing import List

router = APIRouter(prefix="/feedback", tags=["Feedback"])


@router.post("", response_model=FeedbackResponse)
def submit_feedback(body: FeedbackRequest, db: Session = Depends(get_db)):
    record = db.query(Prediction).filter(Prediction.id == body.prediction_id).first()
    if not record:
        raise HTTPException(404, "Prediction not found.")
    if body.correct_label not in ["AI-Generated", "Real"]:
        raise HTTPException(400, "correct_label must be 'AI-Generated' or 'Real'.")

    os.makedirs(settings.FEEDBACK_DIR, exist_ok=True)
    dest = os.path.join(settings.FEEDBACK_DIR, record.filename)
    if os.path.exists(record.filepath) and not os.path.exists(dest):
        shutil.copy(record.filepath, dest)

    record.is_wrong = True
    record.correct_label = body.correct_label
    db.commit()

    return FeedbackResponse(
        message="Feedback recorded. Image added to retraining pool.",
        prediction_id=record.id,
    )


@router.get("/samples", response_model=List[FeedbackSample])
def get_feedback_samples(db: Session = Depends(get_db)):
    """
    Returns only samples not yet used in a retrain job — the new-only pool.
    """
    samples = (
        db.query(Prediction)
        .filter(Prediction.is_wrong == True, Prediction.retrained == False)
        .order_by(Prediction.created_at.desc())
        .all()
    )
    return samples
