import { createApp } from "./app.js";
import { firebaseAdmin } from "./platform/firebase.js";
import { connectStore } from "./platform/store.js";

if (!process.env.ML_SERVICE_URL) throw new Error("Set ML_SERVICE_URL in backend/express/.env; see .env.example.");
const port = Number(process.env.PORT || 5000);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("Invalid PORT");
let platform = null;
try { const auth = firebaseAdmin(); const store = await connectStore(); platform = { auth, store }; }
catch { console.error(JSON.stringify({ event: "account_services_unavailable", hint: "Check Firebase and MongoDB configuration; replica set required. Protected routes remain closed." })); }
const app = createApp({ platform, mlUrl: process.env.ML_SERVICE_URL, timeoutMs: Number(process.env.ML_TIMEOUT_MS || 20000), corsOrigin: process.env.CORS_ORIGIN || "http://localhost:3000" });
const server = app.listen(port, process.env.HOST || "127.0.0.1", () => console.info(JSON.stringify({ event: "gateway_started", port })));
async function stop() { server.close(); await platform?.store.client.close(); }
process.on("SIGTERM", stop); process.on("SIGINT", stop);
