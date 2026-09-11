import { useRouter } from "next/router";
import { useEffect } from "react";
import "@/styles/globals.css";
import Layout from "@/components/Layout";

function AccessibleSkipLink() {
  return (
    <a href="#main-content" className="skip-link">
      Skip to main content
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
    <>
      <AccessibleSkipLink />
      <ScrollToTop />
      <Layout>
        <Component {...pageProps} />
      </Layout>
    </>
  );
}