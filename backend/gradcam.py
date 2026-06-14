import io
import base64
import numpy as np
import cv2
import torch
from PIL import Image
from torchvision import transforms
from model import get_model, preprocess_image


def _tensor_to_rgb_numpy(tensor: torch.Tensor) -> np.ndarray:
    """Denormalise a [1,3,H,W] tensor → HWC float32 in [0,1]."""
    inv = transforms.Normalize(
        mean=[-0.485/0.229, -0.456/0.224, -0.406/0.225],
        std=[1/0.229, 1/0.224, 1/0.225],
    )
    img = inv(tensor.squeeze(0)).permute(1, 2, 0).cpu().numpy()
    return np.clip(img, 0, 1).astype(np.float32)


def _ndarray_to_b64(arr: np.ndarray) -> str:
    """HWC float32 [0,1] → base64 PNG string."""
    uint8 = (arr * 255).astype(np.uint8)
    buf = io.BytesIO()
    Image.fromarray(uint8).save(buf, format="PNG")
    return base64.b64encode(buf.getvalue()).decode("utf-8")


def generate_gradcam(image: Image.Image, pred_label: str) -> tuple[str, str]:
    """
    Manually compute GradCAM targeting model.backbone.conv_head
    (same layer used in the training notebook's quick_visualize).

    Returns:
        original_b64: base64 PNG of the preprocessed original image
        heatmap_b64:  base64 PNG of the GradCAM overlay
    """
    model, device = get_model()
    tensor = preprocess_image(image).to(device).requires_grad_(True)

    gradients  = {}
    activations = {}

    def save_grad(module, grad_input, grad_output):
        gradients["val"] = grad_output[0].detach()

    def save_act(module, inp, output):
        activations["val"] = output.detach()

    hook_fwd = model.backbone.conv_head.register_forward_hook(save_act)
    hook_bwd = model.backbone.conv_head.register_full_backward_hook(save_grad)

    model.eval()
    logit = model(tensor)
    model.zero_grad()
    logit.backward()

    hook_fwd.remove()
    hook_bwd.remove()

    # Pool gradients over spatial dims → channel weights
    pooled_grads = gradients["val"].mean(dim=[0, 2, 3])     # [C]
    act = activations["val"][0].clone()                       # [C, H, W]
    for i, w in enumerate(pooled_grads):
        act[i] *= w

    heatmap = act.mean(dim=0).cpu().numpy()                   # [H, W]
    heatmap = np.maximum(heatmap, 0)
    if heatmap.max() > 0:
        heatmap /= heatmap.max()

    # Overlay onto original image
    rgb_img = _tensor_to_rgb_numpy(tensor.detach())           # HWC float32
    h, w = rgb_img.shape[:2]
    heatmap_resized = cv2.resize(heatmap, (w, h))

    # Apply jet colormap and blend
    jet = cv2.applyColorMap(np.uint8(255 * heatmap_resized), cv2.COLORMAP_JET)
    jet = cv2.cvtColor(jet, cv2.COLOR_BGR2RGB).astype(np.float32) / 255.0
    overlay = np.clip(0.55 * rgb_img + 0.45 * jet, 0, 1)

    original_b64 = _ndarray_to_b64(rgb_img)
    heatmap_b64  = _ndarray_to_b64(overlay)

    return original_b64, heatmap_b64
