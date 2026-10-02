"""Add metadata and training-only SHAP background without renaming legacy files."""
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path

import joblib
import numpy as np
import sklearn

from . import config


def file_hash(path):
    digest = hashlib.sha256()
    with Path(path).open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def write_metadata(prep, model, model_name, *, trained_at=None):
    background_indices = np.random.default_rng(42).choice(prep["n_train"], min(32, prep["n_train"]), replace=False)
    background = prep["X_train"][background_indices].toarray()
    joblib.dump(background, config.MODELS_DIR / "shap_background.joblib")
    names = ["best_model.joblib", "tfidf_vectorizer.joblib", "label_encoder.joblib", "shap_background.joblib"]
    metadata = {
        "model_name": model_name, "model_type": type(model).__name__,
        "dataset": Path(prep["used_path"]).name, "dataset_sha256": file_hash(prep["used_path"]),
        "classes": list(prep["class_names"]), "features": list(prep["feature_names"]),
        "ngram_range": list(prep["ngram_range"]), "n_train": prep["n_train"], "n_test": prep["n_test"],
        "random_state": 42, "test_size": 0.2, "version": "1.0.0",
        "preprocessing_version": "2", "trained_at": trained_at,
        "packaged_at": datetime.now(timezone.utc).isoformat(), "sklearn_version": sklearn.__version__,
        "background": {"rows": len(background), "source": "training split only", "seed": 42},
        "artifact_sha256": {name: file_hash(config.MODELS_DIR / name) for name in names},
        "limitations": "Academic model; existing dataset evaluation is near chance. Not clinically validated.",
    }
    (config.MODELS_DIR / "metadata.json").write_text(json.dumps(metadata, indent=2), encoding="utf-8")
    return metadata


def package_existing():
    from .preprocessing import prepare_train_test
    from .predict import load_artifacts, _model_name_of
    vec, model, encoder = load_artifacts()
    prep = prepare_train_test(ngram_range=vec.ngram_range)
    if not np.array_equal(vec.get_feature_names_out(), prep["feature_names"]) or not np.allclose(vec.idf_, prep["vectorizer"].idf_):
        raise ValueError("Dataset no longer matches saved vectorizer; train and evaluate first")
    if not np.array_equal(encoder.classes_, prep["class_names"]):
        raise ValueError("Dataset labels no longer match saved encoder")
    return write_metadata(prep, model, _model_name_of(model))


if __name__ == "__main__":
    print(json.dumps(package_existing(), indent=2))
