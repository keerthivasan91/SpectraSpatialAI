from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class PredictionResponse(BaseModel):
    prediction_id: int
    label: str
    p_real: float
    confidence: float
    gradcam_original: str
    gradcam_heatmap: str

    class Config:
        from_attributes = True


class FeedbackRequest(BaseModel):
    prediction_id: int
    correct_label: str


class FeedbackResponse(BaseModel):
    message: str
    prediction_id: int


class FeedbackSample(BaseModel):
    id: int
    filename: str
    label: str
    correct_label: Optional[str]
    confidence: float
    created_at: datetime

    class Config:
        from_attributes = True


# Admin review schemas
class ReviewSample(BaseModel):
    id: int
    filename: str
    label: str                   # model's wrong prediction
    correct_label: Optional[str] # user's correction
    confidence: float
    admin_approved: Optional[bool]
    image_b64: Optional[str]     # base64 of the actual image file
    gradcam_b64: Optional[str]   # base64 of GradCAM heatmap (regenerated on demand)
    created_at: datetime

    class Config:
        from_attributes = True


class ReviewDecision(BaseModel):
    approved: bool   # True = approve for retrain, False = reject


class RetrainStatusResponse(BaseModel):
    job_id: int = Field(alias="id")
    status: str
    num_samples: int
    accuracy_before: Optional[float] = None
    accuracy_after: Optional[float] = None
    log: Optional[str] = None
    started_at: Optional[datetime] = None
    finished_at: Optional[datetime] = None

    class Config:
        from_attributes = True
        populate_by_name = True
