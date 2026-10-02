import { usePreferences } from "@/context/PreferencesContext";
import ModelComparison from "./ModelComparison";

export default function PredictionSummary({ result }) {
  const { t, language } = usePreferences();
  const messageKeys = {
    "MediXAI service is temporarily unavailable. Please try again later.": "result.serviceUnavailable",
    "The analysis service is currently unavailable.": "result.errorService",
    "Negated symptoms cannot be interpreted reliably. Enter only symptoms currently present.": "result.negatedInput",
    "No symptoms in the trained vocabulary were recognized. Try common symptom phrases separated by commas.": "result.unknownInput",
  };
  const key = result?.code && ["AUTH_REQUIRED", "AUTH_INVALID"].includes(result.code) ? "account.required" : result?.code && ["ACCOUNT_DISABLED", "FORBIDDEN"].includes(result.code) ? "account.blocked" : `error.${result?.code}`;
  const message = result?.code ? (t(key) === key ? t("result.errorService") : t(key)) : messageKeys[result?.message] ? t(messageKeys[result.message]) : result?.message || t("result.errorService");
  if (!result?.prediction) return (
    <section className="card" role="alert" aria-label={t("result.error")}>
      <h3>{t("result.error")}</h3>
      <p>{message}</p>
      {result?.requestId && <p className="small muted">{t("result.reference")} {result.requestId}</p>}
    </section>
  );
  const { prediction, model, normalizedSymptoms, unrecognizedSymptoms } = result;
  return (
    <section className="summary" aria-label={t("result.summary")}>
      <div className="summary__top">
        <h3>{result.finalPrediction ? (language === "bn" ? "চার মডেলের সম্মিলিত পূর্বাভাস" : "Final prediction from four models") : t("result.condition")}</h3>
        <div className="summary__condition">{result.finalPrediction?.condition || prediction.condition}</div>
        <p className="small">{t("result.notDiagnosis")}</p>
      </div>
      <ModelComparison result={result} />
      <div className="summary__meta">
        <div className="meta-item"><div className="k">{t("result.model")}</div><div className="v">{model.name}</div><span className="small">{t("result.version")} {model.version}</span></div>
        <div className="meta-item"><div className="k">{t("result.confidence")}</div><div className="v">{prediction.confidence == null ? t("result.unavailable") : `${(prediction.confidence * 100).toFixed(1)}%`}</div><span className="small">{t("result.score")}</span></div>
      </div>
      <div className="result-details">
        <p className="small muted">{t("result.confidenceHelp")}</p>
        <p className="form-note">{model.limitation === t("result.modelLimitation") || model.limitation?.startsWith("The existing 30-class dataset") ? t("result.modelLimitation") : model.limitation}</p>
        {result.predictions?.length > 0 && <>
          <h3>{t("result.top")}</h3>
          <ol className="score-list">{result.predictions.map((p) => <li key={p.condition}><span>{p.condition}</span><strong>{p.confidence == null ? t("common.unavailable") : `${(p.confidence * 100).toFixed(1)}%`}</strong><span className="score-track" aria-hidden="true"><span style={{ width: `${(p.confidence || 0) * 100}%` }} /></span></li>)}</ol>
        </>}
        <p className="small"><strong>{t("result.normalized")}</strong> {normalizedSymptoms.join(", ")}</p>
        {unrecognizedSymptoms?.length > 0 && <p className="small">{t("result.unrecognized")} {unrecognizedSymptoms.join(", ")}. {t("result.riskNote")}</p>}
      </div>
    </section>
  );
}
