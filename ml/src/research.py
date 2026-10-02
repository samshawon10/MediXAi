"""Read evaluation evidence only when it identifies this exact artifact bundle."""
import json
from . import config


def research_info(engine):
    meta = engine.metadata
    result = {
        "dataset": meta.get("dataset"), "nTrain": meta.get("n_train"),
        "nTest": meta.get("n_test"), "randomState": meta.get("random_state"),
        "testSize": meta.get("test_size"), "features": len(engine.features),
        "labels": [str(label) for label in engine.encoder.classes_],
        "backgroundRows": meta.get("background", {}).get("rows"),
        "evaluation": None,
    }
    try:
        report = json.loads((config.REPORTS_DIR / "phase2_evaluation.json").read_text(encoding="utf-8"))
        expected = meta.get("artifact_sha256", {})
        hashes = report.get("artifact_sha256", {})
        if not expected or any(hashes.get(k) != v for k, v in expected.items()):
            return result
        if report.get("dataset_sha256") != meta.get("dataset_sha256"):
            return result
        selected = next(m for m in report["metrics"] if m["model"] == meta["model_name"])
        result["evaluation"] = {
            "source": "reports/phase2_evaluation.json", "verifiedAt": report["verified_at"],
            "accuracy": selected["accuracy"], "precision": selected["macro_precision"],
            "recall": selected["macro_recall"], "f1": selected["macro_f1"],
            "confusionMatrix": selected["confusion_matrix"],
        }
    except (OSError, ValueError, KeyError, StopIteration, TypeError):
        pass
    return result
