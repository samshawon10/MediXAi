import Head from "next/head";
import Pipeline from "@/components/Pipeline";
import ProductBadge from "@/components/ProductBadge";
import Disclaimer from "@/components/Disclaimer";
import { usePreferences } from "@/context/PreferencesContext";

const STACK = [
  { name: "Next.js Frontend", title: "how.stack1", key: "stack.frontend", status: "live" },
  { name: "Express Backend", title: "how.stack2", key: "stack.backend", status: "live" },
  { name: "Python FastAPI ML Service", title: "how.stack3", key: "stack.ml", status: "live" },
  { name: "Preprocessing + TF-IDF", title: "how.stack4", key: "stack.preprocess", status: "live" },
  { name: "Best ML Model", title: "how.stack5", key: "stack.model", status: "live" },
  { name: "SHAP Explanation", title: "how.stack6", key: "stack.shap", status: "live" },
  { name: "Emergency Risk Engine", title: "how.stack7", key: "stack.risk", status: "live" },
];

export default function HowItWorksPage() {
  const { t } = usePreferences();
  return (
    <>
      <Head>
        <title>{t("page.howTitle")}</title>
        <meta name="description" content={t("page.howDescription")} />
      </Head>

      <section className="section" style={{ paddingBottom: "1rem" }}>
        <div className="container">
          <span className="eyebrow mb-pill">{t("how.architecture")}</span>
          <h1>{t("how.title")}</h1>
          <p className="muted" style={{ maxWidth: 720 }}>
            {t("how.lead")}
          </p>
        </div>
      </section>

      <section className="section" style={{ paddingTop: "1rem" }}>
        <div className="container stack-xl">
          <Pipeline />

          <details className="disclosure">
            <summary>{t("result.technical")}</summary>
            <h2 style={{ marginTop: "2rem" }}>{t("how.layers")}</h2>
            <div className="grid grid--2 mt-1">
              {STACK.map((s) => (
                <article className="card" key={s.name}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap", alignItems: "center" }}>
                    <h3 style={{ margin: 0 }}>{t(s.title)}</h3>
                    <ProductBadge status={s.status} />
                  </div>
                  <p className="small muted" style={{ marginTop: "0.6rem", marginBottom: 0 }}>{t(s.key)}</p>
                </article>
              ))}
            </div>
          </details>

          <Disclaimer />
        </div>
      </section>
    </>
  );
}
