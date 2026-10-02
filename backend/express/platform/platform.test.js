import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import { connectStore } from "./store.js";
import { createApp } from "../app.js";
import { firebaseAdmin } from "./firebase.js";

let replica, store, server, base, mode = "success";
const identities = { alice: { uid: "alice", email: "alice@example.test" }, bob: { uid: "bob", email: "bob@example.test" }, admin: { uid: "admin", email: "admin@example.test" } };
// Isolated contract fixture; browser integration exercises real model output separately.
const fixture = { success: true, input: { symptoms: "fever", language: "en" }, normalizedSymptoms: ["fever"], unrecognizedSymptoms: [], prediction: { condition: "Test condition", confidence: .4, scoreType: "uncalibrated", alternatives: [] }, predictions: [{ condition: "Test condition", confidence: .4 }], model: { name: "Test model", model: "fixture", version: "test-only", classes: 2, vectorizer: "TF-IDF", limitation: "Isolated test fixture" }, explanation: { available: false, method: "SHAP", features: [], message: "Unavailable" }, risk: { available: true, level: "HIGH", score: null, urgent: true, reasons: [], guidance: "Seek professional evaluation", limitation: "Cannot rule out emergency" }, education: { available: false, condition: "Test condition", message: "Unavailable" }, disclaimer: "Test fixture, not medical information" };
before(async () => {
  replica = await MongoMemoryReplSet.create({ replSet: { count: 1 }, binary: { version: "8.0.17" } });
  store = await connectStore({ MONGODB_URI: replica.getUri(), MONGODB_DB_NAME: "medixai_isolated_tests" });
  for (const id of Object.values(identities)) await store.sync(id);
  await store.seedAdmin(identities.admin);
  const auth = { verifyIdToken: async (token, revoked) => { assert.equal(revoked, true); if (!identities[token]) throw new Error("invalid token secret"); return { uid: token, role: "ADMIN" }; }, getUser: async uid => identities[uid] };
  const app = createApp({ mlUrl: "http://test.invalid", platform: { auth, store }, rateLimit: 1000, logger: () => {}, fetchImpl: async (_url, options) => {
    if (mode === "unavailable") throw new Error("private failure");
    if (mode === "malformed") return Response.json({ success: true });
    assert.equal(JSON.parse(options.body).disclaimerAccepted, undefined);
    return Response.json(fixture);
  } });
  server = app.listen(0, "127.0.0.1"); await new Promise(resolve => server.once("listening", resolve)); base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => { if (server) { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); } await store?.client.close(); await replica?.stop(); });
