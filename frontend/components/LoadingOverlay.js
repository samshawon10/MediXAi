export default function LoadingOverlay({ stages, activeStage }) {
  return (
    <div className="analysis" role="status" aria-live="polite" aria-label="Analysis in progress">
      <div className="analysis__head">
        <div className="spinner" aria-hidden="true" />
        <h2 style={{ fontSize: "1.3rem" }}>Analyzing symptoms&hellip;</h2>
        <p className="muted small" style={{ marginTop: "0.5rem" }}>
          Previewing the MediXAI analysis sequence. Live results appear after ML
          API integration.
        </p>
      </div>
      <ol className="stages">
        {stages.map((s, i) => {
          const active = i === activeStage;
          const done = i < activeStage;
          return (
            <li
              key={s.id}
              className={`stage${done ? " stage--done" : ""}${active ? " stage--active" : ""}`}
            >
              <span className="stage__icon" aria-hidden="true">
                {done ? "\u2713" : active ? "\u27F3" : "\u2022"}
              </span>
              <span>{s.label}</span>
              {active && (
                <span className="muted small" style={{ marginLeft: "auto" }}>
                  working&hellip;
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}