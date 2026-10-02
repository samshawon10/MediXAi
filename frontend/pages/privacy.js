import PageIntro from "@/components/PageIntro";
import { usePreferences } from "@/context/PreferencesContext";
export default function Privacy() {
  const { t } = usePreferences();
  return <section className="section"><div className="container reading-width"><PageIntro title="privacy.title" lead="privacy.lead" eyebrow="nav.privacy" />
    <div className="editorial-sections">{["sent", "stored", "third", "controls"].map(key => <section key={key}><h2>{t(`privacy.${key}`)}</h2><p>{t(`privacy.${key}Text`)}</p></section>)}</div></div></section>;
}
