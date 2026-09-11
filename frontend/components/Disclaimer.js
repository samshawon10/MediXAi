export default function Disclaimer({ variant = "inline", children }) {
  const text =
    children ||
    "MediXAI provides AI-assisted health insights for decision support. Predictions are not confirmed medical diagnoses. Consult a qualified healthcare professional for medical advice.";
  return (
    <div className={`disclaimer disclaimer--${variant}`} role="note">
      <span aria-hidden="true">&#9888;&#65039;</span>
      <span>{text}</span>
    </div>
  );
}