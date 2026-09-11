# MediXAI Backend (future)

This directory is reserved for the full backend service built in the **next
development phase**:

- **Express** gateway (Node) — frontend-facing API
- **Python FastAPI ML service** — hosts the trained artifacts in `ml/` and exposes:

  - `POST /api/v1/predict` → `{ predicted_condition, model, model_name, confidence, normalized_symptoms, disclaimer }`
  - `POST /api/v1/explain`  → SHAP contributions (future)
  - `POST /api/v1/risk`     → emergency risk level (future)

The frontend (`frontend/services/api.js`) already documents this contract so the
UI can connect without redesign.

Until then, prediction is available directly from the ML pipeline via the CLI:

```bash
cd ml
python -m src.predict "fever, cough, headache, fatigue"
```
