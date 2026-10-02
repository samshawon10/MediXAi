"""Private ML HTTP service. Run from this directory with uvicorn main:app."""
from contextlib import asynccontextmanager
import json
import logging
import os
from pathlib import Path
import re
import sys
import time
from typing import Literal
from uuid import uuid4

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "ml"))

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import BaseModel, ConfigDict, Field, field_validator
from dotenv import load_dotenv

load_dotenv(Path(__file__).with_name(".env"), override=False)

from src.inference import DISCLAIMER, InferenceEngine
from src.predict import PredictionError, validate_symptoms
from src.risk import assess_risk, LIMITATION
from src.research import research_info

logger = logging.getLogger("medixai")
logging.basicConfig(level=logging.INFO)


class AnalysisInput(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)
    symptoms: str = Field(min_length=1, max_length=2000)
    language: Literal["en", "bn"] = "en"

    @field_validator("symptoms")
    @classmethod
    def valid_symptoms(cls, value):
        value = value.strip()
        if re.search(r"[\x00-\x08\x0b\x0c\x0e-\x1f]", value):
            raise ValueError("Control characters are unsupported")
        validate_symptoms(value)
        return value


def create_app(model_dir=None, *, load_model=True):
    @asynccontextmanager
    async def lifespan(app):
        app.state.engine = None
        app.state.explainer = None
        app.state.research = None
        if load_model:
            try:
                app.state.engine = InferenceEngine(model_dir or os.environ.get("ML_MODEL_DIR"))
            except Exception:
                logger.error(json.dumps({"event": "model_startup_failed"}))
            if app.state.engine:
                app.state.research = research_info(app.state.engine)
                try:
                    from src.explain import ShapEngine
                    app.state.explainer = ShapEngine(app.state.engine)
                except Exception:
                    logger.error(json.dumps({"event": "shap_startup_failed"}))
        yield

    app = FastAPI(title="MediXAI ML service", lifespan=lifespan)

    @app.middleware("http")
    async def safety_boundary(request: Request, call_next):
        supplied = request.headers.get("x-request-id", "")
        request.state.request_id = supplied if re.fullmatch(r"[A-Za-z0-9-]{1,64}", supplied) else str(uuid4())
        start = time.perf_counter()
        if request.method == "POST":
            if request.headers.get("content-type", "").split(";")[0].strip().lower() != "application/json":
                return error(request, 415, "Use application/json.")
            size = 0
            chunks = []
            async for chunk in request.stream():
                size += len(chunk)
                if size > 16384:
                    return error(request, 413, "Request body is too large.")
                chunks.append(chunk)
            request._body = b"".join(chunks)
            try:
                request._body.decode("utf-8")
            except UnicodeDecodeError:
                return error(request, 400, "Malformed JSON encoding.")
        try:
            response = await call_next(request)
        except Exception:
            response = error(request, 500, "The analysis service could not complete this request.")
        response.headers["X-Request-ID"] = request.state.request_id
        response.headers["Cache-Control"] = "no-store"
        logger.info(json.dumps({"requestId": request.state.request_id, "endpoint": request.url.path if request.url.path in {"/health", "/model-info", "/analyze", "/predict", "/explain", "/risk"} else "unknown",
                               "processingTimeMs": round((time.perf_counter() - start) * 1000),
                               "status": response.status_code, "timestamp": time.time()}))
        return response

    def error(request, status, message, **extra):
        return JSONResponse(status_code=status, content={"success": False, "requestId": request.state.request_id,
                            "error": {"message": message}, "disclaimer": DISCLAIMER, **extra},
                            headers={"Cache-Control": "no-store", "X-Request-ID": request.state.request_id})

    @app.exception_handler(RequestValidationError)
    async def invalid(request, exc):
        malformed = any(e["type"] == "json_invalid" for e in exc.errors())
        return error(request, 400 if malformed else 422,
                     "Malformed JSON." if malformed else "Enter 1–2000 characters of English or Bangla symptoms and language en or bn.")

    @app.get("/health")
    def health():
        loaded = app.state.engine is not None
        return JSONResponse(status_code=200 if loaded else 503, content={
            "status": "ok" if loaded else "degraded", "modelLoaded": loaded,
            "shapAvailable": app.state.explainer is not None, "riskEngineAvailable": True})

    @app.get("/model-info")
    def model_info(request: Request):
        if app.state.engine is None:
            return error(request, 503, "The analysis model is currently unavailable.")
        return {**app.state.engine.info(), "research": app.state.research,
                "explainability": "SHAP" if app.state.explainer else "unavailable", "riskEngine": "prototype phrase rules v1"}

    def risk_result(symptoms):
        try:
            return assess_risk(symptoms)
        except Exception:
            return {"available": False, "level": "UNAVAILABLE", "score": None, "reasons": [],
                    "urgent": False, "guidance": "Emergency risk assessment is unavailable.", "limitation": LIMITATION}

    def explanation(X, pos, condition):
        if app.state.explainer:
            try:
                return app.state.explainer.explain(X, pos, condition)
            except Exception:
                logger.warning(json.dumps({"event": "shap_request_failed"}))
        return {"available": False, "method": "SHAP", "features": [], "message": "Prediction available. Explainability is temporarily unavailable."}

    @app.post("/risk")
    def risk(body: AnalysisInput, request: Request):
        result = risk_result(body.symptoms)
        return JSONResponse(status_code=200 if result["available"] else 503, content={
            "success": result["available"], "requestId": request.state.request_id, "risk": result, "disclaimer": DISCLAIMER})

    def analyze_impl(body, request, mode):
        risk = risk_result(body.symptoms)
        if app.state.engine is None:
            return error(request, 503, "The analysis model is currently unavailable.", risk=risk)
        try:
            output, X, pos = app.state.engine.predict(body.symptoms)
        except PredictionError as exc:
            return error(request, 422, str(exc), risk=risk)
        except Exception:
            return error(request, 500, "Prediction is temporarily unavailable.", risk=risk)
        response = {"success": True, "requestId": request.state.request_id,
                    "input": body.model_dump(), **output}
        if mode in {"explain", "analyze"}:
            response["explanation"] = explanation(X, pos, output["prediction"]["condition"])
        if mode == "analyze":
            response["risk"] = risk
            response["education"] = {"available": False, "condition": output["prediction"]["condition"],
                                     "message": "Educational information is currently unavailable."}
        return response

    @app.post("/predict")
    def predict(body: AnalysisInput, request: Request):
        return analyze_impl(body, request, "predict")

    @app.post("/explain")
    def explain(body: AnalysisInput, request: Request):
        return analyze_impl(body, request, "explain")

    @app.post("/analyze")
    def analyze(body: AnalysisInput, request: Request):
        return analyze_impl(body, request, "analyze")

    return app


app = create_app()
