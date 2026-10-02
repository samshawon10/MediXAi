"""Read-only evaluation of the preserved saved models; writes a separate report."""
import json
from datetime import datetime, timezone
from pathlib import Path
import joblib
import numpy as np
from sklearn.metrics import accuracy_score, precision_recall_fscore_support, confusion_matrix
from . import config
from .data_loader import load_dataset
from .preprocessing import prepare_train_test
from .artifacts import file_hash


def main():
    df, catalog, dataset = load_dataset()
    vec = joblib.load(config.TFIDF_VECTORIZER_PATH)
    encoder = joblib.load(config.LABEL_ENCODER_PATH)
    prep = prepare_train_test(ngram_range=vec.ngram_range)
    assert np.array_equal(vec.get_feature_names_out(), prep["feature_names"])
    assert np.allclose(vec.idf_, prep["vectorizer"].idf_)
    assert np.array_equal(encoder.classes_, prep["class_names"])
    results = []
    X = vec.transform(prep["symptom_text_test"])
    for path in sorted(config.MODELS_DIR.glob("model_*.joblib")):
        model = joblib.load(path)
        y = model.predict(X)
        precision, recall, f1, _ = precision_recall_fscore_support(prep["y_test"], y, average="macro", zero_division=0)
        results.append({"model": path.stem.removeprefix("model_"), "accuracy": accuracy_score(prep["y_test"], y),
                        "macro_precision": precision, "macro_recall": recall, "macro_f1": f1,
                        "confusion_matrix": confusion_matrix(prep["y_test"], y).tolist()})
    report = {
        "verified_at": datetime.now(timezone.utc).isoformat(),
        "dataset_sha256": file_hash(dataset),
        "artifact_sha256": {name: file_hash(config.MODELS_DIR / name) for name in
                            ["best_model.joblib", "tfidf_vectorizer.joblib", "label_encoder.joblib", "shap_background.joblib"]},
        "dataset": Path(dataset).name, "rows": len(df), "columns": list(df.columns),
        "missing_cells": int(df.isna().sum().sum()), "duplicate_rows": int(df.duplicated().sum()),
        "class_distribution": {str(k): int(v) for k, v in df[catalog.label].value_counts().items()},
        "n_train": prep["n_train"], "n_test": prep["n_test"], "random_state": 42,
        "ngram_range": list(vec.ngram_range), "n_features": len(vec.vocabulary_),
        "metrics": results,
    }
    selected = joblib.load(config.BEST_MODEL_PATH)
    metadata = json.loads((config.MODELS_DIR / "metadata.json").read_text(encoding="utf-8"))
    saved = joblib.load(config.MODELS_DIR / f"model_{metadata['model_name']}.joblib")
    assert np.array_equal(selected.predict(X), saved.predict(X))
    (config.REPORTS_DIR / "phase2_evaluation.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps({"rows": len(df), "classes": len(encoder.classes_), "metrics": [{k:v for k,v in r.items() if k != "confusion_matrix"} for r in results]}, indent=2))


if __name__ == "__main__":
    main()
