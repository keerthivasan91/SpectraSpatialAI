import torch
import torch.nn as nn
import torch.nn.functional as F
import timm
from PIL import Image
from torchvision import transforms
from config import settings

# ── Label mapping ──────────────────────────────────────────────────────────────
# Model outputs a single logit → sigmoid → P(REAL)
# FAKE  if P(REAL) <= 0.40
# REAL  if P(REAL) >= 0.60
# UNCERTAIN otherwise

FAKE_THRESHOLD = 0.40
REAL_THRESHOLD = 0.60

_MEAN = torch.tensor([0.485, 0.456, 0.406]).view(1, 3, 1, 1)
_STD  = torch.tensor([0.229, 0.224, 0.225]).view(1, 3, 1, 1)


# ── FFT branch ────────────────────────────────────────────────────────────────

class FFTBranch(nn.Module):
    """Frequency-domain stream: grayscale FFT magnitude → small CNN → embedding."""

    def __init__(self, out_dim: int = 64):
        super().__init__()
        self.cnn = nn.Sequential(
            nn.Conv2d(1, 16, kernel_size=3, padding=1),
            nn.BatchNorm2d(16),
            nn.ReLU(),
            nn.MaxPool2d(2),                          # 128×128

            nn.Conv2d(16, 32, kernel_size=3, padding=1),
            nn.BatchNorm2d(32),
            nn.ReLU(),
            nn.MaxPool2d(2),                          # 64×64

            nn.Conv2d(32, 64, kernel_size=3, padding=1),
            nn.BatchNorm2d(64),
            nn.ReLU(),
            nn.AdaptiveAvgPool2d((4, 4)),             # 4×4
        )
        self.fc = nn.Linear(64 * 4 * 4, out_dim)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        # x: [B, 3, H, W] — denormalised pixel values in [0, 1]
        gray = 0.299 * x[:, 0] + 0.587 * x[:, 1] + 0.114 * x[:, 2]  # [B, H, W]
        fft = torch.fft.fft2(gray)
        fft_shift = torch.fft.fftshift(fft)
        magnitude = torch.log(torch.abs(fft_shift) + 1e-8)
        mag_min = magnitude.amin(dim=(-2, -1), keepdim=True)
        mag_max = magnitude.amax(dim=(-2, -1), keepdim=True)
        magnitude = (magnitude - mag_min) / (mag_max - mag_min + 1e-8)
        magnitude = magnitude.unsqueeze(1)            # [B, 1, H, W]
        features = self.cnn(magnitude)
        features = features.view(features.size(0), -1)
        return self.fc(features)


# ── Full dual-stream model ────────────────────────────────────────────────────

class FakeImageDetector(nn.Module):
    def __init__(self, spatial_dim: int = 256, fft_dim: int = 64, dropout: float = 0.4):
        super().__init__()

        # Spatial stream
        self.backbone = timm.create_model(
            "tf_efficientnetv2_s",
            pretrained=False,
            num_classes=0,
            global_pool="avg",
        )
        spatial_features = self.backbone.num_features

        self.spatial_head = nn.Sequential(
            nn.BatchNorm1d(spatial_features),
            nn.Linear(spatial_features, spatial_dim),
            nn.ReLU(),
            nn.Dropout(dropout),
        )

        # FFT stream
        self.fft_branch = FFTBranch(out_dim=fft_dim)

        # Fusion head → single logit (BCEWithLogitsLoss during training)
        fused_dim = spatial_dim + fft_dim
        self.fusion = nn.Sequential(
            nn.Linear(fused_dim, 128),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(128, 1),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        # Spatial features
        spatial = self.backbone(x)
        spatial = self.spatial_head(spatial)

        # Denormalise before FFT — frequency artifacts need real pixel values
        mean = _MEAN.to(x.device)
        std  = _STD.to(x.device)
        x_raw = (x * std + mean).clamp(0.0, 1.0)
        fft = self.fft_branch(x_raw)

        # L2-normalise both streams so FFT isn't crowded out by spatial magnitude
        spatial = F.normalize(spatial, dim=1)
        fft     = F.normalize(fft,     dim=1)

        fused = torch.cat([spatial, fft], dim=1)
        return self.fusion(fused).squeeze(1)   # [B]


# ── Singleton loader ──────────────────────────────────────────────────────────

_model: FakeImageDetector = None
_device: torch.device = None


def get_model() -> tuple[FakeImageDetector, torch.device]:
    global _model, _device
    if _model is None:
        _device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        _model = FakeImageDetector(spatial_dim=256, fft_dim=64, dropout=0.4)
        state = torch.load(settings.MODEL_PATH, map_location=_device)
        # Support both raw state_dict and checkpoint dicts
        if isinstance(state, dict) and "model_state_dict" in state:
            state = state["model_state_dict"]
        _model.load_state_dict(state)
        _model.to(_device)
        _model.eval()
        print(f"Model loaded on {_device}")
    return _model, _device


# ── Preprocessing ─────────────────────────────────────────────────────────────

def get_transform() -> transforms.Compose:
    return transforms.Compose([
        transforms.Resize((settings.IMAGE_SIZE, settings.IMAGE_SIZE)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406],
                             std=[0.229, 0.224, 0.225]),
    ])


def preprocess_image(image: Image.Image) -> torch.Tensor:
    """Returns [1, 3, H, W] tensor."""
    return get_transform()(image.convert("RGB")).unsqueeze(0)


def predict(image: Image.Image) -> tuple[str, float, float]:
    """
    Returns:
        label:      'AI-Generated' | 'Real' | 'Uncertain'
        p_real:     P(REAL) as float in [0, 1]
        confidence: confidence % (distance from nearest threshold, 0–100)
    """
    model, device = get_model()
    tensor = preprocess_image(image).to(device)

    with torch.no_grad():
        logit = model(tensor)
        p_real = torch.sigmoid(logit).item()

    if p_real <= FAKE_THRESHOLD:
        label = "AI-Generated"
        confidence = round((1.0 - p_real / FAKE_THRESHOLD) * 100, 2)
    elif p_real >= REAL_THRESHOLD:
        label = "Real"
        confidence = round(((p_real - REAL_THRESHOLD) / (1.0 - REAL_THRESHOLD)) * 100, 2)
    else:
        label = "Uncertain"
        # Distance from centre of uncertain zone
        centre = (FAKE_THRESHOLD + REAL_THRESHOLD) / 2
        confidence = round(abs(p_real - centre) / (centre - FAKE_THRESHOLD) * 100, 2)

    return label, round(p_real, 4), confidence
