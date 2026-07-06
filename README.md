<div align="center">
  <img src="frontend/src/SpectraSpatial.svg" alt="SpectraSpatial AI Logo" width="480">
  <br />
  <p><strong>Dual-stream spatial + FFT analysis with GradCAM visualization and human-in-the-loop manual retraining.</strong></p>

  [![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com)
  [![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org)
  [![PyTorch](https://img.shields.io/badge/PyTorch-EE4C2C?style=for-the-badge&logo=pytorch&logoColor=white)](https://pytorch.org)
  [![MySQL](https://img.shields.io/badge/MySQL-00000F?style=for-the-badge&logo=mysql&logoColor=white)](https://www.mysql.com)
</div>

---

## Local Setup

### 1. Clone the repository & download the model weights

Clone the repository and create the directory where the model checkpoints will reside:

```bash
git clone https://github.com/keerthivasan91/SpectraSpatialAI
cd SpectraSpatialAI

# Create the target weights directory
mkdir -p backend/weights
```

To maintain clean repository hygiene, the heavy binary model weights are decoupled from the Git tree. You can download the pre-trained model weights (`model.pt`) using one of the two options below:

#### Option A: Automatic CLI Download (Recommended)
You can pull the weights directly into the correct directory from the terminal using `gdown`:
```bash
pip install gdown
gdown 1MX4wDIWr51gnE4VEuJiEjGVhNHKbzaf3 -O backend/weights/model.pt
```

#### Option B: Manual Browser Download
If you prefer manual placement, download the model weights file from the public link below and place it inside `backend/weights/` named exactly as `model.pt`:
👉 [Download Pre-trained Model Weights via Google Drive](https://drive.google.com/file/d/1MX4wDIWr51gnE4VEuJiEjGVhNHKbzaf3/view?usp=sharing)

---

### 2. Create environment file

Copy the provided environment example template to configure your local runtime settings:

```bash
cp .env.example .env
# Open and edit .env to set your custom MySQL root password
```

---

### 3. Start MySQL (Docker)

Spin up the isolated database service container in detached mode:

```bash
docker compose up mysql -d
```

---

### 4. Backend Setup

Navigate into the backend service directory, configure your virtual environment, install the dependencies, and start the FastAPI application server:

```bash
cd backend
python -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Copy the base .env file into the backend directory
cp ../.env .env

# Run the FastAPI server
uvicorn main:app --reload --port 8000
```

* **Interactive API Documentation:** Available at [http://localhost:8000/docs](http://localhost:8000/docs)

---

### 5. Frontend Setup

Open a new terminal window, navigate into the frontend directory, install the node modules, and boot up the Vite development server:

```bash
cd frontend
npm install
npm run dev
```

* **Local Client Application UI:** Active at [http://localhost:5173](http://localhost:5173)

---

## Project Structure

```
SpectraSpatialAI/
├── backend/
│   ├── main.py          # FastAPI app initiation + lifespan database setup
│   ├── model.py         # FFTLayer + SpectraSpatialModel architectures + inference hooks
│   ├── gradcam.py       # GradCAM attention map matrix generation → base64 image strings
│   ├── retrain.py       # Fine-tunes target classifier weight layers
│   ├── database.py      # MySQL data schemas (Prediction, RetrainJob tables)
│   ├── schemas.py       # Pydantic request / response serialization blocks
│   ├── config.py        # Environment app settings via pydantic-settings
│   ├── routes/
│   │   ├── predict.py   # POST /predict execution logic
│   │   ├── feedback.py  # POST /feedback, GET /feedback/samples data operations
│   │   └── retrain.py   # POST /retrain/start, GET /retrain/status/:id controls
│   ├── weights/         # Staging directory for model.pt
│   ├── uploads/         # Active storage for evaluated images
│   └── feedback_samples/# Local repository copies of misclassified predictions
└── frontend/
    └── src/
        ├── App.jsx
        ├── components/
        │   ├── Navbar.jsx
        │   ├── ImageUpload.jsx    # Drag-and-drop workspace panel
        │   ├── ResultPanel.jsx    # Real/Fake label output + dynamic gauge tracking
        │   ├── GradCAMView.jsx    # Structural tabs supporting side-by-side view comparison
        │   ├── FeedbackButton.jsx # Explicit user flagging for misclassifications
        │   └── RetrainPanel.jsx   # Administrative pool controls + historical logs
        └── utils/api.js
```

---

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| **POST** | `/predict` | Evaluates an uploaded image buffer, outputting classification arrays, confidence scores, and base64 GradCAM imagery. |
| **POST** | `/feedback` | Flags a prediction record as incorrect and overrides it with a confirmed ground-truth target label. |
| **GET** | `/feedback/samples` | Collects all active human-flagged dataset samples for review. |
| **POST** | `/retrain/start` | Initiates fine-tuning routines asynchronously using the flagged feedback image dataset. |
| **GET** | `/retrain/status/{id}` | Polls ongoing background thread execution records and model logs. |
| **GET** | `/retrain/history` | Fetches the recent execution data and metric histories for the last 20 retraining cycles. |
| **GET** | `/health` | Returns server responsiveness and database connection statuses. |

---

## Retraining Notes

* **Layer Isolation:** The fine-tuning sequence targets only the final 2 block structural groupings of the EfficientNetV2 backbone alongside the downstream classifier layers. All preceding feature extraction layers remain frozen to preserve foundational weights.
* **Fail-safe Backups:** Prior to overwriting active system paths, the current network configuration is copied and saved as `model_backup_{job_id}.pt` to prevent data loss or model corruption.
* **Asynchronous Multi-threading:** Retraining runs isolated inside a background execution thread to keep the primary FastAPI server responsive. Job progressions can be followed by tracking status keys via `/retrain/status/{id}`.
* **Production Scaling Suggestion:** For production-grade architectures scaling out beyond single instances, replace the native local backend threads with a distributed task worker framework like Celery backed by a Redis message broker.

## Screenshots

### Core Inference & GradCAM Visualizations
![SpectraSpatial AI Inference Panel](https://github.com/user-attachments/assets/1e2b5180-3b7b-49c3-b918-479e7ca01724
)
---
![SpectraSpatial Real Inference Panel](https://github.com/user-attachments/assets/805d17f7-9c51-4f79-a1c0-fdf30f700bb4
)
