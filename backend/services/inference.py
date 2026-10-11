import io
import time
import uuid
from pathlib import Path

import cv2
import numpy as np
import torch
from PIL import Image, UnidentifiedImageError

from models.csrnet import CSRNet

BACKEND_DIR = Path(__file__).resolve().parents[1]
MODEL_PATH = BACKEND_DIR / "models" / "best_csrnet_improved.pth"
OUTPUTS_DIR = BACKEND_DIR / "outputs"
MEAN = np.array([0.485, 0.456, 0.406], dtype=np.float32)
STD = np.array([0.229, 0.224, 0.225], dtype=np.float32)
MAX_SIDE = 1024
MAX_STORED_OUTPUTS = 120

DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")
DEVICE_NAME = "cuda" if DEVICE.type == "cuda" else "cpu"
GPU_NAME = torch.cuda.get_device_name(0) if DEVICE.type == "cuda" else None

_model = None
_model_loaded = False


class ImageValidationError(ValueError):
    pass


def print_startup_banner(loaded: bool, error: str | None = None) -> None:
    lines = [
        "=" * 50,
        "CROWDSAFE AI",
        "=" * 50,
        "Model: CSRNet",
        "Checkpoint: best_csrnet_improved.pth",
        f"Device: {DEVICE_NAME.upper()}",
    ]
    if GPU_NAME:
        lines.append(f"GPU: {GPU_NAME}")
    lines.append(f"Model Loaded: {'YES' if loaded else 'NO'}")
    if error:
        lines.append(f"Error: {error}")
    lines.append("=" * 50)
    print("\n".join(lines), flush=True)


def _extract_state_dict(checkpoint):
    if isinstance(checkpoint, dict):
        if "model_state_dict" in checkpoint:
            return checkpoint["model_state_dict"]
        if "state_dict" in checkpoint:
            return checkpoint["state_dict"]
    return checkpoint


def load_model():
    global _model, _model_loaded
    if _model is not None:
        return _model
    if not MODEL_PATH.exists():
        raise FileNotFoundError(
            f"Trained model not found: {MODEL_PATH}. "
            "Place best_csrnet_improved.pth in backend/models/ and restart."
        )
    model = CSRNet(use_imagenet_weights=False)
    checkpoint = torch.load(MODEL_PATH, map_location=DEVICE, weights_only=False)
    state = _extract_state_dict(checkpoint)
    if not isinstance(state, dict):
        raise RuntimeError("Checkpoint is not a state dictionary.")
    state = {k[7:] if k.startswith("module.") else k: v for k, v in state.items()}
    model.load_state_dict(state, strict=True)
    model.to(DEVICE)
    model.eval()
    _model = model
    _model_loaded = True
    return _model


def is_model_loaded() -> bool:
    return _model_loaded and _model is not None


def classify_safety(count: float) -> tuple[str, str, str, str]:
    """Project-defined decision-support thresholds (not official public-safety standards)."""
    if count < 25:
        return "LOW", "Low crowding", "Normal monitoring", "LOW RISK"
    if count < 75:
        return "MODERATE", "Moderate crowding", "Monitor crowd movement", "MODERATE RISK"
    if count < 150:
        return "HIGH", "Elevated crowding", "Increase monitoring", "HIGH RISK"
    return "CRITICAL", "High crowding", "Immediate crowd monitoring", "CRITICAL CROWDING"


def _align8(value: int) -> int:
    return max(8, value - (value % 8))


def _open_rgb_image(image_bytes: bytes) -> Image.Image:
    try:
        probe = Image.open(io.BytesIO(image_bytes))
        probe.verify()
        image = Image.open(io.BytesIO(image_bytes))
        image.load()
    except (UnidentifiedImageError, OSError, ValueError) as exc:
        raise ImageValidationError(
            "Unable to analyze this image. Please upload a valid JPG, PNG, or WEBP image."
        ) from exc
    if image.mode not in {"RGB", "RGBA", "L", "P"}:
        raise ImageValidationError(
            "Unable to analyze this image. Please upload a valid JPG, PNG, or WEBP image."
        )
    return image.convert("RGB")


