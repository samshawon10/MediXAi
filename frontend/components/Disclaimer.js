import { usePreferences } from "@/context/PreferencesContext";

export default function Disclaimer({ variant = "inline", children }) {
  const { t } = usePreferences();
  const text = children === t("result.disclaimer") || children === MESSAGES_EN_DISCLAIMER
    ? t("disclaimer.default")
    : children || t("disclaimer.default");
  return (
    <div className={`disclaimer disclaimer--${variant}`} role="note">
      <span aria-hidden="true">&#9888;&#65039;</span>
      <span>{text}</span>
    </div>
  );
}

const MESSAGES_EN_DISCLAIMER = "MediXAI provides AI-assisted health insights for decision support. Predictions are not confirmed medical diagnoses. Always consult a qualified healthcare professional for medical advice. In an emergency, seek immediate professional medical assistance.";
