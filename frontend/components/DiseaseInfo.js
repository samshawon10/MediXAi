import { usePreferences } from "@/context/PreferencesContext";

export default function DiseaseInfo({ condition, education }) {
  const { t } = usePreferences();
  return (
    <section className="card" aria-label={t("result.education")}>
    <h3>{t("result.education")}</h3>
      {condition && <h4>{condition}</h4>}
      <p>{education?.available ? education.message : t("result.educationUnavailable")}</p>
      <p className="small muted">{t("education.unavailable")}</p>
      <h4>{t("education.general")}</h4><p>{t("education.text")}</p>
      <a href="https://www.nhs.uk/symptoms/" target="_blank" rel="noreferrer">{t("education.nhs")} ↗</a>
      <p className="small muted">{t("result.educationNote")}</p>
    </section>
  );
}
