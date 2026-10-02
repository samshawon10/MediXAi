"""Data preprocessing: symptom-text construction, TF-IDF, train/test split.

All data-learned transformations (TF-IDF vocabulary/idf, label encoding) are fit
only on the training split to prevent leakage. The prepare function is fully
deterministic (fixed random_state) so training and evaluation reproduce exactly.
"""
from __future__ import annotations

import functools
from typing import Optional

import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder

from . import config
from .data_loader import ColumnCatalog, load_dataset
from .symptom_normalizer import normalize_symptoms

_PRESENT = {"1", "1.0", "yes", "true", "y", "present", "positive"}


@functools.lru_cache(maxsize=4096)
def _cached_cell(value: str) -> tuple:
    return tuple(normalize_symptoms(value))


def normalize_cell_cached(value) -> list:
    """Memoised per-cell symptom normalisation (25k rows share ~28 symptoms)."""
    if value is None:
        return []
    try:
        if pd.isna(value):
            return []
    except Exception:
        pass
    key = str(value)
    return list(_cached_cell(key))


def _is_present(value) -> bool:
    if value is None:
        return False
    if isinstance(value, (bool, int, float)):
        return not pd.isna(value) and float(value) != 0
    s = str(value).strip().lower()
    return s in _PRESENT


def build_symptom_text(df: pd.DataFrame, cat: ColumnCatalog) -> pd.Series:
    """Return one row of a space-joined canonical symptom string per observation."""
    n = len(df)
    per_row: list[list[str]] = [[] for _ in range(n)]

    if cat.symptom_mode == "text":
        for col in cat.symptom_cols:
            for i, value in enumerate(df[col]):
                per_row[i].extend(normalize_cell_cached(value))
    else:  # one-hot symptom columns -> active symptom names become tokens
        for col in cat.symptom_cols:
            for i, value in enumerate(df[col]):
                if _is_present(value):
                    per_row[i].extend(normalize_symptoms(str(col)))

    def _join(parts: list[str]) -> str:
        # Underscore keeps multi-word phrases (e.g. "shortness of breath") as a
        # single TF-IDF token while still being displayable.
        return to_feature_text(list(dict.fromkeys(parts)))

    return pd.Series([_join(p) for p in per_row], index=df.index)


def make_vectorizer(ngram_range=(1, 1), min_df: int = 1) -> TfidfVectorizer:
    """Default TF-IDF vectorizer. Tokens are already lower-cased & normalised."""
    return TfidfVectorizer(
        ngram_range=tuple(ngram_range),
        lowercase=False,  # normalisation already lowercased
        sublinear_tf=True,
        analyzer="word",
        min_df=min_df,
        token_pattern=r"(?u)\b\w\w+\b",  # underscore counts as a word char
    )


def prepare_train_test(
    raw_path: Optional[str] = None,
    ngram_range=(1, 1),
    min_df: int = 1,
) -> dict:
    """Load, normalise, split (stratified 80/20) and vectorise the dataset.

    Returns a dict with vectorised train/test splits, label encoder info, the
    fitted vectorizer and human-readable texts for inspection.
    """
    df, cat, used = load_dataset(raw_path)
    if not cat.label:
        raise ValueError("Could not identify a disease/label column in the dataset.")

    symptom_text = build_symptom_text(df, cat)
    y_raw = df[cat.label].astype(str).str.strip()

    if y_raw.nunique() < 2:
        raise ValueError("Label column must contain at least 2 classes.")

    # Stratified split because this is multiclass classification.
    X_text_tr, X_text_te, y_raw_tr, y_raw_te = train_test_split(
        symptom_text,
        y_raw,
        test_size=config.TEST_SIZE,
        stratify=y_raw,
        random_state=config.RANDOM_STATE,
    )
    label_encoder = LabelEncoder().fit(y_raw_tr)
    y_tr = label_encoder.transform(y_raw_tr)
    y_te = label_encoder.transform(y_raw_te)

    vectorizer = make_vectorizer(ngram_range=ngram_range, min_df=min_df)
    # Fit vectorizer ONLY on training data (no leakage).
    vectorizer.fit(X_text_tr)
    X_tr = vectorizer.transform(X_text_tr)
    X_te = vectorizer.transform(X_text_te)

    return {
        "X_train": X_tr,
        "X_test": X_te,
        "y_train": y_tr,
        "y_test": y_te,
        "class_names": label_encoder.classes_,
        "label_encoder": label_encoder,
        "vectorizer": vectorizer,
        "feature_names": vectorizer.get_feature_names_out(),
        "symptom_text_train": X_text_tr,
        "symptom_text_test": X_text_te,
        "catalog": cat,
        "n_train": X_tr.shape[0],
        "n_test": X_te.shape[0],
        "input_shape": X_tr.shape[1],
        "used_path": str(used),
        "ngram_range": tuple(ngram_range),
    }


def to_feature_text(normalized: list[str]) -> str:
    """Shared feature representation for training, CLI and HTTP inference."""
    return " ".join(term.replace(" ", "_") for term in normalized)
