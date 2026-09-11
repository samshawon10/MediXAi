"""Basic prediction pipeline: raw symptom text -> normalise -> TF-IDF -> model.

Returns only genuine model output. If the selected model has no reliable
probability estimate (e.g. a linear SVM), ``confidence`` is ``None`` — we never
fabricate a confidence value.
"""
from __future__ import annotations

import json
import re
from typing import Optional, Union

import joblib

from . import config
from .symptom_normalizer import normalize_symptoms

_TEXT_RE = re.compile(r"[a-zA-Z\u0980-\u09ff]")


class PredictionError(ValueError):
    """Raised for invalid or empty symptom input."""


def validate_symptoms(symptoms: Union[str, list, None]) -> list:
    """Validate raw symptom input; raise ``PredictionError`` on invalid input."""
    if symptoms is None:
        raise PredictionError("No symptoms were provided.")
    if isinstance(symptoms, bytes):
        raise PredictionError("Symptoms must be text, not raw bytes.")
    if isinstance(symptoms, str):
        if not symptoms.strip():
            raise PredictionError("Symptom input is empty.")
        check = symptoms
    elif isinstance(symptoms, (list, tuple, set)):
        if not symptoms:
            raise PredictionError("Symptom list is empty.")
        check = " ".join(str(s) for s in symptoms)
    else:
        raise PredictionError(
            f"Unsupported symptom input type: {type(symptoms).__name__}."
        )
    if not _TEXT_RE.search(check):
        raise PredictionError(
            "No recognisable symptom text found in the input. "
            "Enter words like 'fever', 'cough', or a Bangla symptom."
        )
    normalized = normalize_symptoms(check)
    if not normalized:
        raise PredictionError(
            "Could not recognise any valid symptoms in the input. "
            "Try words like 'fever', 'cough', 'headache'."
        )
    return normalized


def _to_feature_text(normalized: list) -> str:
    return " ".join(t.replace(" ", "_") for t in normalized)


def load_artifacts(check_stale: bool = True):
    needed = [config.TFIDF_VECTORIZER_PATH, config.BEST_MODEL_PATH,
              config.LABEL_ENCODER_PATH]
    missing = [p for p in needed if not p.exists()]
    if missing:
        raise FileNotFoundError(
            "Model artifacts are missing. Train and evaluate first:\n"
            "  cd ml && python -m src.train && python -m src.evaluate\n"
            f"Missing: {[str(m) for m in missing]}"
        )
    vectorizer = joblib.load(config.TFIDF_VECTORIZER_PATH)
    model = joblib.load(config.BEST_MODEL_PATH)
    label_encoder = joblib.load(config.LABEL_ENCODER_PATH)
    if check_stale:
        expected = getattr(model, "n_features_in_", None)
        vocab = len(getattr(vectorizer, "vocabulary_", {}) or {})
        if expected is not None and vocab and int(expected) != int(vocab):
            raise FileNotFoundError(
                "Saved model/vectorizer are stale (feature mismatch). Re-run:\n"
                "  cd ml && python -m src.train && python -m src.evaluate"
            )
    return vectorizer, model, label_encoder


def predict(
    symptoms: Union[str, list],
    demographics: Optional[dict] = None,
) -> dict:
    """Return a JSON-serialisable prediction result dict."""
    vectorizer, model, label_encoder = load_artifacts()

    normalized = validate_symptoms(symptoms)
    X = vectorizer.transform([_to_feature_text(normalized)])

    class_idx = int(model.predict(X)[0])
    predicted_condition = str(label_encoder.classes_[class_idx])

    confidence: Optional[float] = None
    if hasattr(model, "predict_proba"):
        try:
            proba = model.predict_proba(X)[0]
            confidence = round(float(proba[class_idx]), 4)
        except Exception:
            confidence = None

    result = {
        "predicted_condition": predicted_condition,
        "condition": predicted_condition,
        "model": type(model).__name__,
        "model_name": _model_name_of(model),
        "confidence": confidence,
        "normalized_symptoms": normalized,
        "demographics_received": bool(demographics),
        "disclaimer": (
            "AI-generated health insight for decision support only. "
            "Not a confirmed medical diagnosis. Consult a qualified "
            "healthcare professional."
        ),
    }
    return result


def _model_name_of(model) -> str:
    mapping = {
        "MultinomialNB": "naive_bayes",
        "LogisticRegression": "logistic_regression",
        "LinearSVC": "svm",
        "SVC": "svm",
        "RandomForestClassifier": "random_forest",
    }
    return mapping.get(type(model).__name__, type(model).__name__)


if __name__ == "__main__":
    import io
    import sys

    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    else:  # pragma: no cover - legacy fallback
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8",
                                      errors="replace")

    text = " ".join(sys.argv[1:]) or "fever, cough, headache, fatigue"
    try:
        output = predict(text)
        print(json.dumps(output, indent=2, ensure_ascii=False))
    except PredictionError as e:
        print(f"Prediction error: {e}", file=sys.stderr)
        sys.exit(2)
    except Exception as e:  # e.g. missing artifacts
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)