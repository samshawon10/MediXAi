"""Reproducible dataset exploration (EDA).

Probes whatever dataset is present (real Kaggle CSV or the synthetic demo data),
reports statistics to stdout + JSON, and saves visualisations under
``reports/figures/``.
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import Optional

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import pandas as pd
import seaborn as sns

from . import config
from .data_loader import catalog_dataset, load_dataset
from .preprocessing import build_symptom_text

sns.set_theme(style="whitegrid", palette="deep")


def describe_dataset(path: Optional[str] = None) -> dict:
    df, cat, used = load_dataset(path)
    stats = {
        "source": str(used),
        "synthetic_demo": "synthetic" in str(used).lower(),
        "shape": list(df.shape),
        "rows": int(df.shape[0]),
        "columns": int(df.shape[1]),
        "column_names": list(df.columns),
        "data_types": {c: str(t) for c, t in df.dtypes.items()},
        "missing_cells": int(df.isna().sum().sum()),
        "missing_by_column": {c: int(v) for c, v in df.isna().sum().items()},
        "duplicate_rows": int(df.duplicated().sum()),
        "catalog": {
            "label": cat.label,
            "symptom_mode": cat.symptom_mode,
            "symptom_cols": cat.symptom_cols,
            "demographic": cat.demographic,
        },
    }

    if cat.label:
        dist = df[cat.label].astype(str).str.strip().value_counts()
        stats["num_classes"] = int(dist.size)
        stats["disease_distribution"] = {
            str(k): int(v) for k, v in dist.items()
        }
        stats["unique_diseases"] = list(dist.index.astype(str))

    symptom_text = build_symptom_text(df, cat)
    tokenized = symptom_text.str.split(" ")
    all_tokens = [t for row in tokenized for t in row if t]
    freq = pd.Series(all_tokens).value_counts()
    stats["unique_symptom_tokens"] = int(freq.size)
    stats["symptom_frequency"] = {
        str(k).replace("_", " "): int(v) for k, v in freq.head(40).items()
    }
    counts = tokenized.apply(len)
    stats["symptom_count_min"] = int(counts.min())
    stats["symptom_count_max"] = int(counts.max())
    stats["symptom_count_mean"] = round(float(counts.mean()), 3)

    # Demographic distribution
    demo = {}
    for col in cat.demographic:
        demo[col] = {str(k): int(v) for k, v in df[col].value_counts(dropna=False).items()}
    stats["demographic_distribution"] = demo

    (config.REPORTS_DIR / "eda_summary.json").write_text(
        json.dumps(stats, indent=2, ensure_ascii=False, default=str),
        encoding="utf-8",
    )
    return stats


def _tokens_per_class(df, cat):
    symptom_text = build_symptom_text(df, cat)
    return pd.DataFrame({cat.label: df[cat.label], "text": symptom_text})


def generate_figures(stats: dict) -> dict:
    paths = {}
    if "disease_distribution" in stats:
        fig, ax = plt.subplots(figsize=(12, 6))
        dist = pd.Series(stats["disease_distribution"]).sort_values(ascending=False)
        ax.bar(dist.index.astype(str), dist.values)
        ax.set_title("Disease Class Distribution")
        ax.tick_params(axis="x", rotation=90)
        fig.tight_layout()
        p = config.FIGURES_DIR / "disease_distribution.png"
        fig.savefig(p, dpi=150); plt.close(fig)
        paths["disease_distribution"] = str(p)

    if "symptom_frequency" in stats:
        fig, ax = plt.subplots(figsize=(11, 8))
        freq = pd.Series(stats["symptom_frequency"]).sort_values()
        ax.barh(freq.index, freq.values)
        ax.set_title("Top Symptoms (Token Frequency)")
        fig.tight_layout()
        p = config.FIGURES_DIR / "top_symptoms.png"
        fig.savefig(p, dpi=150); plt.close(fig)
        paths["top_symptoms"] = str(p)

    # Symptom count distribution requires the raw text: regenerate here.
    return paths


def recompute_count_and_missing_figs() -> dict:
    paths = {}
    try:
        df, cat, used = load_dataset()
    except FileNotFoundError as e:
        print("  (skip count/missing figs)", e)
        return paths

    counts = build_symptom_text(df, cat).str.split(" ").apply(len)
    fig, ax = plt.subplots(figsize=(8, 5))
    ax.hist(counts, bins=range(0, counts.max() + 2), align="left", rwidth=0.9)
    ax.set_title("Symptom Count Distribution")
    ax.set_xlabel("Symptoms per record"); ax.set_ylabel("Frequency")
    p = config.FIGURES_DIR / "symptom_count_distribution.png"
    fig.tight_layout(); fig.savefig(p, dpi=150); plt.close(fig)
    paths["symptom_count"] = str(p)

    missing = df.isna().sum()
    missing = missing[missing > 0]
    if missing.size:
        fig, ax = plt.subplots(figsize=(9, 5))
        ax.bar(missing.index.astype(str), missing.values)
        ax.set_title("Missing Values by Column")
        ax.tick_params(axis="x", rotation=90)
        fig2 = config.FIGURES_DIR / "missing_values.png"
        fig.tight_layout(); fig.savefig(fig2, dpi=150); plt.close(fig)
        paths["missing"] = str(fig2)
    return paths


def main(path: Optional[str] = None) -> None:
    print(f"Running EDA on dataset...")
    stats = describe_dataset(path)
    print(json.dumps(stats, indent=2, ensure_ascii=False, default=str))
    fig_paths = generate_figures(stats)
    fig_paths.update(recompute_count_and_missing_figs())
    print("\nFigures saved:")
    for k, v in fig_paths.items():
        print(f"  - {k}: {v}")
    print(f"\nEDA summary JSON: {config.REPORTS_DIR / 'eda_summary.json'}")


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="EDA for MediXAI dataset.")
    parser.add_argument("--dataset", default=None, help="Optional path to dataset CSV.")
    args = parser.parse_args()
    main(args.dataset)