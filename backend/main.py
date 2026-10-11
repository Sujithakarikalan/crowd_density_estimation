from pathlib import Path

from fastapi import FastAPI, File, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from services.inference import (
    DEVICE_NAME,
    GPU_NAME,
    MODEL_PATH,
    OUTPUTS_DIR,
    ImageValidationError,
    is_model_loaded,
    load_model,
    predict,
    print_startup_banner,
)

ALLOWED_TYPES = {
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/x-png",
}
ALLOWED_SUFFIXES = {".jpg", ".jpeg", ".png", ".webp"}
MAX_BYTES = 12 * 1024 * 1024

app = FastAPI(
    title="CrowdSafe AI API",
    description="CSRNet crowd density estimation for public-safety decision support.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:4173",
        "http://127.0.0.1:4173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

OUTPUTS_DIR.mkdir(parents=True, exist_ok=True)


@app.on_event("startup")
def startup():
    try:
        load_model()
        print_startup_banner(True)
        if GPU_NAME:
            print(f"Using GPU: {GPU_NAME}")
    except Exception as exc:
        print_startup_banner(False, str(exc))
        raise RuntimeError(f"Failed to load CSRNet checkpoint: {exc}") from exc


def _public_base(request: Request) -> str:
    host = request.headers.get("host", "localhost:8000")
    if host.startswith("0.0.0.0"):
        host = host.replace("0.0.0.0", "localhost", 1)
    return f"{request.url.scheme}://{host}"


def _absolute_media(request: Request, path: str) -> str:
    return f"{_public_base(request)}{path}"


@app.get("/")
def root():
    return {
        "name": "CrowdSafe AI",
        "docs": "/docs",
        "health": "/api/health",
        "predict": "/api/predict",
    }


@app.get("/api/health")
def health():
    loaded = is_model_loaded()
    return {
        "status": "ok" if loaded else "error",
        "model": "CSRNet",
        "model_loaded": loaded,
        "device": DEVICE_NAME,
        "checkpoint": MODEL_PATH.name,
        "gpu": GPU_NAME,
    }


@app.post("/api/predict")
async def predict_image(request: Request, file: UploadFile = File(...)):
    if not is_model_loaded():
        raise HTTPException(status_code=503, detail="CSRNet model is not loaded.")

    suffix = Path(file.filename or "").suffix.lower()
    content_type = (file.content_type or "").lower()
    if content_type not in ALLOWED_TYPES and suffix not in ALLOWED_SUFFIXES:
        raise HTTPException(
            status_code=400,
            detail="Unable to analyze this image. Please upload a valid JPG, PNG, or WEBP image.",
        )

    data = await file.read()
    if not data:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")
    if len(data) > MAX_BYTES:
        raise HTTPException(status_code=413, detail="Image is too large. Maximum size is 12 MB.")

    try:
        result = predict(data)
    except ImageValidationError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Inference failed: {exc}") from exc

    result["filename"] = file.filename
    for key in ("original_image_url", "density_map_url", "overlay_url"):
        result[key] = _absolute_media(request, result[key])
    return JSONResponse(result)


app.mount("/outputs", StaticFiles(directory=str(OUTPUTS_DIR)), name="outputs")
