import { usePreferences } from "@/context/PreferencesContext";
import ModelComparison from "./ModelComparison";

export default function AnalysisReport({ result }) {
  const { t, language } = usePreferences();
  if (!result?.success) return null;
  const score = value => value == null ? t("common.unavailable") : `${(value * 100).toFixed(2)}%`;
  return <article className="print-report" aria-label={t("report.title")}>
    <header><strong className="report-brand">MediXAI</strong><h1>{t("report.title")}</h1><p>{t("report.disclaimer")}</p></header>
    <p>{t("result.created")}: {new Date(result.analyzedAt).toLocaleString(language === "bn" ? "bn-BD" : "en-GB")}<br />{t("result.reference")} {result.requestId}</p>
    <h2>{t("report.input")}</h2><p className="report-input">{result.input.symptoms}</p>
    <ModelComparison result={result} />
    <h2>{t("result.condition")}</h2><p><strong>{result.prediction.condition}</strong> · {t("result.confidence")}: {score(result.prediction.confidence)}</p><p>{t("result.confidenceHelp")}</p>
    <p>{t("result.model")}: {result.model.name} · {t("result.version")} {result.model.version}</p>
    <h2>{t("result.top")}</h2><ul>{result.predictions.map(p => <li key={p.condition}>{p.condition}: {score(p.confidence)}</li>)}</ul>
    <h2>{t("result.why")}</h2>{result.explanation.available ? <><p>{result.explanation.explainer} · {result.explanation.units}</p><table><thead><tr><th>{t("result.feature")}</th><th>{t("result.value")}</th></tr></thead><tbody>{result.explanation.features.map(f => <tr key={f.feature}><td>{f.feature}</td><td>{f.impact.toFixed(6)}</td></tr>)}</tbody></table><p>{t("result.baseline")}: {result.explanation.baseValue?.toFixed(6)} · {t("result.absent")}: {result.explanation.absentFeatureImpact?.toFixed(6)}</p></> : <p>{t("result.explanationFallback")}</p>}<p>{t("result.shap")}</p>
    <h2>{t("result.emergency")}</h2><p><strong>{t(({ CRITICAL: "risk.critical", HIGH: "risk.high", UNASSESSED: "risk.unassessed" })[result.risk.level] || "result.riskUnavailable")}</strong></p><p>{t("research.riskText")}</p><ul>{result.risk.reasons.map(r => <li key={r.symptom}>{r.symptom} ({r.level})</li>)}</ul><p>{result.risk.available ? t(result.risk.urgent ? "risk.urgentGuidance" : "risk.noPhraseGuidance") : t("result.guidanceUnavailable")}</p><p>{t("care.emergencyText")}</p>
    <h2>{t("result.limits")}</h2><p>{t("result.modelLimitation")}</p><p>{t("risk.limitation")}</p><footer>{t("report.disclaimer")} {t("disclaimer.default")}</footer>
  </article>;
}
