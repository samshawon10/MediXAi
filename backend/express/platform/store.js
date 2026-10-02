import { MongoClient, ObjectId } from "mongodb";
import { ApiError } from "./errors.js";

const notFound = () => new ApiError(404, "NOT_FOUND", "The requested record was not found.");
export function objectId(value) {
  if (!/^[a-f\d]{24}$/i.test(String(value))) throw notFound();
  return new ObjectId(value);
}
const escape = value => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
export function publicUser(user) {
  const { uid, email, displayName, photoURL, role, isActive, profile, preferences, createdAt, updatedAt, lastLoginAt } = user;
  return { uid, email, displayName, photoURL, role, isActive, profile, preferences, createdAt, updatedAt, lastLoginAt };
}
const historyProjection = { userId: 0, "result.input.symptoms": 0, "result.normalizedSymptoms": 0, "result.unrecognizedSymptoms": 0, "result.explanation": 0, "result.education": 0, "result.risk.reasons": 0 };
const monitorProjection = { _id: 1, createdAt: 1, "result.input.language": 1, "result.prediction.condition": 1, "result.prediction.confidence": 1, "result.risk.level": 1, "result.model.name": 1, "result.model.version": 1 };

export class MongoStore {
  constructor(client, db) { this.client = client; this.db = db; }
  async initialize() {
    const hello = await this.db.admin().command({ hello: 1 });
    if (!hello.setName && hello.msg !== "isdbgrid") throw new Error("MongoDB replica set required for atomic writes and audits");
    await this.db.collection("users").createIndexes([{ key: { uid: 1 }, unique: true }, { key: { email: 1 }, unique: true }, { key: { createdAt: -1 } }]);
    await this.db.collection("analyses").createIndexes([{ key: { userId: 1, createdAt: -1, _id: -1 } }, { key: { createdAt: -1, _id: -1 } }]);
    await this.db.collection("reports").createIndexes([{ key: { userId: 1, analysisId: 1 }, unique: true }, { key: { userId: 1, createdAt: -1 } }]);
    await this.db.collection("auditLogs").createIndexes([{ key: { actorUid: 1, createdAt: -1 } }, { key: { createdAt: -1, _id: -1 } }]);
    await this.db.collection("systemLogs").createIndexes([{ key: { createdAt: 1 }, expireAfterSeconds: 2592000 }]);
    await this.db.collection("settings").updateOne({ _id: "platform" }, { $setOnInsert: { analysisEnabled: true, updatedAt: new Date() } }, { upsert: true });
    await this.db.collection("settings").updateOne({ _id: "security-guard" }, { $setOnInsert: { version: 0 } }, { upsert: true });
  }
  async transaction(work) {
    const session = this.client.startSession();
    try { return await session.withTransaction(() => work(session), { readConcern: { level: "snapshot" }, writeConcern: { w: "majority" } }); }
    finally { await session.endSession(); }
  }
  async audit(actor, action, targetType, targetId, metadata = {}, session) {
    await this.db.collection("auditLogs").insertOne({ actorUid: actor.uid, actorRole: actor.role, action, targetType, targetId: String(targetId), metadata, createdAt: new Date() }, { session });
  }
  async active(actor, session, admin = false) {
    const fresh = await this.db.collection("users").findOne({ uid: actor.uid }, { session });
    if (!fresh?.isActive || (admin && fresh.role !== "ADMIN")) throw new ApiError(403, "FORBIDDEN", "Account access has changed. Refresh your session.");
    return fresh;
  }
  user(uid) { return this.db.collection("users").findOne({ uid }); }
  async sync(identity, login = false) {
    if (!identity.email || identity.disabled) throw new ApiError(403, "ACCOUNT_DISABLED", "A valid active email account is required.");
    return this.transaction(async session => {
      const now = new Date(), uid = identity.uid;
      const existing = await this.db.collection("users").findOne({ uid }, { session });
      if (existing && !existing.isActive) throw new ApiError(403, "ACCOUNT_DISABLED", "This account has been deactivated.");
      const update = { email: identity.email.trim().toLowerCase(), displayName: (identity.displayName || "").slice(0, 100), photoURL: /^https:\/\//.test(identity.photoURL || "") ? identity.photoURL.slice(0, 1000) : "", updatedAt: now };
      if (login || !existing) update.lastLoginAt = now;
      const user = await this.db.collection("users").findOneAndUpdate({ uid }, {
        $set: update, $setOnInsert: { uid, role: "USER", isActive: true, profile: { firstName: "", lastName: "", preferredLanguage: "en" }, preferences: { theme: "system" }, createdAt: now },
      }, { session, upsert: true, returnDocument: "after" });
      if (login || !existing) await this.audit(user, "LOGIN", "user", uid, {}, session);
      return publicUser(user);
    });
  }
  async updateSelf(actor, kind, values) {
    return this.transaction(async session => {
      const fresh = await this.active(actor, session);
      const fields = Object.fromEntries(Object.entries(values).map(([key, value]) => [`${kind}.${key}`, value]));
      const user = await this.db.collection("users").findOneAndUpdate({ uid: actor.uid }, { $set: { ...fields, updatedAt: new Date() } }, { session, returnDocument: "after" });
      await this.audit(fresh, kind === "profile" ? "PROFILE_CHANGED" : "SETTINGS_CHANGED", "user", actor.uid, { fields: Object.keys(values) }, session);
      return publicUser(user);
    });
  }
  async logout(actor) { await this.audit(actor, "LOGOUT", "user", actor.uid); }
  async saveAnalysis(actor, result) {
    return this.transaction(async session => {
      const fresh = await this.active(actor, session);
      const settings = await this.settings(session);
      if (!settings.analysisEnabled) throw new ApiError(503, "ANALYSIS_PAUSED", "New analyses are temporarily paused. Existing history remains available.");
      const doc = { userId: actor.uid, result, disclaimerAccepted: true, consentVersion: "stored-analysis-v1", createdAt: new Date() };
      const { insertedId } = await this.db.collection("analyses").insertOne(doc, { session });
      await this.audit(fresh, "ANALYSIS_CREATED", "analysis", insertedId, { modelVersion: result.model.version }, session);
      return { analysisId: String(insertedId), createdAt: doc.createdAt };
    });
  }
  async paginated(collection, filter, query, projection) {
    const { page = 1, limit = 20, sort = "newest" } = query;
    const direction = sort === "oldest" ? 1 : -1;
    const items = await this.db.collection(collection).find(filter, { projection }).sort({ createdAt: direction, _id: direction }).skip((page - 1) * limit).limit(limit).maxTimeMS(5000).toArray();
    const total = await this.db.collection(collection).countDocuments(filter, { maxTimeMS: 5000 });
    return { items, total, page, limit, pages: Math.ceil(total / limit) };
  }
  analysisFilter(query) {
    const filter = {};
    if (query.search) filter["result.prediction.condition"] = { $regex: escape(query.search), $options: "i" };
    if (query.from || query.to) filter.createdAt = { ...(query.from ? { $gte: new Date(query.from) } : {}), ...(query.to ? { $lt: new Date(new Date(query.to).getTime() + 86400000) } : {}) };
    return filter;
  }
  analyses(uid, query) { return this.paginated("analyses", { userId: uid, ...this.analysisFilter(query) }, query, historyProjection); }
  async analysis(uid, id, session) {
    const doc = await this.db.collection("analyses").findOne({ _id: objectId(id), userId: uid }, { session, projection: { userId: 0 } });
    if (!doc) throw notFound();
    return doc;
  }
  async deleteAnalysis(actor, id) {
    return this.transaction(async session => {
      const fresh = await this.active(actor, session);
      await this.analysis(actor.uid, id, session);
      await this.db.collection("reports").deleteMany({ analysisId: objectId(id), userId: actor.uid }, { session });
      await this.db.collection("analyses").deleteOne({ _id: objectId(id), userId: actor.uid }, { session });
      await this.audit(fresh, "ANALYSIS_DELETED", "analysis", id, {}, session);
    });
  }
  async userOverview(uid) {
    const recent = await this.analyses(uid, { page: 1, limit: 5 });
    return { totalAnalyses: recent.total, recent: recent.items, totalReports: await this.db.collection("reports").countDocuments({ userId: uid }) };
  }
  reports(uid, query) { return this.paginated("reports", { userId: uid }, query, { userId: 0 }); }
  async prepareReport(actor, analysisId) {
    return this.transaction(async session => {
      const fresh = await this.active(actor, session);
      const analysis = await this.analysis(actor.uid, analysisId, session);
      const report = await this.db.collection("reports").findOneAndUpdate({ userId: actor.uid, analysisId: analysis._id }, { $setOnInsert: { createdAt: new Date(), format: "browser-pdf", condition: analysis.result.prediction.condition } }, { upsert: true, returnDocument: "after", session });
      await this.audit(fresh, "REPORT_PREPARED", "report", report._id, {}, session);
      const { userId, ...safe } = report;
      return safe;
    });
  }
  async report(uid, id) {
    const report = await this.db.collection("reports").findOne({ _id: objectId(id), userId: uid }, { projection: { userId: 0 } });
    if (!report) throw notFound();
    return { report, analysis: await this.analysis(uid, String(report.analysisId)) };
  }
  users(query) {
    const filter = {};
    if (query.search) filter.$or = ["email", "displayName"].map(key => ({ [key]: { $regex: escape(query.search), $options: "i" } }));
    if (query.role) filter.role = query.role;
    if (query.active) filter.isActive = query.active === "true";
    return this.paginated("users", filter, query, { _id: 0, uid: 1, email: 1, displayName: 1, role: 1, isActive: 1, createdAt: 1, lastLoginAt: 1 });
  }
  async changeUser(actor, uid, changes) {
    if (uid === actor.uid) throw new ApiError(409, "SELF_CHANGE", "You cannot change your own role or active status.");
    return this.transaction(async session => {
      await this.db.collection("settings").updateOne({ _id: "security-guard" }, { $inc: { version: 1 } }, { session });
      const fresh = await this.active(actor, session, true);
      const target = await this.db.collection("users").findOne({ uid }, { session });
      if (!target) throw notFound();
      if (target.role === "ADMIN" && target.isActive && (changes.role === "USER" || changes.isActive === false) && await this.db.collection("users").countDocuments({ role: "ADMIN", isActive: true }, { session }) <= 1) throw new ApiError(409, "LAST_ADMIN", "The last active administrator cannot be removed.");
      const user = await this.db.collection("users").findOneAndUpdate({ uid }, { $set: { ...changes, updatedAt: new Date() } }, { session, returnDocument: "after" });
      if (changes.role && changes.role !== target.role) await this.audit(fresh, "ROLE_CHANGED", "user", uid, { before: target.role, after: changes.role }, session);
      if (changes.isActive !== undefined && changes.isActive !== target.isActive) await this.audit(fresh, changes.isActive ? "USER_ENABLED" : "USER_DISABLED", "user", uid, {}, session);
      return publicUser(user);
    });
  }
  async seedAdmin(identity) {
    await this.sync(identity);
    return this.transaction(async session => {
      await this.db.collection("settings").updateOne({ _id: "security-guard" }, { $inc: { version: 1 } }, { session });
      const user = await this.db.collection("users").findOneAndUpdate({ uid: identity.uid }, { $set: { role: "ADMIN", isActive: true, updatedAt: new Date() } }, { session, returnDocument: "after" });
      await this.audit({ uid: "local-admin-seed", role: "ADMIN" }, "ADMIN_SEEDED", "user", identity.uid, {}, session);
      return publicUser(user);
    });
  }
  monitor(query) { return this.paginated("analyses", this.analysisFilter(query), query, monitorProjection); }
  async overview() {
    const now = Date.now(), start = new Date(new Date(now + 21600000).toISOString().slice(0, 10) + "T00:00:00+06:00");
    const values = await Promise.all([this.db.collection("users").countDocuments({}), this.db.collection("users").countDocuments({ isActive: true }), this.db.collection("analyses").countDocuments({}), this.db.collection("analyses").countDocuments({ createdAt: { $gte: start } }), this.db.collection("analyses").countDocuments({ createdAt: { $gte: new Date(now - 7 * 86400000) } })]);
    return Object.fromEntries(["totalUsers", "activeUsers", "totalAnalyses", "analysesToday", "analysesLast7Days"].map((key, i) => [key, values[i]]));
  }
  async analytics() {
    const since = new Date(Date.now() - 30 * 86400000);
    const group = (field, limit = 30) => [{ $group: { _id: field, count: { $sum: 1 } } }, { $sort: { count: -1, _id: 1 } }, { $limit: limit }];
    const rows = await this.db.collection("analyses").aggregate([{ $match: { createdAt: { $gte: since } } }, { $facet: {
      daily: [{ $group: { _id: { $dateToString: { date: "$createdAt", format: "%Y-%m-%d", timezone: "Asia/Dhaka" } }, count: { $sum: 1 } } }, { $sort: { _id: 1 } }],
      languages: group("$result.input.language", 2), conditions: group("$result.prediction.condition", 10), risks: group("$result.risk.level", 4),
    } }], { maxTimeMS: 5000 }).toArray();
    const users = await this.db.collection("users").aggregate([{ $match: { createdAt: { $gte: since } } }, { $group: { _id: { $dateToString: { date: "$createdAt", format: "%Y-%m-%d", timezone: "Asia/Dhaka" } }, count: { $sum: 1 } } }, { $sort: { _id: 1 } }], { maxTimeMS: 5000 }).toArray();
    return { ...rows[0], users, since, timezone: "Asia/Dhaka" };
  }
  logs(query) { return this.paginated("auditLogs", query.action ? { action: query.action } : {}, query); }
  async health() { try { await this.db.command({ ping: 1 }, { timeoutMS: 3000 }); return true; } catch { return false; } }
  async settings(session) { const doc = await this.db.collection("settings").findOne({ _id: "platform" }, { session }); return { analysisEnabled: doc?.analysisEnabled ?? true, updatedAt: doc?.updatedAt ?? null }; }
  async updateSettings(actor, values) {
    return this.transaction(async session => { const fresh = await this.active(actor, session, true); await this.db.collection("settings").updateOne({ _id: "platform" }, { $set: { ...values, updatedAt: new Date() } }, { session }); await this.audit(fresh, "SETTINGS_CHANGED", "platform", "platform", values, session); return this.settings(session); });
  }
  content(published = false) { return this.db.collection("content").find(published ? { published: true } : {}).limit(10).toArray(); }
  async updateContent(actor, id, values) {
    return this.transaction(async session => { const fresh = await this.active(actor, session, true); const doc = await this.db.collection("content").findOneAndUpdate({ _id: id }, { $set: { ...values, updatedAt: new Date() } }, { session, upsert: true, returnDocument: "after" }); await this.audit(fresh, "CONTENT_CHANGED", "content", id, { published: values.published }, session); return doc; });
  }
}

export async function connectStore(env = process.env) {
  if (!env.MONGODB_URI || !env.MONGODB_DB_NAME) throw new Error("MongoDB is not configured");
  const client = new MongoClient(env.MONGODB_URI, { serverSelectionTimeoutMS: 5000, connectTimeoutMS: 5000, maxPoolSize: 10 });
  try { await client.connect(); const store = new MongoStore(client, client.db(env.MONGODB_DB_NAME)); await store.initialize(); return store; }
  catch (error) { await client.close(); throw error; }
}
