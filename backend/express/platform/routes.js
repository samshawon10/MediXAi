import { Router } from "express";
import { z } from "zod";
import { authentication } from "./auth.js";
import { ApiError, unavailable } from "./errors.js";
import { publicUser } from "./store.js";

const pageSchema = z.object({ page: z.coerce.number().int().min(1).max(10000).default(1), limit: z.coerce.number().int().min(1).max(50).default(20), sort: z.enum(["newest", "oldest"]).default("newest") });
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => Number.isFinite(Date.parse(value)) && new Date(value).toISOString().startsWith(value)).optional();
const analysesQuery = pageSchema.extend({ search: z.string().trim().max(100).optional(), from: date, to: date }).strict().refine(q => !q.from || !q.to || q.from <= q.to);
const userQuery = pageSchema.extend({ search: z.string().trim().max(100).optional(), role: z.enum(["USER", "ADMIN"]).optional(), active: z.enum(["true", "false"]).optional() }).strict();
const plain = max => z.string().trim().max(max).refine(s => !/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(s));
const profileSchema = z.object({ firstName: plain(60).optional(), lastName: plain(60).optional(), preferredLanguage: z.enum(["en", "bn"]).optional() }).strict().refine(v => Object.keys(v).length > 0);
const preferencesSchema = z.object({ theme: z.enum(["light", "dark", "system"]) }).strict();
const userChange = z.object({ role: z.enum(["USER", "ADMIN"]).optional(), isActive: z.boolean().optional() }).strict().refine(v => Object.keys(v).length > 0);
const contentSchema = z.object({ en: z.object({ title: plain(100), body: plain(1500) }).strict(), bn: z.object({ title: plain(100), body: plain(1500) }).strict(), published: z.boolean() }).strict();
function parse(schema, value) { const result = schema.safeParse(value); if (!result.success) throw new ApiError(422, "INVALID_INPUT", "Check the request fields and try again."); return result.data; }
const ok = (req, res, data) => res.json({ success: true, data, requestId: req.requestId });

export function platformRoutes(platform, { modelInfo, mlHealth }) {
  const router = Router(), auth = authentication(platform), store = platform?.store;
  async function sync(req, login) {
    let identity;
    try { identity = await platform.auth.getUser(req.identity.uid); }
    catch { throw unavailable(); }
    return store.sync(identity, login);
  }
  router.get("/content", async (req, res) => {
    if (!store) throw unavailable();
    ok(req, res, await store.content(true));
  });
  router.get("/auth/me", auth.identity, async (req, res) => ok(req, res, await sync(req, false)));
  router.post("/auth/session", auth.identity, async (req, res) => { parse(z.object({}).strict(), req.body); ok(req, res, await sync(req, true)); });
  router.post("/auth/logout", auth.requireAuth, async (req, res) => { parse(z.object({}).strict(), req.body); await store.logout(req.user); ok(req, res, { loggedOut: true }); });
  router.get("/users/me", auth.requireAuth, (req, res) => ok(req, res, publicUser(req.user)));
  router.get("/users/me/overview", auth.requireAuth, async (req, res) => ok(req, res, await store.userOverview(req.user.uid)));
  router.patch("/users/me/profile", auth.requireAuth, async (req, res) => ok(req, res, await store.updateSelf(req.user, "profile", parse(profileSchema, req.body))));
  router.patch("/users/me/settings", auth.requireAuth, async (req, res) => ok(req, res, await store.updateSelf(req.user, "preferences", parse(preferencesSchema, req.body))));
  router.get("/analyses", auth.requireAuth, async (req, res) => ok(req, res, await store.analyses(req.user.uid, parse(analysesQuery, req.query))));
  router.get("/analyses/:id", auth.requireAuth, async (req, res) => ok(req, res, await store.analysis(req.user.uid, req.params.id)));
  router.delete("/analyses/:id", auth.requireAuth, async (req, res) => { await store.deleteAnalysis(req.user, req.params.id); ok(req, res, { deleted: true }); });
  router.get("/reports", auth.requireAuth, async (req, res) => ok(req, res, await store.reports(req.user.uid, parse(pageSchema.strict(), req.query))));
  router.post("/reports", auth.requireAuth, async (req, res) => { const body = parse(z.object({ analysisId: z.string() }).strict(), req.body); ok(req, res, await store.prepareReport(req.user, body.analysisId)); });
  router.get("/reports/:id", auth.requireAuth, async (req, res) => ok(req, res, await store.report(req.user.uid, req.params.id)));

  router.use("/admin", auth.requireAdmin);
  router.get("/admin/overview", async (req, res) => ok(req, res, await store.overview()));
  router.get("/admin/users", async (req, res) => ok(req, res, await store.users(parse(userQuery, req.query))));
  router.patch("/admin/users/:uid", async (req, res) => ok(req, res, await store.changeUser(req.user, req.params.uid, parse(userChange, req.body))));
  router.get("/admin/analyses", async (req, res) => ok(req, res, await store.monitor(parse(analysesQuery, req.query))));
  router.get("/admin/analytics", async (req, res) => ok(req, res, await store.analytics()));
  router.get("/admin/model", async (req, res) => ok(req, res, await modelInfo(req)));
  router.get("/admin/system", async (req, res) => {
    const database = await store.health();
    let ml = null; try { ml = await mlHealth(req); } catch {}
    ok(req, res, { backend: "operational", database: database ? "operational" : "unavailable", ml: ml ? ml.modelLoaded ? "operational" : "degraded" : "unavailable", modelArtifact: ml?.modelLoaded ? "operational" : "unavailable", shap: ml?.shapAvailable ? "operational" : "unavailable", checkedAt: new Date() });
  });
  router.get("/admin/audit-logs", async (req, res) => ok(req, res, await store.logs(parse(pageSchema.extend({ action: z.string().regex(/^[A-Z_]{1,40}$/).optional() }).strict(), req.query))));
  router.get("/admin/content", async (req, res) => ok(req, res, await store.content()));
  router.put("/admin/content/:id", async (req, res) => { const id = parse(z.enum(["platform-notice", "help"]), req.params.id); ok(req, res, await store.updateContent(req.user, id, parse(contentSchema, req.body))); });
  router.get("/admin/settings", async (req, res) => ok(req, res, await store.settings()));
  router.patch("/admin/settings", async (req, res) => ok(req, res, await store.updateSettings(req.user, parse(z.object({ analysisEnabled: z.boolean() }).strict(), req.body))));
  return router;
}
