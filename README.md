# MediXAI

**Explainable AI-Based Symptom Analysis and Emergency Risk Prediction for Intelligent Healthcare Decision Support**

MediXAI is an **academic healthcare decision-support prototype**. It accepts
natural-language symptoms (English or Bangla), normalizes them, and predicts a
*possible condition* with a trained multiclass machine-learning model. A SHAP-based
explainability layer and an emergency-risk engine are planned for the next phase.

> ⚠️ **Disclaimer:** MediXAI provides AI-assisted health insights for decision
> support. Predictions are **not** confirmed medical diagnoses. Consult a qualified
> healthcare professional for medical advice. In an emergency, seek immediate
> professional medical assistance.

---

## Current progress

**Completed: approximately 30%**
- ✅ Working ML foundation (EDA, preprocessing, normalization, train/test, TF-IDF,
  four models, evaluation, best-model selection, prediction CLI)
- ✅ Complete final frontend (branding, nav, home, symptom analysis, results,
  XAI/risk/disease sections with honest locked states, loading/empty/error states,
  responsive & accessible)
- 🔜 Not yet: SHAP engine, emergency-risk model, FastAPI service, Express + live
  frontend↔backend connection (UI is ready for these without redesign)

---

## Architecture

```
Next.js Frontend
      ↓
Express Backend          (future)
      ↓
Python FastAPI ML Service (future)
      ↓
Preprocessing → TF-IDF → Best ML Model → Prediction
      → SHAP Explanation (future) → Emergency Risk Engine (future)
```

## Technology stack

| Layer | Tech |
|---|---|
| Frontend | Next.js 14, React 18, CSS design system |
| ML | Python, pandas, scikit-learn (TF-IDF, NB · LogReg · SVM · RF), joblib |
| EDA/figures | matplotlib, seaborn |
| Docs | `reports/phase1_30_percent.md`, `reports/` |

---

## Project structure

```
MediXAI/
├── frontend/          # Next.js application (pages, components, hooks, services, styles)
├── ml/                # Python ML pipeline
│   ├── data/          # dataset CSV goes here (or $MEDIXAI_DATASET)
│   ├── notebooks/     # reproducible exploration notebook
│   ├── src/           # data_loader.py, eda.py, preprocessing.py,
│   │                  # symptom_normalizer.py, train.py, evaluate.py, predict.py, synthetic.py
│   ├── models/        # saved artifacts (*.joblib)
│   └── tests/         # pytest suite
├── reports/           # phase report, metrics, figures/
└── backend/           # (future) Express + FastAPI gateway
```

---

## Getting started

### Frontend

```bash
cd frontend
npm install
npm run dev        # http://localhost:3000
# or
npm run build && npm start
```

### ML (Python 3.10+)

```bash
cd ml
pip install -r requirements.txt
```

**Dataset.** The real *Healthcare Symptoms–Disease Classification* dataset
(Kaggle, Kundan Sagar Bedmutha) is at `ml/data/Healthcare.csv`
(25,000 rows, 30 diseases). `config.dataset_path()` prefers `Healthcare*.csv`
automatically; alternatively set `$MEDIXAI_DATASET=/path/data.csv`.

The small `ml/data/synthetic_demo_dataset.csv` is used ONLY for fast unit
tests — all reported metrics come from the real CSV.

### Training

```bash
cd ml
python -m src.train              # trains 4 models, saves artifacts
python -m src.train --ngrams 1-2 # optional bigram TF-IDF
```

### Evaluation

```bash
cd ml
python -m src.evaluate           # prints comparison, best model; writes figures
```

### Prediction

```bash
cd ml
python -m src.predict "fever, cough, headache, fatigue"
python -m src.predict "জ্বর, কাশি, মাথা ব্যথা"
```

### EDA

```bash
cd ml
python -m src.eda
python -m jupyter nbconvert --execute --to notebook --inplace notebooks/01_dataset_exploration.ipynb
```

### Tests

```bash
cd ml
python -m pytest -q
```

---

## Reproducibility

- Stratified 80/20 split, `random_state = 42`.
- All data-learned transforms (vectorizer, label encoder) fitted **only on training**.
- Results are written to `reports/` (JSON, CSV, figures) and artifacts to `ml/models/`.

## Roadmap

1. SHAP explainability engine
2. Emergency-risk prediction
3. FastAPI ML service
4. Express integration + live frontend↔backend
5. Advanced healthcare features (patient history, provider view)

See `reports/phase1_30_percent.md` for the full phase-1 report.# MediXAi
