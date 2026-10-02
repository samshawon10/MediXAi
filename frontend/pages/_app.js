import { useRouter } from "next/router";
import Head from "next/head";
import { useEffect } from "react";
import "@/styles/globals.css";
import Layout from "@/components/Layout";
import { AuthProvider } from "@/context/AuthContext";
import { PreferencesProvider, usePreferences } from "@/context/PreferencesContext";

function AccessibleSkipLink() {
  const { t } = usePreferences();
  return (
    <a href="#main-content" className="skip-link">
      {t("skip")}
    </a>
  );
}

function ScrollToTop() {
  const { pathname } = useRouter();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [pathname]);
  return null;
}

export default function MediXaiApp({ Component, pageProps }) {
  return (
    <PreferencesProvider>
      <AuthProvider>
      <Head><meta property="og:title" content="MediXAI — Explainable AI Healthcare Decision Support" /><meta property="og:description" content="An explainable AI-based symptom analysis and emergency-risk decision-support prototype." /><meta property="og:type" content="website" /><meta name="robots" content="noindex, nofollow" /><link rel="icon" href="/favicon.svg" type="image/svg+xml" /></Head>
      <AccessibleSkipLink />
      <ScrollToTop />
      <Layout>
        <Component {...pageProps} />
      </Layout>
      </AuthProvider>
    </PreferencesProvider>
  );
}
