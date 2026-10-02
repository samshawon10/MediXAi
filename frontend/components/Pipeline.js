import { usePreferences } from "@/context/PreferencesContext";

const FLOW = [
  { n: "2", label: "pipeline.input", sub: "pipeline.inputSub" },
  { n: "3", label: "pipeline.preprocess", sub: "pipeline.preprocessSub" },
  { n: "4", label: "pipeline.tfidf", sub: "pipeline.tfidfSub" },
  { n: "5", label: "pipeline.model", sub: "pipeline.modelSub" },
  { n: "6", label: "pipeline.prediction", sub: "pipeline.predictionSub" },
  { n: "7", label: "pipeline.explain", sub: "pipeline.explainSub" },
  { n: "8", label: "pipeline.risk", sub: "pipeline.riskSub" },
  { n: "9", label: "pipeline.support", sub: "pipeline.supportSub" },
];

export default function Pipeline() {
  const { t } = usePreferences();
  return (
    <ol className="pipeline" style={{ listStyle: "none", margin: 0, padding: 0 }}>
      {FLOW.map((step, i) => (
        <li key={step.n}>
          <div className="pipe-step">
            <span className="pipe-step__num" aria-hidden="true">{i + 1}</span>
            <div className="pipe-step__label">
              <strong>{t(step.label)}</strong>
              <div>{t(step.sub)}</div>
            </div>
          </div>
          {i < FLOW.length - 1 && <div className="pipe-arrow" aria-hidden="true">&#8595;</div>}
        </li>
      ))}
    </ol>
  );
}
