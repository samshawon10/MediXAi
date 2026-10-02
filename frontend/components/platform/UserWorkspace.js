import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { usePreferences } from "@/context/PreferencesContext";
import { platformRequest } from "@/services/api";
import Workspace, { useResource, Resource, Empty, Pager, ConfirmDialog, ErrorState, displayDate, confidence } from "./Workspace";
import PreferenceControls from "@/components/PreferenceControls";
import Disclaimer from "@/components/Disclaimer";
import AnalysisReport from "@/components/AnalysisReport";
import { ArrowUpRight } from "lucide-react";
import SimpleResults from "@/components/SimpleResults";

export function RecordTable({ items, admin = false, onDelete }) {
  const { t, language } = usePreferences();
  if (!items.length) return <Empty />;
  return <div className="table-scroll"><table className="data-table"><caption className="visually-hidden">{t(admin ? "admin.analyses" : "dash.history")}</caption><thead><tr>{["dash.date", "dash.condition", "dash.confidence", "dash.risk", ...(!admin ? ["admin.action"] : [])].map(k => <th key={k}>{t(k)}</th>)}</tr></thead><tbody>{items.map(item => <tr key={item._id} data-analysis-id={item._id}><td>{displayDate(item.createdAt, language)}</td><td>{item.result.prediction.condition}</td><td>{confidence(item.result.prediction.confidence)}</td><td>{t(item.result.risk.level === "UNAVAILABLE" ? "result.riskUnavailable" : `risk.${item.result.risk.level.toLowerCase()}`)}</td>{!admin && <td><div className="table-actions"><Link href={`/dashboard/history/${item._id}`}>{t("dash.view")}</Link>{onDelete && <button className="btn btn-secondary" onClick={() => onDelete(item)}>{t("dash.delete")}</button>}</div></td>}</tr>)}</tbody></table></div>;
}
export function Overview() {
  const state = useResource("/users/me/overview"), notices = useResource("/content"), { t, language } = usePreferences();
  return <Workspace><p className="muted">{t("dash.welcome")}</p>{notices.data?.map(item => <aside key={item._id} className="platform-notice"><h2>{item[language].title}</h2><p>{item[language].body}</p></aside>)}<Resource state={state}>{data => <><div className="metric-grid"><Metric label={t("dash.saved")} value={data.totalAnalyses} /><Metric label={t("dash.reports")} value={data.totalReports} /></div><div className="result-actions"><Link className="btn btn-primary" href="/dashboard/analysis">{t("dash.analysis")} →</Link><Link className="btn btn-secondary" href="/dashboard/history">{t("dash.history")}</Link></div><h2>{t("dash.recent")}</h2><RecordTable items={data.recent} /><Disclaimer /></>}</Resource></Workspace>;
}
export function Metric({ label, value }) { return <div className="metric"><div className="metric-heading"><p className="small muted">{label}</p><ArrowUpRight size={17} aria-hidden="true" /></div><strong>{value ?? "—"}</strong></div>; }
export function Filters({ apply, users = false }) {
  const { t } = usePreferences();
  return <form className="filters" onSubmit={e => { e.preventDefault(); apply(Object.fromEntries([...new FormData(e.currentTarget)].filter(([, value]) => value))); }}>
    <label className="field filter-search">{t(users ? "admin.userSearch" : "dash.search")}<input name="search" className="input" maxLength={100} type="search" /></label>
    {users ? <><label className="field">{t("admin.role")}<select name="role" className="select"><option value="">{t("admin.all")}</option><option value="USER">{t("dash.user")}</option><option value="ADMIN">{t("dash.adminRole")}</option></select></label><label className="field">{t("admin.status")}<select name="active" className="select"><option value="">{t("admin.all")}</option><option value="true">{t("admin.active")}</option><option value="false">{t("admin.inactive")}</option></select></label></> : <>{["from", "to"].map(k => <label key={k} className="field">{t(`dash.${k}`)}<input name={k} className="input" type="date" /></label>)}</>}
    <label className="field">{t("dash.sort")}<select name="sort" className="select"><option value="newest">{t("dash.newest")}</option><option value="oldest">{t("dash.oldest")}</option></select></label><button className="btn btn-secondary">{t("dash.apply")}</button></form>;
}
export function History({ admin = false }) {
  const [page, setPage] = useState(1), [filters, setFilters] = useState({}), [selected, setSelected] = useState(null), [busy, setBusy] = useState(false), [error, setError] = useState(null), { t } = usePreferences();
  const state = useResource(`${admin ? "/admin" : ""}/analyses?${new URLSearchParams({ ...filters, page, limit: 10 })}`);
  async function remove() { setBusy(true); setError(null); try { await platformRequest(`/analyses/${selected._id}`, { method: "DELETE" }); setSelected(null); setPage(1); state.reload(); } catch (e) { setError(e); } finally { setBusy(false); } }
  return <Workspace admin={admin} title={admin ? "admin.analyses" : "dash.history"}>{admin && <p className="muted">{t("admin.anonymous")}</p>}<Filters apply={value => { setFilters(value); setPage(1); }} /><Resource state={state}>{data => <><RecordTable items={data.items} admin={admin} onDelete={setSelected} /><Pager data={data} setPage={setPage} /></>}</Resource><ConfirmDialog open={!!selected} title="dash.deleteTitle" description="dash.deleteHint" busy={busy} onCancel={() => { setSelected(null); setError(null); }} onConfirm={remove}>{error && <p role="alert">{t("dash.saveError")}</p>}</ConfirmDialog></Workspace>;
}
export function ReportButton({ result }) {
  const { t } = usePreferences(), [busy, setBusy] = useState(false), [error, setError] = useState(false);
  async function prepare() { setBusy(true); setError(false); try { await platformRequest("/reports", { body: { analysisId: result.analysisId } }); window.print(); } catch { setError(true); } finally { setBusy(false); } }
  return <div className="report-action"><button className="btn btn-secondary" disabled={busy} onClick={prepare}>{t(busy ? "dash.loading" : "report.download")} ↓</button><p className="small muted">{t("report.hint")}</p>{error && <p role="alert">{t("dash.reportError")}</p>}</div>;
}
export function Detail() {
  const router = useRouter(), state = useResource(typeof router.query.id === "string" ? `/analyses/${encodeURIComponent(router.query.id)}` : null), { t } = usePreferences();
  const result = state.data ? { ...state.data.result, analysisId: state.data._id, analyzedAt: state.data.createdAt } : null;
  return <><Workspace title="dash.detail"><Link href="/dashboard/history">← {t("dash.history")}</Link><Resource state={state}>{() => <div className="stack-xl"><div className="result-heading check-result-heading"><p className="muted">{result.input.symptoms}</p><div className="check-heading-actions"><ReportButton result={result} /><Link className="btn btn-primary" href="/dashboard/analysis">{t("result.new")}</Link></div></div><SimpleResults result={result} /></div>}</Resource></Workspace>{result && <AnalysisReport result={result} />}</>;
}
export function Reports() {
  const [page, setPage] = useState(1), state = useResource(`/reports?page=${page}&limit=10`), { t, language } = usePreferences();
  return <Workspace title="dash.reports"><p className="muted">{t("dash.reportHint")}</p><Resource state={state}>{data => <>{!data.items.length ? <Empty /> : <ul className="report-list">{data.items.map(row => <li key={row._id}><div><strong>{row.condition}</strong><p className="small muted">{displayDate(row.createdAt, language)} · PDF</p></div><Link className="btn btn-secondary" href={`/dashboard/history/${row.analysisId}`}>{t("dash.view")} →</Link></li>)}</ul>}<Pager data={data} setPage={setPage} /></>}</Resource></Workspace>;
}
export function Profile({ settings = false }) {
  const { user, refreshUser } = useAuth(), prefs = usePreferences(), { t } = prefs;
  const [busy, setBusy] = useState(false), [error, setError] = useState(null), [saved, setSaved] = useState(false), [firstName, setFirstName] = useState(""), [lastName, setLastName] = useState("");
  useEffect(() => { setFirstName(user?.profile?.firstName || ""); setLastName(user?.profile?.lastName || ""); }, [user]);
  async function save(e) {
    e.preventDefault(); setBusy(true); setError(null); setSaved(false);
    try { await platformRequest(settings ? "/users/me/settings" : "/users/me/profile", { method: "PATCH", body: settings ? { theme: prefs.themeChoice } : { firstName, lastName, preferredLanguage: prefs.language } }); if (settings) await platformRequest("/users/me/profile", { method: "PATCH", body: { preferredLanguage: prefs.language } }); await refreshUser(); setSaved(true); }
    catch (e) { setError(e); } finally { setBusy(false); }
  }
  return <Workspace title={settings ? "dash.settings" : "dash.profile"}><form onSubmit={save} className="card profile-form"><fieldset className="analysis-fields stack-xl" disabled={busy}><legend className="visually-hidden">{t(settings ? "dash.settings" : "dash.profile")}</legend>{!settings && <><p>{user?.email}</p><p className="small muted">{t("dash.identity")}</p><label className="field">{t("dash.firstName")}<input className="input" autoComplete="given-name" maxLength={60} value={firstName} onChange={e => setFirstName(e.target.value)} /></label><label className="field">{t("dash.lastName")}<input className="input" autoComplete="family-name" maxLength={60} value={lastName} onChange={e => setLastName(e.target.value)} /></label></>}<PreferenceControls placement="profile" />{error && <ErrorState error={error} message="dash.saveError" retry={save} />}{saved && <p role="status" className="platform-notice">{t("dash.savedNotice")}</p>}<button className="btn btn-primary">{t(busy ? "dash.loading" : "dash.save")}</button><Link href="/privacy">{t("dash.privacy")}</Link></fieldset></form></Workspace>;
}
