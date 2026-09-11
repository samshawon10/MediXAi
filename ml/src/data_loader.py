"""Dataset loading and adaptive column-catalog.

The real Kaggle dataset column names are NOT assumed. ``catalog_dataset`` inspects
the actual loaded DataFrame and classifies columns into:

  * ``label``          - the multiclass disease column
  * ``symptom_mode``   - 'text' (a single comma-separated symptom string column) or
                         'onehot' (many 0/1 symptom columns)
  * ``symptom_cols``   - the symptom columns to use in the chosen mode
  * ``demographic``    - age / gender style columns (kept out of features for now
                         but catalogued for EDA)

The catalog is column-name driven with generic fallbacks so the pipeline adapts
to whatever CSV is placed in ``ml/data/``.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional

import pandas as pd

from . import config


@dataclass
class ColumnCatalog:
    label: Optional[str] = None
    symptom_mode: str = "text"  # 'text' | 'onehot'
    symptom_cols: list = field(default_factory=list)
    demographic: list = field(default_factory=list)
    all_columns: list = field(default_factory=list)


LABEL_HINTS = ("disease", "label", "diagnosis", "target", "class")
DEMOGRAPHIC_HINTS = ("age", "gender", "sex", "bmi", "temperature")
IGNORED_HINTS = ("id", "index", "patient", "timestamp", "date", "record")
# Auxiliary numeric columns (e.g. Symptom_Count) describe the record but are NOT
# symptom features and must never become TF-IDF/one-hot inputs.
COUNT_HINTS = ("count", "num_", "number", "total")


def _hint_match(col: str, hints) -> bool:
    c = col.lower()
    return any(h in c for h in hints)


def find_label_column(df: pd.DataFrame) -> Optional[str]:
    for col in df.columns:
        if _hint_match(col, LABEL_HINTS):
            # Prefer object/categorical columns that look like disease names.
            return col
    return None


def _looks_onehot(series: pd.Series) -> bool:
    s = series.dropna().astype(str).str.strip()
    uniques = set(s.unique())
    if not uniques:
        return False
    num_uniq = {u for u in uniques if u in {"0", "1", "0.0", "1.0", "yes", "no", "true", "false"}}
    return len(uniques & num_uniq) / len(uniques) >= 0.9 and len(uniques) <= 3


def catalog_dataset(df: pd.DataFrame, label: Optional[str] = None) -> ColumnCatalog:
    cat = ColumnCatalog(all_columns=list(df.columns))
    cat.label = label or find_label_column(df)

    cols = list(df.columns)
    ignored = {
        c for c in cols if cat.label and c.lower() == cat.label.lower()
    }
    for c in cols:
        if _hint_match(c, IGNORED_HINTS) or _hint_match(c, COUNT_HINTS):
            ignored.add(c)

    # Demographic candidates
    cat.demographic = [c for c in cols if c not in ignored and _hint_match(c, DEMOGRAPHIC_HINTS)]

    # Symptom candidates = all remaining columns that are not label, ignored, or demographic.
    symptom_candidates = [c for c in cols if c not in ignored and c not in cat.demographic]

    if not symptom_candidates:
        return cat

    # Heuristic 1: a single text column full of comma separated symptoms.
    sample = df[symptom_candidates[0]].dropna().astype(str)
    if (
        len(symptom_candidates) == 1
        and ("symptom" in symptom_candidates[0].lower() or "symptom" in " ".join(sample.head(200)))
        and sample.str.contains(",").mean() >= 0.5
    ):
        cat.symptom_mode = "text"
        cat.symptom_cols = symptom_candidates
        return cat

    # Heuristic 2: multiple binary 0/1 (or yes/no) symptom columns.
    onehot = [
        c for c in symptom_candidates
        if _looks_onehot(df[c]) and not _hint_match(c, DEMOGRAPHIC_HINTS)
    ]
    # fall back to numeric 0/1 columns even if not perfectly binary
    numeric_bi = [c for c in symptom_candidates if pd.api.types.is_numeric_dtype(df[c])]
    if onehot:
        cat.symptom_mode = "onehot"
        cat.symptom_cols = onehot
        return cat
    if numeric_bi:
        cat.symptom_mode = "onehot"
        cat.symptom_cols = numeric_bi
        return cat

    # Heuristic 3: multiple comma-text symptom columns.
    cat.symptom_mode = "text"
    cat.symptom_cols = symptom_candidates
    return cat


def load_dataset(raw_path: Optional[str] = None) -> tuple[pd.DataFrame, ColumnCatalog, Path]:
    """Load the dataset CSV and return ``(df, catalog, used_path)``."""
    path = Path(raw_path) if raw_path else config.dataset_path()
    df = pd.read_csv(path)
    cat = catalog_dataset(df)
    return df, cat, path