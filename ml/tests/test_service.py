import importlib.util
from pathlib import Path
import numpy as np
import pytest
import joblib
from fastapi.testclient import TestClient

from src.inference import InferenceEngine
from src.explain import ShapEngine
from src.preprocessing import prepare_train_test, to_feature_text
from src.risk import assess_risk
from src.synthetic import generate
from src.symptom_normalizer import normalize_symptoms

spec = importlib.util.spec_from_file_location("ml_service", Path(__file__).parents[2] / "backend/ml-service/main.py")
service = importlib.util.module_from_spec(spec)
spec.loader.exec_module(service)


@pytest.fixture(scope="module")
def bundle(tmp_path_factory):
    from sklearn.ensemble import RandomForestClassifier
    path = tmp_path_factory.mktemp("model")
    data = path / "demo.csv"
    generate(rows_per_class=25).to_csv(data, index=False)
    prep = prepare_train_test(str(data))
    model = RandomForestClassifier(n_estimators=12, random_state=42).fit(prep["X_train"], prep["y_train"])
    for name, value in [("best_model", model), ("tfidf_vectorizer", prep["vectorizer"]),
                        ("label_encoder", prep["label_encoder"]), ("shap_background", prep["X_train"][:16].toarray())]:
        joblib.dump(value, path / f"{name}.joblib")
    return path


@pytest.fixture
def client(bundle):
    with TestClient(service.create_app(bundle)) as c:
        yield c


def test_normalization_equivalence():
    assert normalize_symptoms("জ্বর, শুকনা কাশি, মাথা ব্যথা") == normalize_symptoms("HIGH FEVER; dry cough; head pain.")
    assert normalize_symptoms("I have fever, headache and body pain") == ["fever", "headache", "muscle pain"]
    normalized = normalize_symptoms("feaver, difficulty breathing, stomach pain")
    assert normalize_symptoms(normalized) == normalized
    assert normalize_symptoms("আমার জ্বর ও কাশি") == ["fever", "cough"]


def test_training_transform_consistency(tmp_path):
    data = tmp_path / "demo.csv"
    generate(rows_per_class=20).to_csv(data, index=False)
    a, b = prepare_train_test(str(data)), prepare_train_test(str(data))
    assert list(a["symptom_text_train"].index) == list(b["symptom_text_train"].index)
    assert set(a["symptom_text_train"].index).isdisjoint(a["symptom_text_test"].index)
    assert set(a["y_train"]) == set(a["y_test"])
    assert set(a["vectorizer"].vocabulary_) <= set(" ".join(a["symptom_text_train"]).split())
    assert to_feature_text(normalize_symptoms("জ্বর, শ্বাসকষ্ট")) == "fever shortness_of_breath"


def test_prediction_top_k_and_shap_additivity(bundle):
    engine = InferenceEngine(bundle)
    output, X, pos = engine.predict("fever, cough, headache, fatigue")
    scores = [p["confidence"] for p in output["predictions"]]
    assert len(scores) == 3 and scores == sorted(scores, reverse=True)
    explanation = ShapEngine(engine).explain(X, pos, output["prediction"]["condition"])
    assert explanation["explainer"] == "TreeExplainer"
    assert explanation["features"] and all(np.isfinite(f["impact"]) for f in explanation["features"])
    assert explanation["outputValue"] == pytest.approx(output["prediction"]["confidence"], abs=1e-6)
    reconstructed = explanation["baseValue"] + explanation["absentFeatureImpact"] + sum(f["impact"] for f in explanation["features"])
    assert reconstructed == pytest.approx(explanation["outputValue"])


@pytest.mark.parametrize("labels,winner,votes,tied", [
    ([0, 0, 0, 1], 0, 3, False),
    ([1, 1, 0, 0], 0, 2, True),
    ([3, 2, 1, 0], 0, 1, True),
])
def test_four_model_voting(bundle, labels, winner, votes, tied):
    from types import SimpleNamespace
    engine = InferenceEngine(bundle)
    engine.candidates = {name: SimpleNamespace(classes_=engine.model.classes_,
        predict=lambda X, label=label: np.array([label]))
        for name, label in zip(("naive_bayes", "logistic_regression", "svm", "random_forest"), labels)}
    output, _, _ = engine.predict("fever, cough")
    assert len(output["modelPredictions"]) == 4
    final = output["finalPrediction"]
    assert final["condition"] == engine.encoder.classes_[winner]
    assert final["votes"] == votes and final["totalModels"] == 4
    assert final["tied"] == tied
    assert all(p["confidence"] is None for p in output["modelPredictions"])


@pytest.mark.parametrize("text,level", [("difficulty breathing", "HIGH"), ("blue lips", "CRITICAL"),
    ("fever, cough", "UNASSESSED"), ("শ্বাসকষ্ট", "HIGH"), ("severe chest pain", "CRITICAL"),
    ("no chest pain", "HIGH"), ("unconsciously", "UNASSESSED")])
def test_risk(text, level):
    result = assess_risk(text)
    assert result["level"] == level and result["score"] is None
    assert "cannot rule out" in result["limitation"]


def test_endpoints(client):
    assert client.get("/health").json()["shapAvailable"]
    info = client.get("/model-info").json()
    assert "path" not in str(info).lower()
    for endpoint in ["predict", "explain", "risk", "analyze"]:
        result = client.post("/" + endpoint, json={"symptoms": "fever, cough, headache"})
        assert result.status_code == 200
        assert result.headers["cache-control"] == "no-store"
    result = client.post("/analyze", json={"symptoms": "জ্বর, কাশি, মাথা ব্যথা", "language": "bn"}).json()
    assert result["normalizedSymptoms"] == ["fever", "cough", "headache"]
    assert result["explanation"]["available"]


