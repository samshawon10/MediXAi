"""One loaded inference bundle shared by HTTP endpoints and the legacy CLI."""
from __future__ import annotations

import json
from pathlib import Path
import re

import joblib
import numpy as np

from . import config
from .predict import PredictionError, validate_symptoms, _model_name_of
from .preprocessing import to_feature_text

DISCLAIMER = (
    "MediXAI provides AI-assisted health insights for decision support. Predictions are not "
    "confirmed medical diagnoses. Always consult a qualified healthcare professional for "
    "medical advice. In an emergency, seek immediate professional medical assistance."
)
MODEL_LIMITATION = (
    "The existing 30-class dataset produced near-chance test performance. "
    "This model is for academic demonstration and cannot reliably identify a condition. "
    "Model probabilities are uncalibrated scores, not medical probabilities."
)


class InferenceEngine:
    def __init__(self, model_dir=None):
        self.model_dir = Path(model_dir or config.MODELS_DIR)
        self.vectorizer = joblib.load(self.model_dir / "tfidf_vectorizer.joblib")
        self.model = joblib.load(self.model_dir / "best_model.joblib")
        self.encoder = joblib.load(self.model_dir / "label_encoder.joblib")
        self.features = self.vectorizer.get_feature_names_out()
        if len(self.features) != self.model.n_features_in_:
            raise ValueError("Incompatible feature artifacts")
        if not np.array_equal(self.model.classes_, np.arange(len(self.encoder.classes_))):
            raise ValueError("Incompatible label artifacts")
        # Limit concurrent tree workers inside the API process.
        if hasattr(self.model, "n_jobs"):
            self.model.n_jobs = 1
        meta = self.model_dir / "metadata.json"
        self.metadata = json.loads(meta.read_text(encoding="utf-8")) if meta.exists() else {}
        if self.metadata.get("artifact_sha256"):
            from .artifacts import file_hash
            for name, digest in self.metadata["artifact_sha256"].items():
                if name not in {"best_model.joblib", "tfidf_vectorizer.joblib", "label_encoder.joblib", "shap_background.joblib"}:
                    raise ValueError("Invalid artifact manifest")
                if file_hash(self.model_dir / name) != digest:
                    raise ValueError("Artifact integrity mismatch; refresh metadata")
        self.model.predict(self.vectorizer.transform(["fever"]))
        names = ("naive_bayes", "logistic_regression", "svm", "random_forest")
        paths = [self.model_dir / f"model_{name}.joblib" for name in names]
        self.candidates = {}
        if any(path.exists() for path in paths) or self.metadata:
            for name, path in zip(names, paths):
                candidate = joblib.load(path)
                if candidate.n_features_in_ != len(self.features) or not np.array_equal(candidate.classes_, self.model.classes_):
                    raise ValueError("Incompatible candidate artifacts")
                if hasattr(candidate, "n_jobs"):
                    candidate.n_jobs = 1
                self.candidates[name] = candidate

    def compare(self, X):
        results = []
        for name, candidate in self.candidates.items():
            label = int(candidate.predict(X)[0])
            pos = int(np.flatnonzero(candidate.classes_ == label)[0])
            score = None
            if hasattr(candidate, "predict_proba"):
                probabilities = candidate.predict_proba(X)[0]
                if not np.isfinite(probabilities).all():
                    raise ValueError("Non-finite candidate output")
                score = float(probabilities[pos])
            results.append({"model": name, "condition": str(self.encoder.classes_[label]),
                            "confidence": score,
                            "scoreType": "uncalibrated model probability" if score is not None else "unavailable"})
        if not results:
            return {}
        votes = {}
        for result in results:
            condition = result["condition"]
            votes[condition] = votes.get(condition, 0) + 1
        highest = max(votes.values())
        tied = sorted(condition for condition, count in votes.items() if count == highest)
        return {"modelPredictions": results, "finalPrediction": {
            "condition": tied[0], "method": "equal-weight hard voting",
            "votes": highest, "totalModels": len(results), "tied": len(tied) > 1,
            "tiedConditions": tied if len(tied) > 1 else [],
            "tieBreak": "alphabetical condition name",
        }}

    def info(self):
        return {
            "name": _model_name_of(self.model), "model": type(self.model).__name__,
            "version": self.metadata.get("version", "legacy-1"),
            "classes": len(self.encoder.classes_), "vectorizer": "TF-IDF",
            "limitation": MODEL_LIMITATION,
        }

    def transform(self, symptoms):
        normalized = validate_symptoms(symptoms)
        # A bag-of-symptoms model cannot interpret absence/history reliably.
        if re.search(r"\b(no|not|without|denies|denied|never)\b|নেই|নাই", ", ".join(normalized)):
            raise PredictionError("Negated symptoms cannot be interpreted reliably. Enter only symptoms currently present.")
        X = self.vectorizer.transform([to_feature_text(normalized)])
        # Also handle simple prose by extracting bounded vocabulary phrases.
        if not X.nnz:
            text = " ".join(normalized)
            found = [name.replace("_", " ") for name in self.features
                     if " " not in name and re.search(r"(?<!\w)" + re.escape(name.replace("_", " ")) + r"(?!\w)", text)]
            if found:
                normalized = found
                X = self.vectorizer.transform([to_feature_text(normalized)])
        if not X.nnz:
            raise PredictionError("No symptoms in the trained vocabulary were recognized. Try common symptom phrases separated by commas.")
        return normalized, X

    def predict(self, symptoms):
        normalized, X = self.transform(symptoms)
        label = int(self.model.predict(X)[0])
        class_pos = int(np.flatnonzero(self.model.classes_ == label)[0])
        probabilities = self.model.predict_proba(X)[0] if hasattr(self.model, "predict_proba") else None
        predictions = []
        if probabilities is not None:
            if not np.isfinite(probabilities).all():
                raise ValueError("Non-finite model output")
            for pos in np.argsort(-probabilities, kind="stable")[:3]:
                predictions.append({"condition": str(self.encoder.classes_[int(self.model.classes_[pos])]),
                                    "confidence": float(probabilities[pos])})
        condition = str(self.encoder.classes_[label])
        unknown = [s for s in normalized if not self.vectorizer.transform([to_feature_text([s])]).nnz]
        return {
            **self.compare(X),
            "prediction": {"condition": condition,
                           "confidence": float(probabilities[class_pos]) if probabilities is not None else None,
                           "scoreType": "uncalibrated model probability" if probabilities is not None else "unavailable",
                           "alternatives": [p for p in predictions if p["condition"] != condition]},
            "predictions": predictions, "normalizedSymptoms": normalized,
            "unrecognizedSymptoms": unknown, "model": self.info(), "disclaimer": DISCLAIMER,
        }, X, class_pos
