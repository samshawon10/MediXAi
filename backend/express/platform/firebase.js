import { applicationDefault, cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

export function firebaseAdmin(env = process.env) {
  if (!env.FIREBASE_PROJECT_ID) throw new Error("Firebase project not configured");
  if (Boolean(env.FIREBASE_CLIENT_EMAIL) !== Boolean(env.FIREBASE_PRIVATE_KEY)) throw new Error("Firebase service-account credential is incomplete");
  if (env.FIREBASE_AUTH_EMULATOR_HOST && (env.NODE_ENV === "production" || !/^(localhost|127\.0\.0\.1):\d+$/.test(env.FIREBASE_AUTH_EMULATOR_HOST))) throw new Error("Unsafe emulator configuration");
  const credential = env.FIREBASE_CLIENT_EMAIL && env.FIREBASE_PRIVATE_KEY
    ? cert({ projectId: env.FIREBASE_PROJECT_ID, clientEmail: env.FIREBASE_CLIENT_EMAIL, privateKey: env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n") })
    : env.FIREBASE_AUTH_EMULATOR_HOST ? undefined : applicationDefault();
  const app = getApps().find(a => a.name === "medixai") || initializeApp({ projectId: env.FIREBASE_PROJECT_ID, credential }, "medixai");
  return getAuth(app);
}