@pytest.mark.parametrize("body", [{}, {"symptoms": " "}, {"symptoms": "!"}, {"symptoms": 123},
    {"symptoms": "a" * 2001}, {"symptoms": "fever", "language": "fr"}, {"symptoms": "fever", "secret": "x"}])
def test_invalid(client, body):
    result = client.post("/analyze", json=body)
    assert result.status_code == 422
    assert "traceback" not in result.text.lower()


def test_malformed_and_size_limits(client):
    assert client.post("/analyze", content="{", headers={"Content-Type": "application/json"}).status_code == 400
    assert client.post("/analyze", content="x" * 17000, headers={"Content-Type": "application/json"}).status_code == 413
    assert client.post("/analyze", content="fever").status_code == 415
    assert client.post("/analyze", content=b"\xff", headers={"Content-Type": "application/json"}).status_code == 400


@pytest.mark.parametrize("kind", ["linear", "svm", "naive_bayes"])
def test_non_tree_explainers(bundle, kind):
    from sklearn.linear_model import LogisticRegression
    from sklearn.svm import LinearSVC
    from sklearn.naive_bayes import MultinomialNB
    prep = prepare_train_test(str(bundle / "demo.csv"))
    engine = InferenceEngine(bundle)
    candidate = {"linear": LogisticRegression(random_state=42), "svm": LinearSVC(random_state=42), "naive_bayes": MultinomialNB()}[kind]
    engine.model = candidate.fit(prep["X_train"], prep["y_train"])
    result, X, pos = engine.predict("fever, cough")
    explanation = ShapEngine(engine).explain(X, pos, result["prediction"]["condition"])
    assert explanation["explainer"] == ("PermutationExplainer" if kind == "naive_bayes" else "LinearExplainer")
    expected = candidate.predict_proba(X)[0, pos] if kind == "naive_bayes" else candidate.decision_function(X)[0, pos]
    assert explanation["outputValue"] == pytest.approx(expected, abs=1e-6)
    if kind == "svm":
        assert result["prediction"]["confidence"] is None


def test_artifact_mismatch_fails_startup(bundle, tmp_path):
    import shutil
    for path in bundle.glob("*.joblib"):
        shutil.copyfile(path, tmp_path / path.name)
    model = joblib.load(tmp_path / "best_model.joblib")
    model.n_features_in_ += 1
    joblib.dump(model, tmp_path / "best_model.joblib")
    with pytest.raises(ValueError, match="Incompatible"):
        InferenceEngine(tmp_path)


def test_model_unavailable_retains_urgent_risk(tmp_path):
    with TestClient(service.create_app(tmp_path)) as c:
        assert c.get("/health").status_code == 503
        result = c.post("/analyze", json={"symptoms": "blue lips"})
        assert result.status_code == 503 and result.json()["risk"]["urgent"]
        assert c.post("/risk", json={"symptoms": "blue lips"}).status_code == 200


def test_shap_failure_preserves_prediction(client, monkeypatch):
    def fail(*args):
        raise RuntimeError("private internal path")
    monkeypatch.setattr(client.app.state.explainer, "explain", fail)
    result = client.post("/analyze", json={"symptoms": "fever, cough"})
    assert result.status_code == 200
    assert result.json()["prediction"]["condition"]
    assert result.json()["explanation"]["available"] is False
    assert "private internal" not in result.text


def test_unknown_and_negation_retain_risk(client):
    for text in ["blue lips", "no chest pain"]:
        result = client.post("/analyze", json={"symptoms": text})
        assert result.status_code == 422 and result.json()["risk"]["urgent"]


def test_risk_failure_not_low(client, monkeypatch):
    def fail(*args):
        raise RuntimeError("private")
    monkeypatch.setattr(service, "assess_risk", fail)
    result = client.post("/analyze", json={"symptoms": "fever"}).json()
    assert result["risk"]["available"] is False
    assert result["risk"]["level"] == "UNAVAILABLE"


def test_research_requires_matching_evidence(bundle, tmp_path, monkeypatch):
    import json
    from src import research
    engine = InferenceEngine(bundle)
    engine.metadata = {"artifact_sha256": {"best_model.joblib": "expected"},
                       "dataset_sha256": "dataset", "model_name": "random_forest"}
    monkeypatch.setattr(research.config, "REPORTS_DIR", tmp_path)
    assert research.research_info(engine)["evaluation"] is None
    report = {"artifact_sha256": {"best_model.joblib": "wrong"}, "dataset_sha256": "dataset",
              "verified_at": "2026-10-02T00:00:00Z", "metrics": [{"model": "random_forest",
              "accuracy": 0.2, "macro_precision": 0.2, "macro_recall": 0.2, "macro_f1": 0.2,
              "confusion_matrix": [[1, 4], [4, 1]]}]}
    evidence = tmp_path / "phase2_evaluation.json"
    evidence.write_text(json.dumps(report), encoding="utf-8")
    assert research.research_info(engine)["evaluation"] is None
    report["artifact_sha256"]["best_model.joblib"] = "expected"
    evidence.write_text(json.dumps(report), encoding="utf-8")
    assert research.research_info(engine)["evaluation"]["accuracy"] == 0.2
