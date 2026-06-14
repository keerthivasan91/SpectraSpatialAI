import os
import shutil
import torch
import torch.nn as nn
from torch.utils.data import DataLoader, Dataset
from torchvision import transforms
from PIL import Image
from datetime import datetime
from sqlalchemy.orm import Session
from database import SessionLocal, RetrainJob, Prediction
from model import get_model, FakeImageDetector
from config import settings

LABEL_TO_IDX = {"AI-Generated": 0, "Real": 1}


class FeedbackDataset(Dataset):
    def __init__(self, samples: list[dict], transform):
        self.samples = [s for s in samples if os.path.exists(s["filepath"])]
        self.transform = transform

    def __len__(self):
        return len(self.samples)

    def __getitem__(self, idx):
        s = self.samples[idx]
        img = Image.open(s["filepath"]).convert("RGB")
        # Fix #6: scalar float label to match flat (batch_size,) shape expected by BCEWithLogitsLoss
        label = torch.tensor(float(LABEL_TO_IDX[s["correct_label"]]), dtype=torch.float32)
        return self.transform(img), label


def _unfreeze_last_n_blocks(model: FakeImageDetector, n: int = 2):
    for param in model.backbone.parameters():
        param.requires_grad = False

    blocks = list(model.backbone.blocks.children())
    for block in blocks[-n:]:
        for param in block.parameters():
            param.requires_grad = True

    for param in model.backbone.conv_head.parameters():
        param.requires_grad = True
    for param in model.backbone.bn2.parameters():
        param.requires_grad = True

    for param in model.spatial_head.parameters():
        param.requires_grad = True
    for param in model.fft_branch.parameters():
        param.requires_grad = True
    for param in model.fusion.parameters():
        param.requires_grad = True

    trainable = sum(p.numel() for p in model.parameters() if p.requires_grad)
    print(f"Retrain: {trainable:,} trainable params")


# Fix #7: signature takes only job_id + sample_ids — opens its own DB session internally
def run_retrain(job_id: int, sample_ids: list[int]):
    """
    Called in a background thread.
    Opens its own DB session to avoid passing a request-scoped session across threads.
    Uses sample_ids to re-query — ensures only new (retrained=False) rows are used.
    """
    db: Session = SessionLocal()
    try:
        job = db.query(RetrainJob).filter(RetrainJob.id == job_id).first()
        job.status = "running"
        job.started_at = datetime.utcnow()
        db.commit()

        # Re-fetch samples in this thread's session
        rows = (
            db.query(Prediction)
            .filter(Prediction.id.in_(sample_ids))
            .all()
        )
        samples = [
            {"filepath": r.filepath, "correct_label": r.correct_label, "id": r.id}
            for r in rows
            if r.correct_label
        ]

        if not samples:
            raise ValueError("No valid samples found for retraining.")

        model, device = get_model()
        _unfreeze_last_n_blocks(model, n=2)
        model.train()

        transform = transforms.Compose([
            transforms.Resize((settings.IMAGE_SIZE, settings.IMAGE_SIZE)),
            transforms.RandomHorizontalFlip(),
            transforms.ColorJitter(brightness=0.2, contrast=0.2),
            transforms.ToTensor(),
            transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
        ])

        dataset = FeedbackDataset(samples, transform)
        loader = DataLoader(dataset, batch_size=min(8, len(samples)), shuffle=True,drop_last=True)

        criterion = nn.BCEWithLogitsLoss()
        optimizer = torch.optim.Adam([
            {"params": model.backbone.parameters(),     "lr": 1e-5},
            {"params": model.spatial_head.parameters(), "lr": 1e-4},
            {"params": model.fft_branch.parameters(),   "lr": 1e-4},
            {"params": model.fusion.parameters(),       "lr": 1e-4},
        ])

        logs = []
        final_acc = 0.0
        for epoch in range(5):
            total_loss, correct, total = 0.0, 0, 0
            for imgs, labels in loader:
                imgs   = imgs.to(device)
                labels = labels.to(device)          # shape: (B,) float32
                optimizer.zero_grad()
                logits = model(imgs)                # shape: (B,) — squeeze already in model
                loss   = criterion(logits, labels)
                loss.backward()
                nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
                optimizer.step()
                total_loss += loss.item()
                preds   = (torch.sigmoid(logits) > 0.5).float()
                correct += (preds == labels).sum().item()
                total   += labels.size(0)
            final_acc = correct / total * 100
            line = f"Epoch {epoch+1}/5 — loss: {total_loss:.4f} — acc: {final_acc:.1f}%"
            logs.append(line)
            print(line)

        # Backup + save
        backup = settings.MODEL_PATH.replace(".pt", f"_backup_{job_id}.pt")
        shutil.copy(settings.MODEL_PATH, backup)
        model.eval()
        torch.save(model.state_dict(), settings.MODEL_PATH)
        print(f"Saved → {settings.MODEL_PATH}  (backup → {backup})")

        # Mark all used samples as retrained so they won't appear in future pools
        for s in samples:
            row = db.query(Prediction).filter(Prediction.id == s["id"]).first()
            if row:
                row.retrained = True
        db.commit()

        job.status        = "done"
        job.accuracy_after = final_acc
        job.log           = "\n".join(logs)

    except Exception as e:
        job = db.query(RetrainJob).filter(RetrainJob.id == job_id).first()
        if job:
            job.status = "failed"
            job.log    = str(e)
        db.commit()
        print(f"Retrain failed: {e}")

    finally:
        job = db.query(RetrainJob).filter(RetrainJob.id == job_id).first()
        if job:
            job.finished_at = datetime.utcnow()
            db.commit()
        db.close()
