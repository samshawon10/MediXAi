import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { confirmPasswordReset, createUserWithEmailAndPassword, GoogleAuthProvider, sendPasswordResetEmail, signInWithEmailAndPassword, signInWithPopup, updateProfile, verifyPasswordResetCode } from "firebase/auth";
import { firebaseAuth, googleEnabled } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { usePreferences } from "@/context/PreferencesContext";
import { Activity, ArrowUpRight, LockKeyhole, ShieldCheck, Eye, EyeOff } from "lucide-react";

export function safeDestination(value, admin = false) {
  return typeof value === "string" && /^\/(dashboard|admin)(\/|$)/.test(value) && !/[\\\x00-\x20]/.test(value) && !value.includes("//") ? value : admin ? "/admin" : "/dashboard";
}
export function accountError(error) {
  const code = error?.code || "";
  if (["AUTH_REQUIRED", "AUTH_INVALID"].includes(code)) return "account.required";
  if (["ACCOUNT_DISABLED", "FORBIDDEN", "auth/user-disabled"].includes(code)) return "account.blocked";
  if (["auth/invalid-credential", "auth/wrong-password", "auth/user-not-found", "auth/invalid-email"].includes(code)) return "account.invalid";
  if (["auth/email-already-in-use", "DUPLICATE_ACCOUNT"].includes(code)) return "account.exists";
  if (["auth/expired-action-code", "auth/invalid-action-code"].includes(code)) return "account.expired";
  if (["auth/weak-password", "auth/password-does-not-meet-requirements"].includes(code)) return "account.mismatch";
  if (code === "auth/operation-not-allowed") return "account.googleUnavailable";
  if (code === "auth/unauthorized-domain") return "account.domainUnauthorized";
  if (["auth/configuration-not-found", "auth/configuration-unavailable", "auth/invalid-api-key", "auth/app-not-authorized"].includes(code)) return "account.configurationError";
  if (code.includes("popup") || code.includes("cancelled")) return "account.popup";
  if (code.includes("too-many") || error?.status === 429) return "account.rate";
  return "account.unavailable";
}
export default function AccountPage({ mode }) {
  const { t } = usePreferences(), { user, refreshUser } = useAuth(), router = useRouter();
  const [busy, setBusy] = useState(false), [error, setError] = useState(""), [notice, setNotice] = useState(""), [resetReady, setResetReady] = useState(false);
  const [name, setName] = useState(""), [email, setEmail] = useState(""), [password, setPassword] = useState(""), [confirm, setConfirm] = useState(""), [showPassword, setShowPassword] = useState(false), [acceptedTerms, setAcceptedTerms] = useState(false);
  const title = `account.${mode === "forgot" ? "forgot" : mode}`;
  const canUseGoogle = googleEnabled && ["login", "register"].includes(mode);
  const isRegistration = mode === "register";
  useEffect(() => { if (user && ["login", "register"].includes(mode)) router.replace(safeDestination(router.query.next, user.role === "ADMIN")); }, [user, mode, router]);
  useEffect(() => {
    if (mode !== "reset" || !router.isReady) return;
    let live = true;
    if (typeof router.query.oobCode !== "string") { setError("account.resetHint"); return; }
    firebaseAuth().then(auth => verifyPasswordResetCode(auth, router.query.oobCode)).then(() => { if (live) setResetReady(true); }).catch(e => { if (live) setError(accountError(e)); });
    return () => { live = false; };
  }, [mode, router.isReady, router.query.oobCode]);
  async function submit(event, google = false) {
    event?.preventDefault(); if (busy) return;
    setError(""); setNotice("");
    if (!google && ["register", "reset"].includes(mode) && (password !== confirm || password.length < 6)) { setError("account.mismatch"); return; }
    if (!google && isRegistration && !name.trim()) { setError("account.nameRequired"); return; }
    if (isRegistration && !acceptedTerms) { setError("account.termsRequired"); return; }
    setBusy(true);
    try {
      const auth = await firebaseAuth();
      if (google) { const provider = new GoogleAuthProvider(); provider.setCustomParameters({ prompt: "select_account" }); await signInWithPopup(auth, provider); }
      else if (mode === "login") await signInWithEmailAndPassword(auth, email, password);
      else if (mode === "register") { const credential = await createUserWithEmailAndPassword(auth, email, password); await updateProfile(credential.user, { displayName: name.trim().slice(0, 100) }); }
      else if (mode === "forgot") {
        try { await sendPasswordResetEmail(auth, email); } catch (e) { if (e.code !== "auth/user-not-found") throw e; }
        setNotice("account.checkEmail"); return;
      } else { await confirmPasswordReset(auth, router.query.oobCode, password); setNotice("account.resetDone"); setResetReady(false); return; }
      const profile = await refreshUser(true);
      if (profile) await router.replace(safeDestination(router.query.next, profile.role === "ADMIN"));
    } catch (e) { setError(accountError(e)); }
    finally { setBusy(false); setPassword(""); setConfirm(""); }
  }
  return <section className="section account-section"><Head><title>{t(title)} · MediXAI</title></Head><div className="account-layout container"><aside className="account-intro"><span className="eyebrow">MediXAI · {t("home.trust1")}</span><h1>{t(title)}</h1><p>{t("account.hint")}</p><div className="account-art" aria-hidden="true"><div className="account-art__orbit" /><div className="account-art__core"><Activity size={54} strokeWidth={1.3} /></div><span className="account-art__badge"><ShieldCheck size={22} /></span><span className="account-art__badge account-art__badge--second"><LockKeyhole size={20} /></span></div><ul className="account-benefits"><li>{t("account.benefitPrivate")}</li><li>{t("account.benefitControl")}</li><li>{t("account.benefitSafe")}</li></ul><Link href="/privacy">{t("dash.privacy")} <ArrowUpRight size={16} aria-hidden="true" /></Link></aside><div className="card account-form">
    <header className="account-form__header"><span className="account-mark" aria-hidden="true">+</span><div><p className="eyebrow">{isRegistration ? t("account.newHere") : t("account.welcomeBack")}</p><h2>{t(title)}</h2><p>{t(isRegistration ? "account.registerLead" : "account.loginLead")}</p></div></header>
    {canUseGoogle && <><button type="button" className="btn google-button" disabled={busy} onClick={e => submit(e, true)}><GoogleIcon />{t("account.google")}</button><div className="auth-divider"><span>{t("account.or")}</span></div></>}
    <form onSubmit={submit}><fieldset disabled={busy} className="analysis-fields stack-lg"><legend className="visually-hidden">{t(title)}</legend>
      {mode === "register" && <label className="field">{t("account.name")}<input className="input" autoComplete="name" required maxLength={100} value={name} onChange={e => setName(e.target.value)} /></label>}
      {mode !== "reset" && <label className="field">{t("account.email")}<input className="input" type="email" autoComplete="email" required maxLength={254} value={email} onChange={e => setEmail(e.target.value)} /></label>}
      {mode !== "forgot" && <><label className="field">{t("account.password")}<span className="password-control"><input className="input" type={showPassword ? "text" : "password"} autoComplete={mode === "login" ? "current-password" : "new-password"} required minLength={mode === "login" ? undefined : 6} maxLength={128} value={password} onChange={e => setPassword(e.target.value)} /><button type="button" className="password-toggle" aria-label={t(showPassword ? "account.hidePassword" : "account.showPassword")} aria-pressed={showPassword} onClick={() => setShowPassword(value => !value)}>{showPassword ? <EyeOff size={19} aria-hidden="true" /> : <Eye size={19} aria-hidden="true" />}</button></span></label>{mode !== "login" && <><p className="small muted">{t("account.passwordHint")}</p><label className="field">{t("account.confirm")}<input className="input" type={showPassword ? "text" : "password"} autoComplete="new-password" required minLength={6} maxLength={128} value={confirm} onChange={e => setConfirm(e.target.value)} /></label></>}</>}
      {isRegistration && <label className="history-consent"><input type="checkbox" checked={acceptedTerms} onChange={event => setAcceptedTerms(event.target.checked)} required />{t("account.terms")}</label>}
      {error && <p role="alert" className="platform-error">{t(error)}</p>}{notice && <p role="status" className="platform-notice">{t(notice)}</p>}
      <button className="btn btn-primary" disabled={mode === "reset" && !resetReady}>{busy ? t("dash.loading") : t(mode === "forgot" ? "account.continue" : title)}</button>
    </fieldset></form>
    <div className="account-links">{mode === "login" ? <><span>{t("account.noAccount")}</span><Link href="/register">{t("account.register")}</Link><Link href="/forgot-password">{t("account.forgot")}</Link></> : mode === "register" ? <><span>{t("account.haveAccount")}</span><Link href="/login">{t("account.login")}</Link></> : <Link href="/login">{t("account.backToLogin")}</Link>}</div>
  </div></div></section>;
}

function GoogleIcon() {
  return <svg className="google-icon" viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M21.8 12.23c0-.71-.06-1.4-.18-2.05H12v3.88h5.5a4.7 4.7 0 0 1-2.04 3.08v2.52h3.25c1.9-1.75 3.09-4.32 3.09-7.43Z"/><path fill="#34A853" d="M12 22c2.75 0 5.06-.91 6.75-2.34l-3.25-2.52c-.9.6-2.05.96-3.5.96-2.65 0-4.9-1.79-5.7-4.2H3.04v2.6A10.2 10.2 0 0 0 12 22Z"/><path fill="#FBBC05" d="M6.3 13.9A6.1 6.1 0 0 1 6 12c0-.66.11-1.3.3-1.9V7.5H3.04A10.2 10.2 0 0 0 3.04 16.5l3.26-2.6Z"/><path fill="#EA4335" d="M12 5.9c1.58 0 3 .54 4.12 1.6l3.1-3.1C17.05 2.38 14.75 1 12 1a10.2 10.2 0 0 0-8.96 5.5l3.26 2.6c.8-2.4 3.05-4.2 5.7-4.2Z"/></svg>;
}
