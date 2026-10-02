import express from "express";
import cors from "cors";
import { randomUUID } from "node:crypto";
import { analysisSchema, healthSchema, infoSchema, inputSchema, riskSchema } from "./contracts.js";
import { z } from "zod";
import { ApiError, unavailable } from "./platform/errors.js";
import { authentication } from "./platform/auth.js";
import { platformRoutes } from "./platform/routes.js";

const MESSAGES = {
  400: "Invalid analysis request.",
  422: "The model could not interpret this input. Enter current symptoms in English or Bangla, separated by commas; avoid negated or historical descriptions.",
  500: "The analysis service could not complete this request.",
  503: "The analysis service is currently unavailable.",
  504: "The analysis took too long to complete. Please try again.",
};
function parseAllowedOrigins(value) {
  const origins = String(value || "").split(",").map(origin => origin.trim()).filter(Boolean);
  if (!origins.length) throw new Error("Configure at least one CORS origin");
  return new Set(origins.map(origin => {
    const url = new URL(origin);
    if (!['http:', 'https:'].includes(url.protocol) || url.origin !== origin) throw new Error("Invalid CORS origin");
    return origin;
  }));
}
class GatewayError extends ApiError {
  constructor(status, message, risk) { super(status, "ANALYSIS_ERROR", message); this.risk = risk; }
}