async function api(path, uid = "alice", method = "GET", body) {
  const res = await fetch(base + "/api" + path, { method, headers: { "Content-Type": "application/json", ...(uid ? { Authorization: `Bearer ${uid}` } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
  return { status: res.status, body: await res.json() };
}
const input = { symptoms: "fever", language: "en", disclaimerAccepted: true };
test("partial Firebase service-account configuration fails closed before any network access", () => {
  assert.throws(() => firebaseAdmin({ FIREBASE_PROJECT_ID: "test-project", FIREBASE_CLIENT_EMAIL: "admin@example.test" }), /incomplete/);
  assert.throws(() => firebaseAdmin({ FIREBASE_PROJECT_ID: "test-project", FIREBASE_PRIVATE_KEY: "not-a-key" }), /incomplete/);
});
test("missing/invalid identity is rejected; token role is never trusted", async () => {
  assert.equal((await api("/analyses", null)).status, 401);
  assert.equal((await api("/analyses", "forged")).status, 401);
  assert.equal((await api("/admin/users")).status, 403);
  assert.equal((await api("/admin/users", "admin")).status, 200);
});
test("sync is idempotent and roles cannot be supplied through signup or profile", async () => {
  assert.equal((await api("/auth/session", "alice", "POST", { role: "ADMIN" })).status, 422);
  assert.equal((await api("/users/me/profile", "alice", "PATCH", { role: "ADMIN" })).status, 422);
  for (let i = 0; i < 2; i++) assert.equal((await api("/auth/session", "alice", "POST", {})).body.data.role, "USER");
  assert.equal(await store.db.collection("users").countDocuments({ uid: "alice" }), 1);
});
test("completed analysis persists full result and atomic audit without storing password", async () => {
  const res = await api("/analyze", "alice", "POST", input);
  assert.equal(res.status, 200); assert.match(res.body.analysisId, /^[a-f0-9]{24}$/);
  const record = (await api(`/analyses/${res.body.analysisId}`)).body.data;
  assert.deepEqual(record.result, fixture); assert.equal(record.consentVersion, "stored-analysis-v1");
  assert.equal(await store.db.collection("auditLogs").countDocuments({ action: "ANALYSIS_CREATED", targetId: res.body.analysisId }), 1);
  assert.equal(JSON.stringify(await store.user("alice")).includes("password"), false);
});
test("ownership protects lists, details, deletion and reports even from admin", async () => {
  const id = (await api("/analyses", "alice", "POST", input)).body.analysisId;
  for (const who of ["bob", "admin"]) {
    assert.equal((await api(`/analyses/${id}`, who)).status, 404);
    assert.equal((await api(`/analyses/${id}`, who, "DELETE")).status, 404);
    assert.equal((await api("/reports", who, "POST", { analysisId: id })).status, 404);
  }
  assert.equal((await api("/analyses", "bob")).body.data.total, 0);
  const report = (await api("/reports", "alice", "POST", { analysisId: id })).body.data;
  assert.equal(report.format, "browser-pdf"); assert.equal(report.url, undefined);
  assert.equal((await api(`/reports/${report._id}`, "bob")).status, 404);
  assert.equal((await api(`/reports/${report._id}`)).status, 200);
  await api(`/analyses/${id}`, "alice", "DELETE");
  assert.equal((await api(`/reports/${report._id}`)).status, 404);
});
test("missing consent, malformed IDs and owner injection are rejected", async () => {
  assert.equal((await api("/analyze", "alice", "POST", { symptoms: "fever" })).status, 422);
  assert.equal((await api("/analyze", "alice", "POST", { ...input, userId: "bob" })).status, 422);
  assert.equal((await api("/analyses/not-an-id")).status, 404);
  assert.equal((await api("/analyses?userId=bob")).status, 422);
  assert.equal((await api("/analyses?from=2026-02-30")).status, 422);
  assert.equal((await api("/analyses?limit=1000")).status, 422);
});
test("ML failures never produce stored analyses", async () => {
  const count = await store.db.collection("analyses").countDocuments();
  try { for (const value of ["unavailable", "malformed"]) { mode = value; assert.equal((await api("/analyze", "alice", "POST", input)).status, value === "unavailable" ? 503 : 502); } }
  finally { mode = "success"; }
  assert.equal(await store.db.collection("analyses").countDocuments(), count);
});
test("database write failure retains urgent risk but never claims analysis was saved", async () => {
  const save = store.saveAnalysis; store.saveAnalysis = async () => { throw new Error("secret database details"); };
  try { const res = await api("/analyze", "alice", "POST", input); assert.equal(res.status, 503); assert.equal(res.body.risk.level, "HIGH"); assert.equal(res.body.analysisId, undefined); assert.ok(!JSON.stringify(res).includes("secret")); }
  finally { store.saveAnalysis = save; }
});
test("admin monitoring and audits exclude symptoms and user identifiers from analysis rows", async () => {
  const rows = (await api("/admin/analyses", "admin")).body.data.items;
  assert.ok(rows.length);
  for (const row of rows) { assert.equal(row.userId, undefined); assert.equal(row.result.input.symptoms, undefined); assert.equal(row.result.explanation, undefined); }
  const logs = (await api("/admin/audit-logs", "admin")).body.data.items;
  assert.ok(!JSON.stringify(logs).includes("fever"));
});
test("disabled accounts lose access immediately with existing token; changes are audited", async () => {
  assert.equal((await api("/admin/users/alice", "admin", "PATCH", { isActive: false })).status, 200);
  assert.equal((await api("/analyses")).status, 403);
  assert.equal((await api("/auth/me")).status, 403);
  await api("/admin/users/alice", "admin", "PATCH", { isActive: true });
  assert.equal((await api("/analyses")).status, 200);
  assert.equal(await store.db.collection("auditLogs").countDocuments({ action: "USER_DISABLED", targetId: "alice" }), 1);
});
test("self role/status changes are blocked and demotion takes effect immediately", async () => {
  assert.equal((await api("/admin/users/admin", "admin", "PATCH", { role: "USER" })).status, 409);
  assert.equal((await api("/admin/users/bob", "admin", "PATCH", { role: "SUPERADMIN" })).status, 422);
  await api("/admin/users/bob", "admin", "PATCH", { role: "ADMIN" });
  assert.equal((await api("/admin/users", "bob")).status, 200);
  await api("/admin/users/bob", "admin", "PATCH", { role: "USER" });
  assert.equal((await api("/admin/users", "bob")).status, 403);
});
test("platform pause blocks new results but keeps history accessible", async () => {
  await api("/admin/settings", "admin", "PATCH", { analysisEnabled: false });
  assert.equal((await api("/analyze", "alice", "POST", input)).status, 503);
  assert.equal((await api("/analyses")).status, 200);
  await api("/admin/settings", "admin", "PATCH", { analysisEnabled: true });
});
test("profile preferences persist with strict allowlists", async () => {
  assert.equal((await api("/users/me/settings", "alice", "PATCH", { theme: "system" })).status, 200);
  assert.equal((await api("/users/me/profile", "alice", "PATCH", { firstName: "Example", preferredLanguage: "bn" })).body.data.profile.preferredLanguage, "bn");
  assert.equal((await api("/users/me/profile", "alice", "PATCH", { email: "other@example.test" })).status, 422);
});
test("actual aggregate counts and content publication controls", async () => {
  const overview = (await api("/admin/overview", "admin")).body.data;
  assert.equal(overview.totalUsers, 3); assert.equal(overview.totalAnalyses, await store.db.collection("analyses").countDocuments());
  const content = { en: { title: "Test notice", body: "Test operational notice" }, bn: { title: "পরীক্ষা", body: "পরীক্ষার নোটিশ" }, published: false };
  await api("/admin/content/platform-notice", "admin", "PUT", content);
  assert.equal((await api("/content", null)).body.data.length, 0);
  await api("/admin/content/platform-notice", "admin", "PUT", { ...content, published: true });
  assert.equal((await api("/content", null)).body.data.length, 1);
  assert.equal((await api("/admin/content/platform-notice", "alice", "PUT", content)).status, 403);
});
