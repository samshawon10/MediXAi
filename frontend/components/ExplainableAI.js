import { usePreferences } from "@/context/PreferencesContext";

export default function ExplainableAI({ explanation }) {
  const { t } = usePreferences();
  const features = explanation?.features || [];
  const max = Math.max(...features.map(f => Math.abs(f.impact)), 0.000001);
  return <section className="card" aria-label={t("result.why")}><h3>{t("result.why")}</h3>
    {!explanation?.available ? <p>{t("result.explanationFallback")}</p> : <>
      <p className="small muted">{t("result.simple")}</p>
      <ul className="shap-chart">{features.map(f => <li key={f.feature}><div className="shap-label"><strong>{f.feature}</strong><span>{f.impact >= 0 ? "+" : "−"} {t(`result.${f.direction}Short`)}</span></div>
        <div className="shap-track" role="img" aria-label={t("result.featureImpactLabel").replace("{feature}", f.feature).replace("{direction}", t(`result.${f.direction}Direction`)).replace("{impact}", f.impact.toFixed(5))}><span className={`shap-bar shap-bar--${f.direction}`} style={{ width: `${Math.abs(f.impact) / max * 100}%` }} /></div></li>)}</ul>
      <p className="small muted">{t("result.positive")}</p>
      <details className="disclosure"><summary>{t("result.technical")}</summary><p className="small">{explanation.explainer} · {t("result.units")} {explanation.units}</p>
        <div className="table-scroll" tabIndex={0} role="region" aria-label={t("result.value")}><table><thead><tr><th scope="col">{t("result.feature")}</th><th scope="col">{t("result.value")}</th><th scope="col">{t("result.direction")}</th></tr></thead><tbody>{features.map(f => <tr key={f.feature}><th scope="row">{f.feature}</th><td>{f.impact.toFixed(6)}</td><td>{t(`result.${f.direction}Short`)}</td></tr>)}</tbody></table></div>
        <dl className="technical-values">{[["baseline", explanation.baseValue], ["absent", explanation.absentFeatureImpact], ["output", explanation.outputValue]].map(([key, value]) => <div key={key}><dt>{t(`result.${key}`)}</dt><dd>{Number.isFinite(value) ? value.toFixed(6) : t("common.unavailable")}</dd></div>)}</dl>
      </details>
    </>}<p className="small mt-1">{t("result.shap")}</p></section>;
}
