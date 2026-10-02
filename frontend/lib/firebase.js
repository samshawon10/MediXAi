import { getApps, initializeApp } from "firebase/app";
import { browserLocalPersistence, connectAuthEmulator, getAuth, setPersistence } from "firebase/auth";

let ready;
export function firebaseAuth() {
  if (!ready) ready = (async () => {
    const config = {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    };
    if (!config.apiKey || !config.authDomain || !config.projectId || !config.appId) throw Object.assign(new Error("Account services are not configured."), { code: "auth/configuration-unavailable" });
    const auth = getAuth(getApps()[0] || initializeApp(config));
    const emulator = process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_URL;
    if (emulator && !auth.emulatorConfig) {
      const url = new URL(emulator);
      if (!["localhost", "127.0.0.1"].includes(url.hostname) || !["localhost", "127.0.0.1"].includes(window.location.hostname)) throw new Error("Authentication emulator requires localhost.");
      connectAuthEmulator(auth, emulator);
    }
    await setPersistence(auth, browserLocalPersistence);
    return auth;
  })().catch(error => { ready = null; throw error; });
  return ready;
}
export const googleEnabled = process.env.NEXT_PUBLIC_FIREBASE_GOOGLE_ENABLED === "true";
