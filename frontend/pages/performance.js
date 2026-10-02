import { useEffect, useState } from "react";
import Link from "next/link";
import PageIntro from "@/components/PageIntro";
import { getModelInfo } from "@/services/api";
import { usePreferences } from "@/context/PreferencesContext";

export default function Performance() {
  const { t, language } = usePreferences();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController(); setData(null); setError(null);
    getModelInfo(controller.signal).then(value => { if (!controller.signal.aborted) setData(value); })
      .catch(e => { if (!controller.signal.aborted) setError(e.code || "service"); });
    return () => controller.abort();
  }, [attempt]);
  const research = data?.research, evaluation = research?.evaluation;
  const percent = n => n == null ? t("common.unavailable") : new Intl.NumberFormat(language === "bn" ? "bn-BD" : "en", { style: "percent", maximumFractionDigits: 2 }).format(n);
  const labels = research?.labels || [];
  const matrix = evaluation?.confusionMatrix;
  const validMatrix = matrix?.length === labels.length && matrix.every(row => row.length === labels.length);
  return <section className="section"><div className="container"><PageIntro title="performance.title" lead="performance.lead" />
    <div className="disclaimer" role="note">{t("performance.disclaimer")}</div>
    {!data && !error && <div className="card mt-2" role="status"><p>{t("performance.loading")}</p><div className="skeleton" /></div>}
    {error && <div className="card mt-2" role="alert"><p>{t(`error.${error}`)}</p><button className="btn btn-secondary" onClick={() => setAttempt(n => n + 1)}>{t("result.retry")}</button></div>}
    {data && <div className="stack-xl mt-2"><section><h2>{t("performance.live")}: {data.name}</h2><p className="muted">{data.model} · {t("result.version")} {data.version} · TF-IDF · {data.explainability}</p><p className="form-note">{t("result.modelLimitation")}</p>
      <dl className="dataset-grid">{[["dataset", research?.dataset], ["train", research?.nTrain], ["test", research?.nTest], ["classes", data.classes], ["features", research?.features], ["seed", research?.randomState], ["split", research?.testSize == null ? null : percent(research.testSize)], ["background", research?.backgroundRows]].map(([key, value]) => <div key={key}><dt>{t(`performance.${key}`)}</dt><dd>{value ?? t("common.unavailable")}</dd></div>)}</dl></section>
      {!evaluation ? <div className="empty">{t("performance.empty")}</div> : <>
        <div className="metric-grid">{["accuracy", "precision", "recall", "f1"].map(key => <div className="card metric" key={key}><span>{t(`performance.${key}`)}</span><strong>{percent(evaluation[key])}</strong></div>)}</div>
        <p className="small muted">{t("performance.source")}: {evaluation.source}<br />{t("performance.verified")}: {new Date(evaluation.verifiedAt).toLocaleString(language === "bn" ? "bn-BD" : "en-GB")}</p>
        {validMatrix && <><details className="disclosure"><summary>{t("performance.perClass")}</summary><div className="table-scroll" tabIndex={0} role="region" aria-label={t("performance.perClass")}><table><thead><tr>{["condition", "precision", "recall", "f1", "support"].map(k => <th scope="col" key={k}>{t(`performance.${k}`)}</th>)}</tr></thead><tbody>{labels.map((label, i) => {
          const tp = matrix[i][i], support = matrix[i].reduce((a, b) => a + b, 0), predicted = matrix.reduce((a, row) => a + row[i], 0);
          const precision = predicted ? tp / predicted : 0, recall = support ? tp / support : 0;
          const f1 = precision + recall ? 2 * precision * recall / (precision + recall) : 0;
          return <tr key={label}><th scope="row">{label}</th><td>{percent(precision)}</td><td>{percent(recall)}</td><td>{percent(f1)}</td><td>{support}</td></tr>;
        })}</tbody></table></div></details>
        <details className="disclosure"><summary>{t("performance.matrix")}</summary><p className="small muted">{t("performance.matrixHint")}</p><div className="table-scroll matrix-scroll" tabIndex={0} role="region" aria-label={t("performance.matrix")}><table><caption className="visually-hidden">{t("performance.matrixHint")}</caption><thead><tr><th scope="col">{t("performance.condition")}</th>{labels.map(label => <th scope="col" key={label}>{label}</th>)}</tr></thead><tbody>{matrix.map((row, i) => <tr key={labels[i]}><th scope="row">{labels[i]}</th>{row.map((n, j) => <td key={j} className={i === j ? "matrix-diagonal" : undefined}>{n}</td>)}</tr>)}</tbody></table></div></details></>}
      </>}
      <section className="editorial-sections"><h2>{t("research.selection")}</h2><p>{t("research.selectionText")}</p><Link href="/transparency">{t("common.read")} →</Link></section>
    </div>}
  </div></section>;
}
