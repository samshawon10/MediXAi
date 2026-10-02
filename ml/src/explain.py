"""SHAP attributions in the actual selected model's output space."""
from threading import Lock
import joblib
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.svm import LinearSVC


class ShapEngine:
    def __init__(self, engine):
        import shap
        self.engine = engine
        self.lock = Lock()
        background = joblib.load(engine.model_dir / "shap_background.joblib")
        if background.ndim != 2 or background.shape[1] != len(engine.features) or not np.isfinite(background).all():
            raise ValueError("Invalid SHAP background")
        self.background_rows = len(background)
        if isinstance(engine.model, RandomForestClassifier):
            self.explainer = shap.TreeExplainer(engine.model, data=background, model_output="probability", feature_perturbation="interventional")
            self.units = "model probability"
        elif isinstance(engine.model, (LogisticRegression, LinearSVC)):
            self.explainer = shap.LinearExplainer(engine.model, background)
            self.units = "decision score"
        else:
            self.explainer = shap.Explainer(engine.model.predict_proba, background, algorithm="permutation", seed=42)
            self.units = "model probability"
        self.method = type(self.explainer).__name__

    def explain(self, X, class_pos, condition):
        dense = X.toarray()
        with self.lock:
            result = self.explainer(dense)
        values = np.asarray(result.values)
        base = np.asarray(result.base_values)
        if values.ndim == 3:
            impacts = values[0, :, class_pos]
            baseline = float(base.reshape(-1, values.shape[2])[0, class_pos])
        else:
            impacts = values[0]
            baseline = float(base.ravel()[0])
            if len(self.engine.model.classes_) == 2 and class_pos == 0:
                impacts, baseline = -impacts, -baseline
        if not np.isfinite(impacts).all() or not np.isfinite(baseline):
            raise ValueError("Invalid SHAP output")
        active = set(X.indices)
        selected = sorted(active, key=lambda i: abs(impacts[i]), reverse=True)
        return {
            "available": True, "method": "SHAP", "explainer": self.method,
            "target": condition, "units": self.units, "baseValue": baseline,
            "outputValue": float(baseline + impacts.sum()),
            "absentFeatureImpact": float(sum(v for i, v in enumerate(impacts) if i not in active)),
            "features": [{"feature": self.engine.features[i].replace("_", " "),
                          "impact": float(impacts[i]),
                          "direction": "positive" if impacts[i] >= 0 else "negative"} for i in selected],
            "note": "SHAP describes model behavior, not biological causation. Bars show present input features; absent features also influence the output.",
        }
