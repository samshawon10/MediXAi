import { useState } from "react";
import { Plus, Search, X } from "lucide-react";
import { POPULAR_SYMPTOMS } from "@/lib/symptoms";
import { usePreferences } from "@/context/PreferencesContext";
import VoiceInput from "./VoiceInput";

const EXAMPLES = [["Fever", "জ্বর"], ["Headache", "মাথা ব্যথা"], ["Cough", "কাশি"], ["Chest pain", "বুকে ব্যথা"], ["Stomach pain", "পেট ব্যথা"], ["Fatigue", "ক্লান্তি"]];

export default function SymptomInput({ chips, text, setText, addFromText, addSingle, remove, clearAll, error, inputLanguage = "en", disabled }) {
  const { t } = usePreferences();
  const [structured, setStructured] = useState(false);
  const [search, setSearch] = useState("");
  const length = [...chips, text.trim()].filter(Boolean).join(", ").length;
  const matches = POPULAR_SYMPTOMS.filter(s => s.includes(search.trim().toLowerCase()));
  return <div>
    <div className="field"><label htmlFor="symptom-input">{t("input.label")}</label>
      <textarea id="symptom-input" className="textarea symptom-textarea" placeholder={t("input.placeholder")} value={text} maxLength={2000} aria-invalid={Boolean(error) || length > 2000}
        onChange={e => setText(e.target.value)} onKeyDown={e => { if (structured && e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); addFromText(text); } }} aria-describedby={`symptom-count symptom-review${error ? " symptom-error" : ""}`} />
      <div className="input-toolbar"><button className="link-btn icon-label" type="button" onClick={clearAll} disabled={!text && !chips.length}><X size={15} aria-hidden="true" />{t("input.clear")}</button><span id="symptom-count" className={length > 2000 ? "input-error" : "small muted"}>{length} / 2000 {t("input.count")}</span></div>
      {error && <p id="symptom-error" className="input-error" role="alert">{error}</p>}
    </div>
    <div className="suggest"><span className="suggest__label">{t("input.suggestions")}</span>{EXAMPLES.map(pair => { const value = pair[inputLanguage === "bn" ? 1 : 0]; return <button key={pair[0]} type="button" className="suggest__item" disabled={chips.includes(value.toLowerCase())} onClick={() => addSingle(value)}><Plus size={14} aria-hidden="true" />{value}</button>; })}</div>
    {chips.length > 0 && <div className="chips" aria-label={t("input.selected")}>{chips.map(c => <span key={c} className="chip">{c}<button type="button" onClick={() => remove(c)} aria-label={`${t("input.remove")} ${c}`}><X size={14} aria-hidden="true" /></button></span>)}</div>}
    <details className="disclosure mt-1" onToggle={e => setStructured(e.currentTarget.open)}><summary>{t("input.structured")} <span className="muted small">· {t("input.optional")}</span></summary>
      <label className="visually-hidden" htmlFor="symptom-search">{t("input.search")}</label><div className="input-with-icon"><Search size={17} aria-hidden="true" /><input className="input" id="symptom-search" type="search" placeholder={t("input.search")} value={search} onChange={e => setSearch(e.target.value)} /></div>
      <div className="suggest symptom-search-results">{matches.map(s => <button type="button" key={s} className="suggest__item" disabled={chips.includes(s)} onClick={() => addSingle(s)}>{s}</button>)}</div>
      {!matches.length && <p className="small muted">{t("input.noMatch")}</p>}<button type="button" className="btn btn-secondary mt-1" disabled={!text.trim()} onClick={() => addFromText(text)}>{t("input.add")}</button>
    </details>
    <VoiceInput inputLanguage={inputLanguage} disabled={disabled} onTranscript={value => setText(current => [current, value].filter(Boolean).join(" ").slice(0, 2000))} />
    <p id="symptom-review" className="small muted">{t("input.review")}</p>
  </div>;
}
