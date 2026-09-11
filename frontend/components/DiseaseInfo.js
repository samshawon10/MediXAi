import ProductBadge from "./ProductBadge";

/**
 * Disease information card. Placeholder structure for future verified medical
 * content. No fabricated medical information is shown.
 */
export default function DiseaseInfo({ condition = null }) {
  return (
    <section className="locked" aria-label="Disease information">
      <div className="locked__head">
        <h3>
          <span className="lock-icon" aria-hidden="true">&#128196;</span>
          Condition Information
        </h3>
        <ProductBadge status={condition ? "info" : "coming"} />
      </div>

      {condition ? (
        <>
          <h4 style={{ marginTop: "0.5rem" }}>{condition}</h4>
          <p className="small muted">Verified condition details will load here.</p>
        </>
      ) : (
        <>
          <p>
            Detailed, clinician-verified information about the predicted condition
            &mdash; description, common symptoms, general guidance, and when to
            seek medical attention &mdash; will appear here in the next update.
          </p>
          <p className="small muted">
            We will not display fabricated medical content. This section remains in
            a clearly marked placeholder state until verified data is connected.
          </p>
        </>
      )}
    </section>
  );
}