def _add_density_legend(bgr: np.ndarray) -> np.ndarray:
    height, width = bgr.shape[:2]
    bar_h = max(18, height // 36)
    pad = 28
    legend = np.zeros((bar_h + pad, width, 3), dtype=np.uint8)
    legend[:] = (18, 16, 14)
    gradient = np.tile(np.linspace(0, 255, width, dtype=np.uint8), (bar_h, 1))
    legend[:bar_h] = cv2.applyColorMap(gradient, cv2.COLORMAP_JET)
    cv2.putText(
        legend,
        "LOW DENSITY",
        (10, bar_h + 20),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.45,
        (220, 220, 220),
        1,
        cv2.LINE_AA,
    )
    text = "HIGH DENSITY"
    text_size = cv2.getTextSize(text, cv2.FONT_HERSHEY_SIMPLEX, 0.45, 1)[0]
    cv2.putText(
        legend,
        text,
        (width - text_size[0] - 10, bar_h + 20),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.45,
        (220, 220, 220),
        1,
        cv2.LINE_AA,
    )
    arrow = "LOW DENSITY  ->  HIGH DENSITY"
    arrow_size = cv2.getTextSize(arrow, cv2.FONT_HERSHEY_SIMPLEX, 0.42, 1)[0]
    cv2.putText(
        legend,
        arrow,
        ((width - arrow_size[0]) // 2, bar_h + 20),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.42,
        (200, 200, 200),
        1,
        cv2.LINE_AA,
    )
    return np.vstack([bgr, legend])


def _encode_jpeg(bgr: np.ndarray) -> bytes:
    ok, buffer = cv2.imencode(".jpg", bgr, [int(cv2.IMWRITE_JPEG_QUALITY), 92])
    if not ok:
        raise RuntimeError("Could not encode generated visualization.")
    return buffer.tobytes()


def _cleanup_outputs() -> None:
    files = sorted(OUTPUTS_DIR.glob("*.jpg"), key=lambda p: p.stat().st_mtime, reverse=True)
    for stale in files[MAX_STORED_OUTPUTS:]:
        try:
            stale.unlink(missing_ok=True)
        except OSError:
            pass


def _save_visuals(original_rgb: Image.Image, heatmap_bgr: np.ndarray, overlay_bgr: np.ndarray) -> dict[str, str]:
    OUTPUTS_DIR.mkdir(parents=True, exist_ok=True)
    file_id = uuid.uuid4().hex[:12]
    original_bgr = cv2.cvtColor(np.asarray(original_rgb), cv2.COLOR_RGB2BGR)
    names = {
        "original_image_url": f"original_{file_id}.jpg",
        "density_map_url": f"density_{file_id}.jpg",
        "overlay_url": f"overlay_{file_id}.jpg",
    }
    (OUTPUTS_DIR / names["original_image_url"]).write_bytes(_encode_jpeg(original_bgr))
    (OUTPUTS_DIR / names["density_map_url"]).write_bytes(_encode_jpeg(_add_density_legend(heatmap_bgr)))
    (OUTPUTS_DIR / names["overlay_url"]).write_bytes(_encode_jpeg(_add_density_legend(overlay_bgr)))
    _cleanup_outputs()
    return {key: f"/outputs/{filename}" for key, filename in names.items()}


def predict(image_bytes: bytes) -> dict:
    if not is_model_loaded():
        load_model()
    model = _model
    original = _open_rgb_image(image_bytes)
    original_w, original_h = original.size

    scale = min(1.0, MAX_SIDE / max(original_w, original_h))
    new_w = _align8(max(32, int(original_w * scale)))
    new_h = _align8(max(32, int(original_h * scale)))
    resized = original.resize((new_w, new_h), Image.Resampling.BILINEAR)

    array = np.asarray(resized, dtype=np.float32) / 255.0
    array = (array - MEAN) / STD
    tensor = torch.from_numpy(array).permute(2, 0, 1).unsqueeze(0).contiguous().to(DEVICE)

    started = time.perf_counter()
    with torch.no_grad():
        density = model(tensor)
    elapsed = time.perf_counter() - started

    count = max(0.0, float(density.sum().item()))
    density_np = np.maximum(density.squeeze().detach().cpu().numpy(), 0.0)
    density_resized = cv2.resize(density_np, (original_w, original_h), interpolation=cv2.INTER_CUBIC)
    if float(density_resized.max()) > 0:
        normalized = cv2.normalize(density_resized, None, 0, 255, cv2.NORM_MINMAX).astype(np.uint8)
    else:
        normalized = np.zeros((original_h, original_w), dtype=np.uint8)

    heatmap = cv2.applyColorMap(normalized, cv2.COLORMAP_JET)
    original_bgr = cv2.cvtColor(np.asarray(original), cv2.COLOR_RGB2BGR)
    overlay = cv2.addWeighted(original_bgr, 0.55, heatmap, 0.45, 0)

    urls = _save_visuals(original, heatmap, overlay)
    safety_level, risk_status, recommended_action, display_risk = classify_safety(count)

    return {
        "success": True,
        "crowd_count": round(count, 2),
        "crowd_count_rounded": int(round(count)),
        "safety_level": safety_level,
        "risk_status": risk_status,
        "risk_display": display_risk,
        "recommended_action": recommended_action,
        "processing_time": round(elapsed, 3),
        "device": DEVICE_NAME,
        "model": "CSRNet",
        **urls,
    }
