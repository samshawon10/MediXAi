import { useState } from "react";
import Link from "next/link";
import { usePreferences } from "@/context/PreferencesContext";

export default function InteractiveDemo() {
  const { t, language } = usePreferences();
  const [expanded, setExpanded] = useState(false);
  return <section className="demo-panel" aria-labelledby="demo-title">
    <div className="demo-header"><span className="demo-mark" aria-hidden="true">M</span><strong id="demo-title">{t("demo.title")}</strong><span className="status-dot" aria-hidden="true" /></div>
    <div className="demo-content"><label htmlFor="demo-input">{t("demo.input")}</label>
      <textarea key={language} id="demo-input" className="textarea" defaultValue={t("demo.example")} maxLength={2000} />
      <button className="btn btn-secondary" onClick={() => setExpanded(!expanded)} aria-expanded={expanded} aria-controls="demo-workflow">{t("demo.action")} <span aria-hidden="true">↗</span></button>
      <div id="demo-workflow" className="demo-workflow"><p className="small"><strong>{t("demo.ready")}</strong></p>{expanded && <p className="small muted">{t("demo.explained")}</p>}
        <div className="demo-lines" aria-hidden="true"><span /><span /><span /></div></div>
      <p className="small muted">{t("demo.note")}</p><Link className="text-link" href="/symptoms">{t("demo.real")} <span aria-hidden="true">→</span></Link>
    </div></section>;
}
