# CrowdSafe AI — CSRNet Crowd Density & Public Safety

A full-stack application built around the trained `best_csrnet_improved.pth` checkpoint. The backend performs real PyTorch inference; the frontend visualizes crowd count, density heatmap, overlay, and project-defined safety levels.

## Included model

`backend/models/best_csrnet_improved.pth` is the trained checkpoint supplied for this project. It is loaded once when FastAPI starts. The application does not retrain the model and does not use fake predictions.

Model evaluation supplied with the project:

- Dataset: ShanghaiTech Part A
- Training images: 300
- Test images: 182
- Epochs: 20
- MAE: 84.087
- RMSE: 132.586
- MAPE: 20.86%
- Correlation: 0.9275

## Architecture

React/Vite frontend → FastAPI backend → CSRNet → density map → crowd count → safety classification → visual dashboard.

## Backend setup

From `backend/`:

```bash
python -m venv .venv
# Windows: .venv\Scripts\activate
# Linux/macOS: source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Swagger: http://localhost:8000/docs

The backend automatically uses CUDA when PyTorch detects a CUDA GPU; otherwise it uses CPU.

## Frontend setup

From `frontend/`:

```bash
npm install
npm run dev
```

Open http://localhost:5173

## Safety thresholds

These are project-defined decision-support thresholds, not universal regulatory standards:

- LOW: 0–24
- MODERATE: 25–74
- HIGH: 75–149
- CRITICAL: 150+

## API

`GET /api/health` checks model availability and device.

`POST /api/predict` accepts a multipart field named `file` containing JPG, PNG, or WEBP image data.

The prediction response includes crowd count, safety level, risk status, recommended action, processing time, device, and URLs for the original image, density heatmap, and overlay.

## Notes

This system is an AI-based decision-support tool and does not replace trained security or emergency personnel.
## Run backend
cd "D:\crowd-density\backend"
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000

## Run Frontend
cd "D:\crowd-density\frontend"
npm run dev -- --host 0.0.0.0 --port 5173 --strictPort
Frontend: http://127.0.0.1:5173