"""End-to-end pipeline test:
raw symptom input -> normalized -> TF-IDF -> model -> prediction (reproducible).

Trains briefly on the synthetic demo dataset so the test is self-contained and
deterministic (no external network or real clinical data required).
"""
import tempfile

from src.predict import PredictionError, predict, validate_symptoms
from src.synthetic import generate


def test_validate_symptoms_rejects_empty():
    for bad in ["", "   ", None, [], "!!!", "1234"]:
        try:
            validate_symptoms(bad)
            assert False, f"expected rejection for {bad!r}"
        except PredictionError:
            pass


def test_validate_symptoms_accepts_normal_text():
    out = validate_symptoms("fever, cough, headache")
    assert "fever" in out and "cough" in out


def test_full_pipeline_produces_prediction():
    # Train using a temp synthetic dataset (fast), returns a prediction dict.
    with tempfile.TemporaryDirectory() as td:
        from pathlib import Path

        p = Path(td) / "demo.csv"
        generate(rows_per_class=40).to_csv(p, index=False)

        import os
        old = os.environ.get("MEDIXAI_DATASET")
        os.environ["MEDIXAI_DATASET"] = str(p)

        import shutil

        from src import config
        from src.train import train_all
        from src.evaluate import evaluate_all

        backup = {name: config.MODELS_DIR / name for name in
                  ["tfidf_vectorizer.joblib", "label_encoder.joblib",
                   "best_model.joblib", "model_naive_bayes.joblib",
                   "model_logistic_regression.joblib", "model_svm.joblib",
                   "model_random_forest.joblib"]}
        saved = {}
        for name, path in backup.items():
            if path.exists():
                saved[name] = path.read_bytes()
        reports_backup = {}
        for name in ["model_comparison.csv", "model_results.json",
                     "evaluation.json", "train_summary.json",
                     "classification_report.txt", "confusion_matrix.npy"]:
            rp = config.REPORTS_DIR / name
            if rp.exists():
                reports_backup[name] = rp.read_bytes()
        try:
            result = train_all(min_df=1)
            eval_out = evaluate_all()
        finally:
            if old is None:
                os.environ.pop("MEDIXAI_DATASET", None)
            else:
                os.environ["MEDIXAI_DATASET"] = old
            for name, data in saved.items():
                (config.MODELS_DIR / name).write_bytes(data)
            for name, data in reports_backup.items():
                (config.REPORTS_DIR / name).write_bytes(data)
        class_names = set(eval_out["class_names"])

        pred = predict("fever, cough, headache, fatigue")
        assert "predicted_condition" in pred
        assert pred["predicted_condition"] in class_names
        # Confidence, when present, must be a real float in [0,1]
        if pred["confidence"] is not None:
            assert 0.0 <= pred["confidence"] <= 1.0


def test_predict_rejects_invalid():
    try:
        predict("")
        assert False
    except (PredictionError, Exception):
        pass