import { test } from "node:test";
import assert from "node:assert/strict";
import { createApp } from "./app.js";

async function withApp(fetchImpl, run, options = {}) {
  const lines = [];
  const platform = { auth: { verifyIdToken: async () => ({ uid: "test-user" }) }, store: { user: async () => ({ uid: "test-user", role: "USER", isActive: true }), settings: async () => ({ analysisEnabled: true }) } };
  const app = createApp({ platform, mlUrl: "http://private.invalid:8000", fetchImpl, logger: (line) => lines.push(line), ...options });
  const server = app.listen(0, "127.0.0.1");
  await new Promise(resolve => server.once("listening", resolve));
  try { await run(`http://127.0.0.1:${server.address().port}`, lines); }
  finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
}
const post = (symptoms) => ({ method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer test-token" }, body: JSON.stringify({ symptoms, disclaimerAccepted: true }) });

test("analysis rate limit expires and does not block health", async () => {
  let time = 1000;
  await withApp(async () => Response.json({ status: "ok", modelLoaded: true, shapAvailable: true, riskEngineAvailable: true }), async base => {
    assert.equal((await fetch(base + "/api/analyze", post(""))).status, 422);
    const limited = await fetch(base + "/api/analyze", post("fever"));
    assert.equal(limited.status, 429);
    assert.equal(limited.headers.get("retry-after"), "60");
    assert.equal((await fetch(base + "/api/health")).status, 200);
    time += 60001;
    assert.equal((await fetch(base + "/api/analyze", post(""))).status, 422);
  }, { rateLimit: 1, now: () => time });
});

test("timeout remains active while reading an upstream response body", async () => {
  await withApp(async (_url, options) => ({ ok: true, json: () => new Promise((resolve, reject) => {
    options.signal.addEventListener("abort", () => reject(options.signal.reason), { once: true });
  }) }), async base => {
    assert.equal((await fetch(base + "/api/analyze", post("fever"))).status, 504);
  }, { timeoutMs: 20 });
});

test("health, privacy headers, and safe logging", async () => {
  await withApp(async () => Response.json({ status: "ok", modelLoaded: true, shapAvailable: true, riskEngineAvailable: true, privatePath: "secret" }), async (base, logs) => {
    const res = await fetch(base + "/api/health");
    assert.equal(res.status, 200);
    assert.equal(res.headers.get("cache-control"), "no-store");
    assert.equal((await res.json()).ml.privatePath, undefined);
    assert.ok(logs[0].includes("requestId"));
  });
});
test("invalid input, malformed JSON, size and CORS", async () => {
  await withApp(async () => { throw new Error("must not be called"); }, async (base) => {
    for (const text of ["", " ", "!!!", "x".repeat(2001)]) assert.equal((await fetch(base + "/api/analyze", post(text))).status, 422);
    assert.equal((await fetch(base + "/api/analyze", { ...post("fever"), body: "{" })).status, 400);
    assert.equal((await fetch(base + "/api/analyze", post("x".repeat(17000)))).status, 413);
    assert.equal((await fetch(base + "/api/health", { headers: { Origin: "https://evil.invalid" } })).status, 403);
  }, { corsOrigin: "http://localhost:3000,http://127.0.0.1:3000" });
});
test("CORS accepts each configured exact local origin", async () => {
  await withApp(async () => Response.json({ status: "ok", modelLoaded: true, shapAvailable: true, riskEngineAvailable: true }), async base => {
    const response = await fetch(base + "/api/health", { headers: { Origin: "http://127.0.0.1:3000" } });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("access-control-allow-origin"), "http://127.0.0.1:3000");
  }, { corsOrigin: "http://localhost:3000,http://127.0.0.1:3000" });
});
test("upstream failure and timeout do not expose private errors", async () => {
  for (const [name, status] of [["Error", 503], ["TimeoutError", 504]]) {
    await withApp(async () => { const e = new Error("private path/token"); e.name = name; throw e; }, async (base) => {
      const res = await fetch(base + "/api/analyze", post("fever"));
      assert.equal(res.status, status);
      assert.ok(!(await res.text()).includes("private"));
    });
  }
});
test("invalid upstream response is controlled", async () => {
  await withApp(async () => Response.json({ success: true, traceback: "secret" }), async (base) => {
    const res = await fetch(base + "/api/analyze", post("fever"));
    assert.equal(res.status, 502);
    assert.ok(!(await res.text()).includes("secret"));
  });
  await withApp(async () => new Response("<html>private error</html>"), async (base) => {
    const res = await fetch(base + "/api/analyze", post("fever"));
    assert.equal(res.status, 502);
    assert.ok(!(await res.text()).includes("private"));
  });
});
test("urgent guidance survives model failure", async () => {
  const risk = { available: true, level: "CRITICAL", score: null, urgent: true, reasons: [], guidance: "Seek immediate professional medical assistance.", limitation: "Cannot rule out an emergency." };
  await withApp(async () => Response.json({ risk, error: { message: "C:/private/model" } }, { status: 503 }), async (base, logs) => {
    const res = await fetch(base + "/api/analyze", post("blue lips"));
    assert.equal(res.status, 503);
    const data = await res.json();
    assert.equal(data.risk.level, "CRITICAL");
    assert.ok(!JSON.stringify(data).includes("private"));
    assert.ok(!logs.join().includes("blue lips"));
  });
});
