import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { onIdTokenChanged, signOut } from "firebase/auth";
import { firebaseAuth } from "@/lib/firebase";
import { platformRequest } from "@/services/api";
import { usePreferences } from "./PreferencesContext";

const AuthContext = createContext(null);
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null), [loading, setLoading] = useState(true), [error, setError] = useState(null);
  const identity = useRef(null), revision = useRef(0), applied = useRef(null);
  const preferences = usePreferences();
  const prefs = useRef(preferences); prefs.current = preferences;
  const refreshUser = useCallback(async (login = false) => {
    const version = ++revision.current;
    setLoading(true); setError(null);
    try {
      const profile = await platformRequest(login ? "/auth/session" : "/auth/me", login ? { method: "POST", body: {} } : {});
      if (version !== revision.current) return;
      setUser(profile);
      if (applied.current !== profile.uid) {
        prefs.current.setLanguage(profile.profile?.preferredLanguage || "en");
        prefs.current.setTheme(profile.preferences?.theme || "system");
        applied.current = profile.uid;
      }
      return profile;
    } catch (e) {
      if (version === revision.current) {
        setUser(null);
        setError(e);
        if (e?.status === 401) await signOut(await firebaseAuth());
      }
      throw e;
    }
    finally { if (version === revision.current) setLoading(false); }
  }, []);
  useEffect(() => {
    let unsubscribe, disposed = false;
    firebaseAuth().then(auth => {
      if (disposed) return;
      unsubscribe = onIdTokenChanged(auth, account => {
        identity.current = account;
        if (!account) { ++revision.current; setUser(null); setError(null); setLoading(false); applied.current = null; return; }
        refreshUser().catch(() => {});
      });
    }).catch(e => { if (!disposed) { setError(e); setLoading(false); } });
    return () => { disposed = true; ++revision.current; unsubscribe?.(); };
  }, [refreshUser]);
  const logout = useCallback(async () => {
    try { if (identity.current) await platformRequest("/auth/logout", { method: "POST", body: {} }); }
    finally { await signOut(await firebaseAuth()); ++revision.current; setUser(null); setError(null); applied.current = null; }
  }, []);
  return <AuthContext.Provider value={{ user, loading, error, refreshUser, logout, isAuthenticated: !!user, isAdmin: user?.role === "ADMIN", role: user?.role }}>{children}</AuthContext.Provider>;
}
export const useAuth = () => useContext(AuthContext);
