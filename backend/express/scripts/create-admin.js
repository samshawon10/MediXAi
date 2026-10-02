import { firebaseAdmin } from "../platform/firebase.js";
import { connectStore } from "../platform/store.js";

const [kind, value] = process.argv.slice(2);
if (!["--uid", "--email"].includes(kind) || !value) {
  console.error("Usage: npm run create-admin -- --uid FIREBASE_UID (or --email EMAIL)"); process.exitCode = 1;
} else {
  let store;
  try {
    const auth = firebaseAdmin();
    const identity = kind === "--uid" ? await auth.getUser(value) : await auth.getUserByEmail(value);
    if (identity.disabled) throw new Error("Inactive Firebase identity");
    store = await connectStore();
    const user = await store.seedAdmin(identity);
    console.info(JSON.stringify({ event: "admin_seeded", uid: user.uid, role: user.role }));
  } catch { console.error("Admin setup failed. Check the Firebase account, credentials, and MongoDB replica set. No private error details are displayed."); process.exitCode = 1; }
  finally { await store?.client.close(); }
}