export function createApp({ mlUrl, timeoutMs = 20000, corsOrigin = "http://localhost:3000", fetchImpl = fetch, logger = console.info, rateLimit = 30, rateWindowMs = 60000, now = Date.now, platform = null } = {}) {
  const target = new URL(mlUrl);
  const allowedOrigins = parseAllowedOrigins(corsOrigin);
  if (!["http:", "https:"].includes(target.protocol) || target.username || target.password) throw new Error("Invalid ML service configuration");
  if (!Number.isFinite(timeoutMs) || timeoutMs < 1 || timeoutMs > 120000) throw new Error("Invalid ML timeout");
  const app = express();
  app.disable("x-powered-by");
  app.use((req, res, next) => {
    req.requestId = randomUUID();
    const started = performance.now();
    res.set({ "X-Request-ID": req.requestId, "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" });
    res.on("finish", () => logger(JSON.stringify({ requestId: req.requestId, timestamp: new Date().toISOString(),
      endpoint: ["/api/health", "/api/analyze", "/api/model-info"].includes(req.path) ? req.path : "unknown",
      processingTimeMs: Math.round(performance.now() - started), status: res.statusCode, modelVersion: res.locals.modelVersion })));
    next();
  });
  app.use(cors({ origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin)) callback(null, true);
    else callback(new GatewayError(403, "This origin is not allowed."));
  }, methods: ["GET", "POST", "PATCH", "PUT", "DELETE"], allowedHeaders: ["Content-Type", "Authorization"], exposedHeaders: ["X-Request-ID", "Retry-After"] }));
  app.use(express.json({ limit: "16kb", strict: true }));
  const requests = new Map();
  app.use("/api", (req, res, next) => {
    if (req.method === "GET" || req.method === "OPTIONS") return next();
    const time = now();
    for (const [key, entry] of requests) if (entry.expires <= time) requests.delete(key);
    const key = req.ip;
    const entry = requests.get(key) || { count: 0, expires: time + rateWindowMs };
    if (entry.count >= rateLimit || (!requests.has(key) && requests.size >= 10000)) {
      res.set("Retry-After", String(Math.max(1, Math.ceil((entry.expires - time) / 1000))));
      return next(new GatewayError(429, "Too many analysis requests. Please wait a minute and try again."));
    }
    entry.count += 1;
    requests.set(key, entry);
    next();
  });

  async function upstream(path, req, body, schema, allowDegraded = false) {
    let response, payload;
    try {
      response = await fetchImpl(new URL(path, target), {
        method: body ? "POST" : "GET", headers: { "Content-Type": "application/json", "X-Request-ID": req.requestId },
        body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(timeoutMs), redirect: "error",
      });
      // Keep the timeout active until the response body has been consumed.
      payload = await response.json();
    } catch (error) {
      if (error instanceof SyntaxError) throw new GatewayError(502, "The analysis service returned an invalid response.");
      const timedOut = ["TimeoutError", "AbortError"].includes(error.name);
      throw new GatewayError(timedOut ? 504 : 503, MESSAGES[timedOut ? 504 : 503]);
    }
    if (!response.ok && !(allowDegraded && response.status === 503)) {
      const status = [400, 422, 503].includes(response.status) ? response.status : 502;
      const risk = riskSchema.safeParse(payload?.risk);
      throw new GatewayError(status, MESSAGES[status] || "The analysis service returned an invalid response.", risk.success ? risk.data : undefined);
    }
    const parsed = schema.safeParse(payload);
    if (!parsed.success) throw new GatewayError(502, "The analysis service returned an invalid response.");
    return parsed.data;
  }

  app.get("/api/health", async (req, res, next) => {
    try {
      const ml = await upstream("/health", req, null, healthSchema, true);
      res.status(ml.modelLoaded ? 200 : 503).json({ status: ml.modelLoaded ? "ok" : "degraded", backendAvailable: true, mlAvailable: true, ml, requestId: req.requestId });
    } catch {
      res.status(503).json({ status: "degraded", backendAvailable: true, mlAvailable: false, requestId: req.requestId });
    }
  });
  app.get("/api/model-info", async (req, res) => {
    const info = await upstream("/model-info", req, null, infoSchema);
    res.locals.modelVersion = info.version;
    res.json({ ...info, requestId: req.requestId });
  });
  app.use("/api", platformRoutes(platform, { modelInfo: req => upstream("/model-info", req, null, infoSchema), mlHealth: req => upstream("/health", req, null, healthSchema, true) }));
  app.post(["/api/analyze", "/api/analyses"], authentication(platform).requireAuth, async (req, res) => {
    if (!req.is("application/json")) throw new GatewayError(415, "Use application/json.");
    const parsed = inputSchema.extend({ disclaimerAccepted: z.literal(true) }).safeParse(req.body);
    if (!parsed.success) throw new GatewayError(422, "Enter 1–2000 characters of English or Bangla symptoms, choose language en or bn, and accept the decision-support and storage notice.");
    if (!(await platform.store.settings()).analysisEnabled) throw new ApiError(503, "ANALYSIS_PAUSED", "New analyses are temporarily paused. Existing history remains available.");
    const { disclaimerAccepted, ...input } = parsed.data;
    const result = await upstream("/analyze", req, input, analysisSchema);
    res.locals.modelVersion = result.model.version;
    let saved;
    try { saved = await platform.store.saveAnalysis(req.user, result); }
    catch (error) { const failure = error instanceof ApiError ? error : unavailable(); failure.risk = result.risk; throw failure; }
    res.json({ ...result, ...saved, requestId: req.requestId });
  });
  app.use((req, res) => res.status(404).json({ success: false, requestId: req.requestId, error: { message: "Endpoint not found." } }));
  app.use((error, req, res, next) => {
    const database = error.name?.startsWith("Mongo");
    const status = error instanceof ApiError ? error.status : error.code === 11000 ? 409 : database ? 503 : error.type === "entity.too.large" ? 413 : error.type === "entity.parse.failed" ? 400 : 500;
    const message = error instanceof ApiError ? error.message : status === 409 ? "An account with this email already exists. Contact an administrator." : database ? "Database services are temporarily unavailable." : status === 413 ? "Request body is too large." : status === 400 ? "Malformed JSON." : MESSAGES[500];
    res.status(status).json({ success: false, requestId: req.requestId, error: { message, code: error instanceof ApiError ? error.code : database ? "DATABASE_UNAVAILABLE" : "REQUEST_FAILED" }, ...(error.risk ? { risk: error.risk } : {}) });
  });
  return app;
}
