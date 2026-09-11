"""Tests for the preprocessing & TF-IDF pipeline."""
import tempfile

import scipy.sparse as sp

from src.preprocessing import build_symptom_text, make_vectorizer, prepare_train_test
from src.synthetic import generate


def _write_synthetic(path):
    import pandas as pd

    generate(rows_per_class=40).to_csv(path, index=False)


def test_build_symptom_text_joins_tokens():
    import pandas as pd

    df = pd.DataFrame([{"Symptoms": "fever, cough", "Disease": "Influenza"}])
    from src.data_loader import catalog_dataset

    cat = catalog_dataset(df, label="Disease")
    out = build_symptom_text(df, cat).iloc[0]
    assert "fever" in out and "cough" in out


def test_prepare_train_test_returns_sparse():
    with tempfile.TemporaryDirectory() as td:
        path = f"{td}/data.csv"
        _write_synthetic(path)
        prep = prepare_train_test(raw_path=path)
        assert sp.issparse(prep["X_train"])
        assert prep["X_train"].shape[1] == prep["X_test"].shape[1]
        assert len(prep["class_names"]) >= 2
        # 80/20 split check
        total = prep["n_train"] + prep["n_test"]
        assert abs(prep["n_test"] / total - 0.20) < 0.05


def test_vectorizer_deterministic():
    vec1 = make_vectorizer()
    vec2 = make_vectorizer()
    assert vec1.get_params() == vec2.get_params()