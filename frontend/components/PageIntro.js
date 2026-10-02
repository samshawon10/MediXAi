import Head from "next/head";
import { usePreferences } from "@/context/PreferencesContext";

export default function PageIntro({ title, lead, eyebrow = "common.research" }) {
  const { t } = usePreferences();
  return <><Head><title>{t(title)} — MediXAI</title><meta name="description" content={t(lead)} /></Head>
    <header className="page-intro"><span className="eyebrow">{t(eyebrow)}</span><h1>{t(title)}</h1><p className="muted">{t(lead)}</p></header></>;
}
