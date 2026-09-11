"""Central paths and shared configuration for the MediXAI ML pipeline.

All modules import paths from here so the project can be moved/relocated
without breaking anything.
"""
from __future__ import annotations

import os
from pathlib import Path

# d:\MediXAI/ml/src/config.py  ->  repo root is three levels up from this file
REPO_ROOT = Path(__file__).resolve().parents[2]

ML_DIR = REPO_ROOT / "ml"
SRC_DIR = ML_DIR / "src"
DATA_DIR = ML_DIR / "data"
MODELS_DIR = ML_DIR / "models"
NOTEBOOKS_DIR = ML_DIR / "notebooks"
TESTS_DIR = ML_DIR / "tests"

REPORTS_DIR = REPO_ROOT / "reports"
FIGURES_DIR = REPORTS_DIR / "figures"

# The frontend "predict" script / FastAPI service will read these.
BACKEND_DIR = REPO_ROOT / "backend"

for _d in (
    ML_DIR,
    DATA_DIR,
    MODELS_DIR,
    NOTEBOOKS_DIR,
    REPORTS_DIR,
    FIGURES_DIR,
    BACKEND_DIR,
):
    _d.mkdir(parents=True, exist_ok=True)

# --- Experiment configuration -------------------------------------------------
RANDOM_STATE = 42
TEST_SIZE = 0.20  # 80% training / 20% testing, stratified

# --- Artifact paths ------------------------------------------------------------
TFIDF_VECTORIZER_PATH = MODELS_DIR / "tfidf_vectorizer.joblib"
LABEL_ENCODER_PATH = MODELS_DIR / "label_encoder.joblib"
BEST_MODEL_PATH = MODELS_DIR / "best_model.joblib"
PIPELINE_PATH = MODELS_DIR / "full_pipeline.joblib"
MODEL_RESULTS_PATH = REPORTS_DIR / "model_results.json"
MODEL_RESULTS_CSV = REPORTS_DIR / "model_comparison.csv"

# Primary metric used to rank models for this multiclass medical decision-support
# project. Macro F1 emphasises balanced performance across all condition classes.
RANK_METRIC = "macro_f1"


def dataset_path(prefer_real: bool = True) -> Path:
    """Return the path of the dataset to use.

    Resolution order:
      1. $MEDIXAI_DATASET environment variable (explicit path)
      2. The real Kaggle CSV in ``ml/data/`` (Healthcare*.csv preferred)
      3. Any other .csv present in ``ml/data/``
      4. Best effort fallback to generated synthetic demo data
    """
    env = os.environ.get("MEDIXAI_DATASET")
    if env:
        return Path(env)

    csvs = sorted(DATA_DIR.glob("*.csv"))
    if csvs and prefer_real:
        real = [c for c in csvs if "healthcare" in c.name.lower()]
        if real:
            return real[0]
        non_synth = [c for c in csvs if "synthetic" not in c.name.lower()]
        if non_synth:
            return non_synth[0]
    if csvs:
        return csvs[0]

    syn = DATA_DIR / "synthetic_demo_dataset.csv"
    if syn.exists():
        return syn

    raise FileNotFoundError(
        "No dataset found. Place the Kaggle Healthcare Symptoms–Disease "
        "Classification CSV inside ml/data/ (or set $MEDIXAI_DATASET), "
        "or run `python -m src.synthetic` to generate demo data."
    )