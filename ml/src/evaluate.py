"""Evaluation + best-model selection + report figures.

Reproduces predictions from saved artifacts (or retrains if missing) and computes
accuracy, macro/weighted precision-recall-F1, classification report, confusion
matrix, model comparison table, and selects the preliminary best model by
**Macro F1** (Macro Recall as secondary).
"""
from __future__ import annotations

import json

import joblib
import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import seaborn as sns
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
)

from . import config
from .preprocessing import prepare_train_test

FILE_MODELS = {
    "naive_bayes": "model_naive_bayes.joblib",
    "logistic_regression": "model_logistic_regression.joblib",
    "svm": "model_svm.joblib",
    "random_forest": "model_random_forest.joblib",
}


def _prepare(evaluate_on: str):
    ngram = (1, 1) if evaluate_on == "unigram" else (1, 2)
    prep = prepare_train_test(ngram_range=ngram, min_df=1)
    return prep["X_test"], prep["y_test"], prep["class_names"], prep


def load_fitted():
    fitted = {}
    for name, fname in FILE_MODELS.items():
        p = config.MODELS_DIR / fname
        if p.exists():
            fitted[name] = joblib.load(p)
    return fitted


def evaluate_all(evaluate_on: str = "unigram") -> dict:
    X_te, y_te, class_names, prep = _prepare(evaluate_on)
    fitted = load_fitted()

    n_feat = int(prep["input_shape"])
    try:
        vocab = set(list(prep.get("feature_names", []) or []))
    except Exception:
        vocab = set()
    compatible = {}
    for name, model in fitted.items():
        expected = getattr(model, "n_features_in_", None)
        if expected is not None and int(expected) != n_feat:
            print(f"  skipping stale {name} (trained on {expected} feats, "
                  f"current split has {n_feat})")
            continue
        model_feats = set(getattr(model, "feature_names_in_", []) or [])
        if model_feats and vocab and model_feats != vocab:
            print(f"  skipping stale {name} (vocabulary mismatch)")
            continue
        compatible[name] = model
    if compatible:
        fitted = compatible
    else:
        print("Saved models are stale for this dataset. Retraining...")
        from .train import train_all

        train_all(ngram_range=(1, 1) if evaluate_on == "unigram" else (1, 2), min_df=1)
        fitted = load_fitted()

    rows, predictions = [], {}
    for name, model in fitted.items():
        y_pred = model.predict(X_te)
        predictions[name] = y_pred
        rows.append({
            "model": name,
            "framework": type(model).__name__,
            "accuracy": accuracy_score(y_te, y_pred),
            "macro_precision": precision_score(y_te, y_pred, average="macro", zero_division=0),
            "macro_recall": recall_score(y_te, y_pred, average="macro", zero_division=0),
            "macro_f1": f1_score(y_te, y_pred, average="macro", zero_division=0),
            "weighted_precision": precision_score(y_te, y_pred, average="weighted", zero_division=0),
            "weighted_recall": recall_score(y_te, y_pred, average="weighted", zero_division=0),
            "weighted_f1": f1_score(y_te, y_pred, average="weighted", zero_division=0),
        })

    df = pd.DataFrame(rows).sort_values(config.RANK_METRIC, ascending=False)
    df.to_csv(config.MODEL_RESULTS_CSV, index=False)

    best_name = str(df.iloc[0]["model"])
    best_model = fitted[best_name]
    joblib.dump(best_model, config.BEST_MODEL_PATH)

    best_y_pred = predictions[best_name]
    report_txt = classification_report(
        y_te, best_y_pred, target_names=class_names, digits=4, zero_division=0
    )
    (config.REPORTS_DIR / "classification_report.txt").write_text(
        report_txt, encoding="utf-8"
    )
    cm = confusion_matrix(y_te, best_y_pred)
    np.save(config.REPORTS_DIR / "confusion_matrix.npy", cm)

    json_data = {
        "compare_on": evaluate_on,
        "n_features": int(prep["input_shape"]),
        "best_model": best_name,
        "selection_metric": config.RANK_METRIC,
        "table": df.to_dict(orient="records"),
        "saved": {
            "model_results_csv": str(config.MODEL_RESULTS_CSV),
            "classification_report": str(config.REPORTS_DIR / "classification_report.txt"),
            "confusion_matrix_npy": str(config.REPORTS_DIR / "confusion_matrix.npy"),
        },
    }
    (config.REPORTS_DIR / "evaluation.json").write_text(
        json.dumps(json_data, indent=2), encoding="utf-8"
    )

    return {
        "df": df,
        "best_model": best_name,
        "class_names": class_names,
        "confusion_matrix": cm,
        "prep": prep,
        "predictions": predictions,
        "y_test": y_te,
    }
def _plot(df, cm, class_names, evaluate_on: str) -> dict:
    fig1, ax1 = plt.subplots(figsize=(9, 5))
    df_sorted = df.sort_values("macro_f1", ascending=True)
    metrics = ["accuracy", "macro_f1", "macro_recall"]
    x = np.arange(len(df_sorted))
    width = 0.25
    for i, m in enumerate(metrics):
        ax1.barh(x + i * width, df_sorted[m], height=width, label=m)
    ax1.set_yticks(x + width)
    ax1.set_yticklabels(df_sorted["model"])
    ax1.set_xlabel("Score")
    ax1.set_title(f"Model Comparison — {evaluate_on} TF-IDF")
    ax1.legend()
    ax1.invert_yaxis()
    f1p = config.FIGURES_DIR / "model_comparison.png"
    fig1.tight_layout(); fig1.savefig(f1p, dpi=150); plt.close(fig1)

    fig2, ax2 = plt.subplots(figsize=(14, 12))
    sns.heatmap(cm, annot=False, cmap="Blues", square=True,
                xticklabels=class_names, yticklabels=class_names, ax=ax2)
    ax2.set_title(f"Confusion Matrix — best model ({config.RANK_METRIC})")
    ax2.set_xlabel("Predicted"); ax2.set_ylabel("Actual")
    fig2.tight_layout()
    f2p = config.FIGURES_DIR / "confusion_matrix.png"
    fig2.savefig(f2p, dpi=150); plt.close(fig2)

    support = cm.sum(axis=1)
    fig3, ax3 = plt.subplots(figsize=(12, 5))
    ax3.bar(class_names, support)
    ax3.set_title("Test Samples per Class (actual support)")
    ax3.tick_params(axis="x", rotation=90)
    fig3.tight_layout()
    f3p = config.FIGURES_DIR / "class_support.png"
    fig3.savefig(f3p, dpi=150); plt.close(fig3)

    return {"comparison": str(f1p), "confusion": str(f2p), "support": str(f3p)}


def main(evaluate_on: str = "unigram") -> None:
    print(f"Running evaluation ({evaluate_on} TF-IDF)...")
    out = evaluate_all(evaluate_on=evaluate_on)
    df = out["df"]
    print("\n=== MODEL COMPARISON ===")
    print(df.to_string(index=False))
    print(f"\nPreliminary best model (highest {config.RANK_METRIC}): "
          f"{out['best_model']}")
    print("\nNote: macro F1 reflects balanced multiclass performance; a model with "
          "high accuracy but weak per-class recall is not preferred.")
    for k, v in _plot(df, out["confusion_matrix"], out["class_names"], evaluate_on).items():
        print(f"  figure {k}: {v}")


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Evaluate MediXAI models.")
    parser.add_argument("--on", default="unigram", choices=["unigram", "bigram"])
    args = parser.parse_args()
    main(args.on)