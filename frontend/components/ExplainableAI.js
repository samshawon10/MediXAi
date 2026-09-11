import ProductBadge from "./ProductBadge";

/**
 * Explainable AI panel. The full layout is built now; real SHAP data will be
 * passed in as props (shapValues, topContributors, summary) in the next update.
 */
export default function ExplainableAI({ contributingSymptoms = [], shapValues = [] }) {
  return (
    <section className="locked" aria-label="Explainable AI">
      <div className="locked__head">
        <h3>
          <span className="lock-icon" aria-hidden="true">&#128274;</span>
          Why did MediXAI make this prediction?
        </h3>
        <ProductBadge status="coming" />
      </div>
      {contributingSymptoms.length > 0 ? (
        <ul>
          {contributingSymptoms.map((s) => (
            <li key={s.symptom}>{s.symptom}</li>
          ))}
        </ul>
      ) : (
        <>
          <p>
            <strong className="eyebrow" style={{ display: "inline-flex", marginBottom: "0.5rem" }}>
              SHAP-based symptom contribution analysis
            </strong>
          </p>
          <p>
            The top contributing symptoms, feature importance scores, and
            positive/negative contributions will appear here once the explainable
            AI engine is integrated in the next update.
          </p>
          <p className="small muted">
            This component is already designed to receive real SHAP data as props
            or from the API response &mdash; no UI redesign will be required.
          </p>
        </>
      )}
    </section>
  );
}