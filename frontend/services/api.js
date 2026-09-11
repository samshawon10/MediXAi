/**
 * Future API contract for the ML service.
 *
 * Phase 1 (first 30%) intentionally does NOT wire a live backend. This module
 * documents the expected request/response shape so the UI components and hooks
 * can be connected to the real FastAPI/Express service later without redesign.
 *
 * Planned integration chain:
 *   Next.js  ->  Express  ->  Python FastAPI ML service
 */

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";
const PREDICT_ENDPOINT = "/api/v1/predict";

/**
 * @param {Object} payload
 * @param {string[]} payload.symptoms        - normalised symptom tokens
 * @param {Object}  [payload.patient]        - { age, gender }
 * @returns {Promise<Object>} expected JSON:
 *   { predicted_condition, model, model_name, confidence, normalized_symptoms, disclaimer }
 */
export async function analyzeSymptoms(payload) {
  // When the ML API is available, the real implementation replaces the throw
  // below. The UI is already wired to consume the documented response shape.
  //
  //   const res = await fetch(`${API_BASE}${PREDICT_ENDPOINT}`, {
  //     method: "POST",
  //     headers: { "Content-Type": "application/json" },
  //     body: JSON.stringify(payload),
  //   });
  //   if (!res.ok) throw new Error(`Prediction failed (${res.status})`);
  //   return res.json();
  //
  throw new Error("ML API not connected yet. Live prediction arrives in the next update.");
}

export const ENDPOINTS = { PREDICT: PREDICT_ENDPOINT, API_BASE };