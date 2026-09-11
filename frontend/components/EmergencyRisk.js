import ProductBadge from "./ProductBadge";

const LEVELS = ["Low Risk", "Moderate Risk", "High Risk", "Emergency"];

/**
 * Emergency risk section. The visual levels are implemented now, but no risk
 * level is assigned until the real risk engine exists.
 */
export default function EmergencyRisk({ level = null }) {
  return (
    <section className="locked" aria-label="Emergency risk assessment">
      <div className="locked__head">
        <h3>
          <span className="lock-icon" aria-hidden="true">&#9888;&#65039;</span>
          Emergency Risk Prediction
        </h3>
        <ProductBadge status="dev" />
      </div>

      <div className="chips" style={{ borderColor: "var(--line-strong)", background: "var(--surface)" }}>
        {LEVELS.map((lv) => (
          <span
            key={lv}
            className="chip"
            style={{ background: "var(--slate-100)", color: "var(--ink-600)", borderColor: "var(--line-strong)" }}
          >
            {lv}
          </span>
        ))}
      </div>

      <p style={{ marginTop: "1rem" }}>
        This module is currently under development and will be enabled in the next
        update. No risk level has been assigned to this analysis.
      </p>

      <div className="disclaimer disclaimer--bare" role="note">
        <span aria-hidden="true">&#9888;&#65039;</span>
        <span>
          If you are experiencing severe or rapidly worsening symptoms, seek
          immediate professional medical assistance. MediXAI is not a replacement
          for emergency services.
        </span>
      </div>
    </section>
  );
}