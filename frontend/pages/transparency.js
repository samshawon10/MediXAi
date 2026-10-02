import Link from "next/link";
import PageIntro from "@/components/PageIntro";
import Pipeline from "@/components/Pipeline";
import Disclaimer from "@/components/Disclaimer";
import { usePreferences } from "@/context/PreferencesContext";

export default function Transparency() {
  const { t } = usePreferences();
  return <section className="section"><div className="container">
    <PageIntro title="research.title" lead="research.lead" />
    <div className="research-layout"><aside><Pipeline /><Link href="/performance" className="btn btn-secondary mt-1">{t("nav.performance")} →</Link></aside>
      <div className="editorial-sections">{["data", "method", "uncertainty", "explain", "risk", "selection"].map(key => <section key={key}><h2>{t(`research.${key}`)}</h2><p>{t(`research.${key}Text`)}</p></section>)}<Disclaimer /></div>
    </div></div></section>;
}
