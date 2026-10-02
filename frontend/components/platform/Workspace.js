import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useRef, useState } from "react";
import { BarChart3, FileText, History, LayoutDashboard, LogOut, Settings, Shield, Stethoscope, UserRound, Users } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { usePreferences } from "@/context/PreferencesContext";
import { accountError } from "./AccountPage";
import { platformRequest } from "@/services/api";

export function RequireAuth({ children, admin = false }) {
  const { loading, user, error, refreshUser, logout } = useAuth(), router = useRouter(), { t } = usePreferences();
  useEffect(() => {
    if (!loading && (!user && (!error || error.status === 401))) router.replace(`/login?next=${encodeURIComponent(router.asPath)}`);
  }, [loading, user, error, router]);
  if (loading) return <div className="container section" role="status"><p>{t("account.restore")}</p><div className="skeleton" /></div>;
  if (error?.status === 401) return <div className="container section" role="status">{t("account.required")}</div>;
  if (error) return <div className="container section"><ErrorState error={error} retry={() => refreshUser().catch(() => {})} message={accountError(error)} /><button className="btn btn-secondary" onClick={() => logout().catch(() => {}).finally(() => router.replace("/login"))}>{t("account.logout")}</button></div>;
  if (!user) return <div className="container section" role="status">{t("account.required")}</div>;
  if (admin && user.role !== "ADMIN") return <div className="container section"><h1>{t("account.denied")}</h1><Link href="/dashboard">{t("dash.title")}</Link></div>;
  return children;
}
const userLinks = [["", "dash.overview", LayoutDashboard], ["/analysis", "dash.analysis", Stethoscope], ["/history", "dash.history", History], ["/reports", "dash.reports", FileText], ["/profile", "dash.profile", UserRound], ["/settings", "dash.settings", Settings]];
const adminIcon = { users: Users, analyses: FileText, analytics: BarChart3, model: Stethoscope, system: Shield, logs: History, content: FileText, settings: Settings };
const adminLinks = [["", "dash.overview", LayoutDashboard], ...["users", "analyses", "analytics", "model", "system", "logs", "content", "settings"].map(key => [`/${key}`, `admin.${key}`, adminIcon[key]])];
export default function Workspace({ children, admin = false, title = "dash.title" }) {
  const { t } = usePreferences(), { user, isAdmin, logout } = useAuth(), router = useRouter();
  const root = admin ? "/admin" : "/dashboard";
  const identity = user?.displayName || user?.email || "M";
  return <RequireAuth admin={admin}><Head><title>{t(title)} · MediXAI</title></Head><div className={`workspace container${admin ? " workspace--admin" : ""}`}>
    <aside className="workspace-sidebar">
      <div className="workspace-brand"><Shield size={21} aria-hidden="true" /><span>MediXAI<small>{t(admin ? "admin.title" : "dash.title")}</small></span></div>
      <nav aria-label={t(admin ? "admin.title" : "dash.title")}>{(admin ? adminLinks : userLinks).map(([path, label, Icon]) => <Link key={path} href={root + path} aria-current={router.asPath.split("?")[0] === root + path ? "page" : undefined}><Icon size={18} strokeWidth={1.8} aria-hidden="true" />{t(label)}</Link>)}{isAdmin && <Link href={admin ? "/dashboard" : "/admin"}><Shield size={18} aria-hidden="true" />{t(admin ? "dash.title" : "dash.admin")}</Link>}</nav>
      <div className="workspace-identity"><span className="workspace-avatar" aria-hidden="true">{identity[0].toUpperCase()}</span><div><strong className="identity-label">{identity}</strong><small>{t(admin ? "dash.adminRole" : "dash.user")}</small></div></div>
      <button className="btn btn-secondary" onClick={() => logout().catch(() => {}).finally(() => router.replace("/login"))}><LogOut size={16} aria-hidden="true" />{t("account.logout")}</button>
    </aside>
    <div className="workspace-content"><header className="workspace-heading"><div><span className="eyebrow">{t(admin ? "admin.title" : "dash.title")}</span><h1>{t(title)}</h1></div><span className="workspace-mode"><Shield size={14} aria-hidden="true" />{t(admin ? "dash.adminRole" : "dash.user")}</span></header>{children}</div>
  </div></RequireAuth>;
}
export function useResource(path) {
  const { user } = useAuth(), [data, setData] = useState(null), [error, setError] = useState(null), [loading, setLoading] = useState(true), [version, setVersion] = useState(0);
  useEffect(() => {
    setData(null); setError(null);
    if (!path || !user) { setLoading(false); return; }
    const controller = new AbortController(); setLoading(true);
    platformRequest(path, { signal: controller.signal }).then(value => { if (!controller.signal.aborted) setData(value); }).catch(e => { if (!controller.signal.aborted) setError(e); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [path, user?.uid, version]);
  return { data, error, loading, reload: () => setVersion(n => n + 1) };
}
export function ErrorState({ error, retry, message }) {
  const { t } = usePreferences();
  return <div className="platform-error" role="alert"><p>{t(message || (error?.status === 404 ? "dash.notFound" : [401, 403].includes(error?.status) ? accountError(error) : "dash.error"))}</p><button className="btn btn-secondary" onClick={retry}>{t("dash.retry")}</button></div>;
}
export function Resource({ state, children }) {
  const { t } = usePreferences();
  if (state.loading) return <div role="status"><p>{t("dash.loading")}</p><div className="skeleton" /></div>;
  if (state.error) return <ErrorState error={state.error} retry={state.reload} />;
  if (!state.data) return null;
  return children(state.data);
}
export function Empty() { const { t } = usePreferences(); return <div className="empty"><h2>{t("dash.empty")}</h2><p>{t("dash.emptyHint")}</p></div>; }
export function Pager({ data, setPage }) {
  const { t } = usePreferences();
  return <div className="pager"><p className="small muted">{t("dash.total")}: {data.total} · {t("dash.page")} {data.page} / {Math.max(1, data.pages)}</p><button className="btn btn-secondary" disabled={data.page <= 1} onClick={() => setPage(data.page - 1)}>{t("dash.previous")}</button><button className="btn btn-secondary" disabled={data.page >= data.pages} onClick={() => setPage(data.page + 1)}>{t("dash.next")}</button></div>;
}
export function ConfirmDialog({ open, title, description, busy, onCancel, onConfirm, children }) {
  const dialog = useRef(null), { t } = usePreferences();
  useEffect(() => { if (open && !dialog.current.open) dialog.current.showModal(); if (!open && dialog.current.open) dialog.current.close(); }, [open]);
  return <dialog ref={dialog} className="platform-dialog" aria-labelledby="confirm-title" aria-describedby="confirm-description" onCancel={e => { e.preventDefault(); if (!busy) onCancel(); }}><h2 id="confirm-title">{t(title)}</h2><p id="confirm-description">{t(description)}</p>{children}<div className="result-actions"><button autoFocus className="btn btn-secondary" disabled={busy} onClick={onCancel}>{t("dash.cancel")}</button><button className="btn btn-primary" disabled={busy} onClick={onConfirm}>{t(busy ? "dash.loading" : "admin.confirm")}</button></div></dialog>;
}
export const displayDate = (value, language) => value ? new Date(value).toLocaleString(language === "bn" ? "bn-BD" : "en-GB") : "—";
export const confidence = value => typeof value === "number" ? `${(value * 100).toFixed(1)}%` : "—";
