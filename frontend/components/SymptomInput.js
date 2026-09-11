import { POPULAR_SYMPTOMS } from "@/lib/symptoms";

function onKeyDownAdd(e, addFromText) {
  if (e.key === "Enter" || e.key === ",") {
    e.preventDefault();
    addFromText(e.target.value);
  }
}

/**
 * Presentational symptom entry control.
 * Props are driven by the page via useSymptomInput().
 */
export default function SymptomInput({
  chips,
  text,
  setText,
  addFromText,
  addSingle,
  remove,
  clearAll,
  error,
}) {
  return (
    <div>
      <div className="field">
        <label htmlFor="symptom-input">
          Enter your symptoms
          <span className="hint"> — naturally, comma separated, English or Bangla</span>
        </label>
        <textarea
          id="symptom-input"
          className="textarea"
          placeholder="e.g. fever, cough, headache, fatigue"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => onKeyDownAdd(e, addFromText)}
          aria-describedby={error ? "symptom-error" : undefined}
        />
        {error && (
          <p id="symptom-error" role="alert" style={{ color: "var(--rose-500)", fontWeight: 600, marginTop: "0.4rem" }}>
            {error}
          </p>
        )}
      </div>

      <div className="chips" aria-label="Selected symptoms">
        {chips.length === 0 ? (
          <span className="chips__empty">No symptoms added yet &mdash; type above or tap a suggestion below.</span>
        ) : (
          chips.map((c) => (
            <span key={c} className="chip">
              {c}
              <button type="button" onClick={() => remove(c)} aria-label={`Remove ${c}`}>
                &times;
              </button>
            </span>
          ))
        )}
      </div>

      {chips.length > 0 && (
        <div className="chip-actions">
          <button type="button" className="link-btn" onClick={clearAll}>
            Clear all symptoms
          </button>
        </div>
      )}

      <div className="suggest">
        <span className="suggest__label">Suggestions:</span>
        {POPULAR_SYMPTOMS.map((s) => (
          <button
            type="button"
            key={s}
            className="suggest__item"
            disabled={chips.includes(s)}
            onClick={() => addSingle(s)}
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}