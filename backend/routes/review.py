import io
import base64
import os
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from PIL import Image

from database import get_db, Prediction
from schemas import ReviewSample, ReviewDecision
from auth import require_admin
from gradcam import generate_gradcam

router = APIRouter(prefix="/retrain/review", tags=["Admin Review"])


def _image_to_b64(filepath: str) -> Optional[str]:
    if not filepath or not os.path.exists(filepath):
        return None
    try:
        with open(filepath, "rb") as f:
            return base64.b64encode(f.read()).decode("utf-8")
    except Exception:
        return None


def _gradcam_b64(filepath: str, label: str) -> Optional[str]:
    """Re-generate GradCAM heatmap for admin review."""
    if not filepath or not os.path.exists(filepath):
        return None
    try:
        img = Image.open(filepath).convert("RGB")
        _, heatmap_b64 = generate_gradcam(img, label)
        return heatmap_b64
    except Exception:
        return None


@router.get("", response_model=List[ReviewSample])
def get_review_queue(
    db: Session = Depends(get_db),
    _: None = Depends(require_admin),
):
    """
    All flagged samples awaiting admin review (admin_approved IS NULL).
    Returns image + GradCAM as base64 for in-browser inspection.
    """
    samples = (
        db.query(Prediction)
        .filter(
            Prediction.is_wrong == True,
            Prediction.admin_approved == None,
            Prediction.retrained == False,
        )
        .order_by(Prediction.created_at.desc())
        .all()
    )

    return [
        ReviewSample(
            id=s.id,
            filename=s.filename,
            label=s.label,
            correct_label=s.correct_label,
            confidence=s.confidence,
            admin_approved=s.admin_approved,
            image_b64=_image_to_b64(s.filepath),
            gradcam_b64=_gradcam_b64(s.filepath, s.label),
            created_at=s.created_at,
        )
        for s in samples
    ]


@router.patch("/{prediction_id}")
def review_sample(
    prediction_id: int,
    body: ReviewDecision,
    db: Session = Depends(get_db),
    _: None = Depends(require_admin),
):
    """Approve or reject a flagged sample."""
    record = db.query(Prediction).filter(Prediction.id == prediction_id).first()
    if not record:
        raise HTTPException(404, "Prediction not found.")
    if not record.is_wrong:
        raise HTTPException(400, "This prediction was not flagged.")
    if record.retrained:
        raise HTTPException(400, "Already used in a retrain job.")

    record.admin_approved = body.approved
    db.commit()

    action = "approved for retraining" if body.approved else "rejected"
    return {"message": f"Sample {prediction_id} {action}.", "approved": body.approved}


@router.get("/counts")
def review_counts(
    db: Session = Depends(get_db),
    _: None = Depends(require_admin),
):
    """Dashboard counts for admin panel."""
    pending  = db.query(Prediction).filter(Prediction.is_wrong == True,  Prediction.admin_approved == None,  Prediction.retrained == False).count()
    approved = db.query(Prediction).filter(Prediction.is_wrong == True,  Prediction.admin_approved == True,  Prediction.retrained == False).count()
    rejected = db.query(Prediction).filter(Prediction.is_wrong == True,  Prediction.admin_approved == False).count()
    used     = db.query(Prediction).filter(Prediction.retrained == True).count()
    return {"pending_review": pending, "approved": approved, "rejected": rejected, "used_in_retrain": used}
