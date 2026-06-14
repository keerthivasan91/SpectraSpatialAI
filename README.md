# SpectraSpatial AI

AI vs Real image detector — dual-stream spatial + FFT analysis with GradCAM visualisation and manual retraining.

---

## Local Setup

### 1. Clone & place your model

```bash
git clone <your-repo>
cd SpectraSpatialAI

# Place your trained model
cp /path/to/fake_detector_v2.pt backend/weights/model.pt
```

### 2. Create environment file

```bash
cp .env.example .env
# Edit .env and set your MySQL password
```

### 3. Start MySQL (Docker)

```bash
docker compose up mysql -d
```

### 4. Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Copy .env into backend dir
cp ../.env .env

uvicorn main:app --reload --port 8000
```

Docs available at: http://localhost:8000/docs

### 5. Frontend

```bash
cd frontend
npm install
npm run dev
```

App runs at: http://localhost:5173

---

## Project Structure

```
SpectraSpatialAI/
├── backend/
│   ├── main.py          # FastAPI app + lifespan
│   ├── model.py         # FFTLayer + SpectraSpatialModel + inference
│   ├── gradcam.py       # GradCAM generation → base64
│   ├── retrain.py       # Fine-tune last 2 blocks
│   ├── database.py      # MySQL models (Prediction, RetrainJob)
│   ├── schemas.py       # Pydantic request/response schemas
│   ├── config.py        # Settings via pydantic-settings
│   ├── routes/
│   │   ├── predict.py   # POST /predict
│   │   ├── feedback.py  # POST /feedback, GET /feedback/samples
│   │   └── retrain.py   # POST /retrain/start, GET /retrain/status/:id
│   ├── weights/         # Put model.pt here
│   ├── uploads/         # Saved uploaded images
│   └── feedback_samples/# Copies of wrong predictions
└── frontend/
    └── src/
        ├── App.jsx
        ├── components/
        │   ├── Navbar.jsx
        │   ├── ImageUpload.jsx    # Drag-and-drop upload
        │   ├── ResultPanel.jsx    # Label + confidence bar
        │   ├── GradCAMView.jsx    # Original / GradCAM / Side-by-side tabs
        │   ├── FeedbackButton.jsx # Mark wrong prediction
        │   └── RetrainPanel.jsx   # Sample pool + trigger + history
        └── utils/api.js
```

---

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/predict` | Upload image → label, confidence, GradCAM base64 |
| POST | `/feedback` | Mark prediction wrong with correct label |
| GET | `/feedback/samples` | List all wrong samples |
| POST | `/retrain/start` | Trigger fine-tuning on feedback pool |
| GET | `/retrain/status/{id}` | Poll job status + logs |
| GET | `/retrain/history` | Last 20 retrain jobs |
| GET | `/health` | Health check |

---

## Retraining Notes

- Fine-tunes **last 2 blocks** of EfficientNetV2 + classifier head
- All other layers frozen during fine-tuning
- Old weights backed up as `model_backup_{job_id}.pt` before overwriting
- Runs in a background thread — poll `/retrain/status/{id}` to track progress
- For production: replace the background thread with Celery + Redis
