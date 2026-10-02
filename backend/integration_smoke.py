"""Smoke-test the real local ML service and gateway authorization boundary."""
import json
import os
import time
from urllib.error import HTTPError
from urllib.request import Request, urlopen

BASE = os.environ.get("MEDIXAI_GATEWAY_URL", "http://127.0.0.1:5000")
ML_BASE = os.environ.get("MEDIXAI_ML_URL", "http://127.0.0.1:8000")


def call(base, path, payload=None, token=None, method=None):
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    request = Request(base + path, data=json.dumps(payload).encode("utf-8") if payload is not None else None,
                      headers=headers, method=method)
    try:
        response = urlopen(request, timeout=25)
    except HTTPError as exc:
        response = exc
    with response:
        return response.status, dict(response.headers), json.load(response)


def firebase_token():
    email = os.environ.get("E2E_TEST_EMAIL")
    password = os.environ.get("E2E_TEST_PASSWORD")
    api_key = os.environ.get("NEXT_PUBLIC_FIREBASE_API_KEY")
    if not all((email, password, api_key)):
        return None
    request = Request(
        f"https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key={api_key}",
        data=json.dumps({"email": email, "password": password, "returnSecureToken": True}).encode("utf-8"),
        headers={"Content-Type": "application/json"},
    )
    try:
        with urlopen(request, timeout=15) as response:
            result = json.load(response)
    except HTTPError as exc:
        exc.close()
        raise RuntimeError("Firebase smoke-test sign-in failed; verify the dedicated test account and configuration.") from None
    token = result.get("idToken")
    if not isinstance(token, str) or not token:
        raise RuntimeError("Firebase did not return an ID token for the smoke-test account.")
    return token


def main():
    token = firebase_token()
    status, _, health = call(BASE, "/api/health")
    assert status == 200 and health["ml"]["modelLoaded"] and health["ml"]["shapAvailable"]
    status, _, unauthorized = call(BASE, "/api/analyze", {"symptoms": "fever", "language": "en", "disclaimerAccepted": True})
    assert status == 401 and not unauthorized["success"]
    service = BASE if token else ML_BASE
    endpoint = "/api/analyze" if token else "/analyze"
    examples = []
    created = []
    try:
        for symptoms, language in [("fever, cough, headache, fatigue", "en"), ("জ্বর, কাশি, মাথা ব্যথা", "bn")]:
            start = time.perf_counter()
            payload = {"symptoms": symptoms, "language": language}
            if token:
                payload["disclaimerAccepted"] = True
            status, headers, result = call(service, endpoint, payload, token)
            elapsed = time.perf_counter() - start
            if token and isinstance(result.get("analysisId"), str):
                created.append(result["analysisId"])
            assert status == 200 and result["success"] and result["explanation"]["available"]
            assert result["risk"]["available"]
            assert abs(result["explanation"]["outputValue"] - result["prediction"]["confidence"]) < 1e-6
            assert len(result["predictions"]) == 3 and result["requestId"]
            assert headers.get("Cache-Control") == "no-store"
            examples.append({"input": {"symptoms": symptoms, "language": language}, "elapsed_seconds": elapsed,
                             "condition": result["prediction"]["condition"], "model_confidence": result["prediction"]["confidence"],
                             "shap_method": result["explanation"]["explainer"], "risk": result["risk"]["level"]})
        status, _, emergency = call(service, endpoint, {"symptoms": "blue lips", "language": "en", **({"disclaimerAccepted": True} if token else {})}, token)
        assert status == 422 and emergency["risk"]["level"] == "CRITICAL" and emergency["risk"]["urgent"]
    finally:
        for analysis_id in created:
            status, _, _ = call(BASE, f"/api/analyses/{analysis_id}", token=token, method="DELETE")
            assert status == 200
    report = {"health": health, "examples": examples, "authenticated_gateway_analysis": bool(token),
              "unauthenticated_analysis_rejected": True, "urgent_risk_survives_unrecognized_model_input": True}
    print(json.dumps(report, indent=2, ensure_ascii=True))


if __name__ == "__main__":
    main()
