import ProductBadge from "./ProductBadge";

/**
 * Prediction Summary — shows either live model output (future API) or an honest
 * locked/empty state while the ML API is not connected.
 */
export default function PredictionSummary({ result }) {
  const live = result && result.status !== "error" && result.predicted_condition;

  if (!live) {
    return (
      <div className="locked">
        <div className="locked__head">
          <h3>
            <span className="lock-icon" aria-hidden="true">&#9733;</span> Prediction Summary
          </h3>
          <ProductBadge status={result?.status === "error" ? "dev" : "coming"} />
        </div>
        <p>
          {result?.status === "error"
            ? `Analysis service error: ${result.message || "unknown"}.`
            : "Prediction results will be available after ML API integration."}
        </p>
        <p className="small muted">
          The machine-learning model is already trained and verified (see phase
          report). In this update we deliver the trained pipeline and this
          production-ready UI; wiring it to the live API is scheduled next.
        </p>
      </div>
    );
  }

  return (
    <section className="summary" aria-label="Prediction summary">
      <div className="summary__top">
        <h3>
          <span aria-hidden="true">&#9998;</span> Possible Condition
        </h3>
        <div className="summary__condition">{result.predicted_condition}</div>
        <p className="small" style={{ color: "#cfe9f7", marginTop: "0.4rem" }}>
          AI-generated health insight for decision support only.
        </p>
      </div>
      <div className="summary__meta">
        <div className="meta-item">
          <div className="k">Model</div>
          <div className="v">{result.model || result.model_name || "—"}</div>
        </div>
        <div className="meta-item">
          <div className="k">Model Confidence</div>
          <div className="v">
            {result.confidence != null
              ? `${(result.confidence * 100).toFixed(1)}%`
              : "Not available"}
          </div>
        </div>
      </div>
    </section>
  );
}