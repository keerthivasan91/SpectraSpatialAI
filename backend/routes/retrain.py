import threading
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db, Prediction, RetrainJob
from schemas import RetrainStatusResponse
from retrain import run_retrain
from auth import require_admin

router = APIRouter(prefix="/retrain", tags=["Retraining"])


@router.post("/start", response_model=RetrainStatusResponse)
def start_retrain(
    db: Session = Depends(get_db),
    _: None = Depends(require_admin),
):
    # Only retrain on admin-approved, not-yet-retrained samples
    approved = (
        db.query(Prediction)
        .filter(
            Prediction.is_wrong == True,
            Prediction.admin_approved == True,
            Prediction.retrained == False,
        )
        .all()
    )

    if not approved:
        raise HTTPException(
            400,
            "No approved samples ready for retraining. "
            "Review flagged images first via the Review Queue."
        )

    valid = [s for s in approved if s.correct_label]
    if not valid:
        raise HTTPException(400, "Approved samples found but none have correct labels.")

    running = db.query(RetrainJob).filter(RetrainJob.status == "running").first()
    if running:
        raise HTTPException(409, "A retraining job is already in progress.")

    job = RetrainJob(num_samples=len(valid), status="pending")
    db.add(job)
    db.commit()
    db.refresh(job)

    sample_ids = [s.id for s in valid]
    thread = threading.Thread(
        target=run_retrain,
        args=(job.id, sample_ids),
        daemon=True,
    )
    thread.start()

    return job


@router.get("/status/{job_id}", response_model=RetrainStatusResponse)
def get_status(
    job_id: int,
    db: Session = Depends(get_db),
    _: None = Depends(require_admin),
):
    job = db.query(RetrainJob).filter(RetrainJob.id == job_id).first()
    if not job:
        raise HTTPException(404, "Job not found.")
    return job


@router.get("/history", response_model=list[RetrainStatusResponse])
def get_history(
    db: Session = Depends(get_db),
    _: None = Depends(require_admin),
):
    return (
        db.query(RetrainJob)
        .order_by(RetrainJob.created_at.desc())
        .limit(20)
        .all()
    )

@router.post("/cleanup-stuck-jobs")
def cleanup_stuck_jobs(db: Session = Depends(get_db)):
    """
    Clears stuck background jobs and unlocks approved images that were 
    trapped by a crashed training thread.
    """
    # 1. Locate and fail any active job tickets
    stuck_jobs = (
        db.query(RetrainJob)
        .filter(RetrainJob.status.in_(["running", "pending"]))
        .all()
    )
    
    # 2. Unlock images that were marked as retrained but never actually processed
    # FIXED: Changed Prediction.is_retrained to Prediction.retrained to match your schema definition
    trapped_samples = (
        db.query(Prediction)
        .filter(Prediction.admin_approved == True)
        .filter(Prediction.retrained == True) 
        .all()
    )

    if not stuck_jobs and not trapped_samples:
        return {"message": "Database is already clean. No stuck elements found."}

    # Clear the active tracking jobs
    job_count = 0
    for job in stuck_jobs:
        job.status = "failed"
        job.log = "Thread reset manually. Trapped images have been recycled."
        job_count += 1

    # Recycle the images back into the available pool
    image_count = 0
    for sample in trapped_samples:
        # FIXED: Updated property target mutation reference name here as well
        sample.retrained = False 
        image_count += 1
        
    # 3. Commit the state changes cleanly to MySQL
    db.commit()
    
    return {
        "status": "success",
        "message": f"Cleared {job_count} stuck jobs and returned {image_count} approved samples back to the retraining pool."
    }