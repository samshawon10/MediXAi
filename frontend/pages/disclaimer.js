import PageIntro from "@/components/PageIntro";
import CareGuidance from "@/components/CareGuidance";
import { usePreferences } from "@/context/PreferencesContext";
export default function DisclaimerPage() {
  const { t } = usePreferences();
  return <section className="section"><div className="container reading-width"><PageIntro title="disclaimer.title" lead="disclaimer.lead" eyebrow="nav.disclaimer" /><p>{t("disclaimer.body")}</p><CareGuidance /></div></section>;
}
