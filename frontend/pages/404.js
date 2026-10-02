import Head from "next/head";
import Button from "@/components/Button";
import { usePreferences } from "@/context/PreferencesContext";

export default function NotFoundPage() {
  const { t } = usePreferences();
  return (
    <>
      <Head><title>{t("404.title")} — MediXAI</title></Head>
      <section className="section">
        <div className="container text-center" style={{ maxWidth: 520, marginInline: "auto" }}>
          <div className="empty__icon" aria-hidden="true">🔍</div>
          <h1>{t("404.title")}</h1>
          <p className="muted">{t("404.description")}</p>
          <Button href="/" as="link">{t("404.home")}</Button>
        </div>
      </section>
    </>
  );
}