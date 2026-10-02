const API_BASE = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000").replace(/\/$/, "");
import { firebaseAuth } from "@/lib/firebase";
export const ENDPOINTS = { ANALYZE: "/api/analyze", MODEL_INFO: "/api/model-info", API_BASE };

const probability = value => value === null || (Number.isFinite(value) && value >= 0 && value <= 1);
const candidate = value => value && typeof value.condition === "string" && probability(value.confidence);
const validRisk = risk => risk && typeof risk.available === "boolean" && Array.isArray(risk.reasons) && risk.reasons.every(r => typeof r.symptom === "string") && ["HIGH", "CRITICAL", "UNASSESSED", "UNAVAILABLE"].includes(risk.level);
function validAnalysis(data) {
  return candidate(data.prediction) && Array.isArray(data.predictions) && data.predictions.every(candidate)
    && typeof data.model?.name === "string" && typeof data.model?.version === "string"
    && typeof data.input?.symptoms === "string" && Array.isArray(data.normalizedSymptoms)
    && data.normalizedSymptoms.every(s => typeof s === "string") && validRisk(data.risk)
    && typeof data.explanation?.available === "boolean" && Array.isArray(data.explanation.features)
    && data.explanation.features.every(f => typeof f.feature === "string" && Number.isFinite(f.impact) && ["positive", "negative"].includes(f.direction));
}

export async function apiRequest(path, { body, method = body ? "POST" : "GET", signal, authenticated = true } = {}) {
  const controller = new AbortController();
  let timedOut = false;
  const abort = () => controller.abort();
  if (signal?.aborted) controller.abort();
  signal?.addEventListener("abort", abort, { once: true });
  const timer = setTimeout(() => { timedOut = true; controller.abort(); }, 25000);
  try {
    const send = async (refresh = false) => {
      let token;
      if (authenticated) { const auth = await firebaseAuth(); await auth.authStateReady(); if (!auth.currentUser) throw Object.assign(new Error("Sign in to continue."), { code: "AUTH_REQUIRED" }); token = await auth.currentUser.getIdToken(refresh); }
      return fetch(`${API_BASE}${path}`, { method, headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body === undefined ? undefined : JSON.stringify(body), signal: controller.signal, cache: "no-store" });
    };
    let response = await send();
    if (response.status === 401 && authenticated) response = await send(true);
    let data;
    try { data = await response.json(); }
    catch { throw Object.assign(new Error("Invalid response"), { code: "invalid" }); }
    if (!data || typeof data !== "object" || Array.isArray(data)) throw Object.assign(new Error("Invalid response"), { code: "invalid" });
    if (!response.ok || data.success === false) {
      const error = new Error(data.error?.message || "The analysis service is currently unavailable.");
      error.result = { requestId: typeof data.requestId === "string" ? data.requestId : undefined, ...(validRisk(data.risk) ? { risk: data.risk } : {}) };
      error.code = [401, 403, 409].includes(response.status) ? data.error?.code : response.status === 422 ? "input" : response.status === 429 ? "rate" : response.status === 504 ? "timeout" : response.status === 502 ? "invalid" : "service";
      error.status = response.status;
      throw error;
    }
    return data;
  } catch (error) {
    if (timedOut) throw Object.assign(new Error("The analysis took too long to complete. Please try again."), { code: "timeout" });
    if (error instanceof TypeError) throw Object.assign(new Error("MediXAI service is temporarily unavailable. Please try again later."), { code: "service" });
    throw error;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", abort);
  }
}

export async function platformRequest(path, options) {
  const response = await apiRequest(`/api${path}`, options);
  if (response.success !== true || response.data === undefined) throw Object.assign(new Error("Incomplete service response."), { code: "invalid" });
  return response.data;
}
export async function analyzeSymptoms(payload, signal) {
  const data = await apiRequest(ENDPOINTS.ANALYZE, { body: payload, signal });
  if (!validAnalysis(data) || !data.analysisId) throw Object.assign(new Error("Incomplete result"), { code: "invalid" });
  if (data.finalPrediction || data.modelPredictions) {
    const final = data.finalPrediction;
    if (!Array.isArray(data.modelPredictions) || data.modelPredictions.length !== 4
      || !data.modelPredictions.every(p => candidate(p) && typeof p.model === "string")
      || typeof final?.condition !== "string" || final.totalModels !== 4
      || !Number.isInteger(final.votes) || final.votes < 1 || final.votes > 4
      || typeof final.tied !== "boolean" || !Array.isArray(final.tiedConditions)) {
      throw Object.assign(new Error("Incomplete model comparison"), { code: "invalid" });
    }
  }
  return data;
}
export async function getModelInfo(signal) {
  const data = await apiRequest(ENDPOINTS.MODEL_INFO, { signal, authenticated: false });
  if (!data.name || !data.version || !Number.isInteger(data.classes)) throw Object.assign(new Error("Invalid model information"), { code: "invalid" });
  return data;
}
