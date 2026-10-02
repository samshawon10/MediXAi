import { usePreferences } from "@/context/PreferencesContext";
export default function CareGuidance() {
  const { t } = usePreferences();
  return <section className="card care-guidance" aria-label={t("care.title")}><h3>{t("care.title")}</h3><p className="small muted">{t("care.note")}</p>
    <h4>{t("care.emergency")}</h4><p>{t("care.emergencyText")}</p><h4>{t("care.consult")}</h4><p>{t("care.consultText")}</p>
    <a href="https://medlineplus.gov/ency/article/001927.htm" target="_blank" rel="noreferrer">{t("care.source")} ↗</a><p className="small muted mt-1">{t("care.local")}</p></section>;
}
