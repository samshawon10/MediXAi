const FLOW = [
  { n: "1", label: "Patient Information", sub: "Age, gender, optional demographics" },
  { n: "2", label: "Symptom Input", sub: "Free-text, EN or Bangla" },
  { n: "3", label: "Data Preprocessing", sub: "Cleaning & normalization" },
  { n: "4", label: "TF-IDF Feature Extraction", sub: "Unigram / bigram vectorization" },
  { n: "5", label: "Machine Learning Model", sub: "NB · Logistic Regression · SVM · RF" },
  { n: "6", label: "Possible Condition Prediction", sub: "Multiclass decision support" },
  { n: "7", label: "Explainable AI", sub: "SHAP-based contribution (next update)" },
  { n: "8", label: "Emergency Risk Assessment", sub: "Risk engine (next update)" },
  { n: "9", label: "Healthcare Decision Support", sub: "Insights, not diagnosis" },
];

export default function Pipeline() {
  return (
    <ol className="pipeline" style={{ listStyle: "none", margin: 0, padding: 0 }}>
      {FLOW.map((step, i) => (
        <li key={step.n}>
          <div className="pipe-step">
            <span className="pipe-step__num" aria-hidden="true">{step.n}</span>
            <div className="pipe-step__label">
              <strong>{step.label}</strong>
              <div>{step.sub}</div>
            </div>
          </div>
          {i < FLOW.length - 1 && <div className="pipe-arrow" aria-hidden="true">&#8595;</div>}
        </li>
      ))}
    </ol>
  );
}