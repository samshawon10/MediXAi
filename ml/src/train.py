"""Train the four candidate models, persist artifacts, and capture evaluation data.

Models (reproducible settings):
  1. Multinomial Naive Bayes
  2. Logistic Regression
  3. Linear Support Vector Machine (linear kernel for sparse TF-IDF)
  4. Random Forest

Persists each fitted model plus the vectorizer, label encoder and best-model
selection data so ``evaluate`` can reproduce results deterministically.
"""
from __future__ import annotations

import json
from typing import Optional

import joblib
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.naive_bayes import MultinomialNB
from sklearn.svm import LinearSVC

from . import config
from .preprocessing import prepare_train_test

MODEL_BUILDERS: dict[str, callable] = {}


def _register(name):
    def deco(fn):
        MODEL_BUILDERS[name] = fn
        return fn
    return deco


@_register("naive_bayes")
def _mnb():
    return MultinomialNB()


@_register("logistic_regression")
def _lr():
    return LogisticRegression(
        C=1.0,
        max_iter=1000,
        random_state=config.RANDOM_STATE,
    )


@_register("svm")
def _svm():
    # Linear kernel SVM - appropriate for high-dimensional sparse TF-IDF features.
    return LinearSVC(
        class_weight="balanced",
        random_state=config.RANDOM_STATE,
        max_iter=2000,
        dual="auto",
    )


@_register("random_forest")
def _rf():
    import os

    return RandomForestClassifier(
        n_estimators=100,
        max_depth=30,
        min_samples_leaf=2,
        random_state=config.RANDOM_STATE,
        class_weight="balanced_subsample",
        n_jobs=min(4, (os.cpu_count() or 4)),
    )


def train_all(
    raw_path: Optional[str] = None,
    ngram_range=(1, 1),
    min_df: int = 1,
    save: bool = True,
    only: Optional[list] = None,
) -> dict:
    """Train every model on the prepared split and return a results bundle."""
    prep = prepare_train_test(raw_path, ngram_range=ngram_range, min_df=min_df)
    X_tr, X_te = prep["X_train"], prep["X_test"]
    y_tr, y_te = prep["y_train"], prep["y_test"]

    fitted: dict[str, object] = {}
    summary: dict = {
        "dataset": prep["used_path"],
        "n_train": int(prep["n_train"]),
        "n_test": int(prep["n_test"]),
        "n_features": int(prep["input_shape"]),
        "n_classes": int(len(prep["class_names"])),
        "classes": list(prep["class_names"]),
        "ngram_range": list(prep["ngram_range"]),
        "random_state": config.RANDOM_STATE,
        "test_size": config.TEST_SIZE,
        "models": {},
    }

    for name, builder in MODEL_BUILDERS.items():
        if only and name not in only:
            continue
        model = builder()
        model.fit(X_tr, y_tr)
        fitted[name] = model
        summary["models"][name] = {"framework": type(model).__name__}
        print(f"  fitted {name:20s} ({type(model).__name__})")

    if save:
        joblib.dump(prep["vectorizer"], config.TFIDF_VECTORIZER_PATH)
        joblib.dump(prep["label_encoder"], config.LABEL_ENCODER_PATH)
        for name, model in fitted.items():
            joblib.dump(model, config.MODELS_DIR / f"model_{name}.joblib")

    return {
        "summary": summary,
        "fitted": fitted,
        "prep": prep,
        "X_test": X_te,
        "y_test": y_te,
    }


def discover_features(prep: dict, top_k: int = 25) -> list:
    """Rank the most informative unigram tokens by average TF-IDF magnitude."""
    names = prep["feature_names"]
    X = prep["X_train"]
    # Mean tf-idf per feature across the training set (excluding zeros).
    mean_weights = np.asarray(X.mean(axis=0)).ravel()
    order = np.argsort(mean_weights)[::-1][:top_k]
    return [
        {"token": names[i].replace("_", " "), "mean_tfidf": round(float(mean_weights[i]), 4)}
        for i in order
    ]


def main(raw_path: Optional[str] = None, ngram_range=(1, 1), min_df: int = 1) -> None:
    import time

    t0 = time.time()
    print("Training four candidate models...")
    result = train_all(raw_path, ngram_range=ngram_range, min_df=min_df)
    summary = result["summary"]

    if summary["models"]:
        summary["top_features"] = discover_features(result["prep"], top_k=25)

    (config.REPORTS_DIR / "train_summary.json").write_text(
        json.dumps(summary, indent=2, ensure_ascii=False), encoding="utf-8"
    )
    print(json.dumps(summary, indent=2, ensure_ascii=False))
    print(f"\nDone training in {time.time() - t0:.2f}s. Artifacts saved to "
          f"{config.MODELS_DIR} and summary to {config.REPORTS_DIR / 'train_summary.json'}.")
    print("\nNOTE: best-model selection happens in `evaluate.py` (see phase report).")


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Train MediXAI candidate models.")
    parser.add_argument("--dataset", default=None, help="Optional path to dataset CSV.")
    parser.add_argument("--ngrams", default="1", choices=["1", "1-2"],
                        help="TF-IDF ngram range: '1' (unigram) or '1-2'.")
    parser.add_argument("--min-df", type=int, default=1)
    args = parser.parse_args()
    ngram = (1, 1) if args.ngrams == "1" else (1, 2)
    main(args.dataset, ngram_range=ngram, min_df=args.min_df)
