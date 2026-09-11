import Head from "next/head";
import SectionHeading from "@/components/SectionHeading";
import Pipeline from "@/components/Pipeline";
import ProductBadge from "@/components/ProductBadge";
import Disclaimer from "@/components/Disclaimer";

const STACK = [
  { name: "Next.js Frontend", detail: "Production UI, responsive, accessible.", status: "live" },
  { name: "Express Backend", detail: "Future gateway service.", status: "coming" },
  { name: "Python FastAPI ML Service", detail: "Hosts preprocessing, TF-IDF, model, SHAP.", status: "coming" },
  { name: "Preprocessing + TF-IDF", detail: "Normalization, Bangla mapping, vectorization.", status: "live" },
  { name: "Best ML Model", detail: "Multiclass condition classification.", status: "live" },
  { name: "SHAP Explanation", detail: "Per-prediction contribution analysis.", status: "coming" },
  { name: "Emergency Risk Engine", detail: "Low-to-emergency risk levels.", status: "coming" },
];

export default function HowItWorksPage() {
  return (
    <>
      <Head>
        <title>How It Works — MediXAI</title>
        <meta name="description" content="The MediXAI ML pipeline: symptom input, preprocess, TF-IDF, model, explainable AI, and decision support." />
      </Head>

      <section className="section" style={{ paddingBottom: "1rem" }}>
        <div className="container">
          <span className="eyebrow mb-pill">Architecture</span>
          <h1>How MediXAI Works</h1>
          <p className="muted" style={{ maxWidth: 720 }}>
            MediXAI runs a transparent, reproducible pipeline from free-text
            symptom input to explainable decision support. Live steps are working;
            future modules are clearly marked.
          </p>
        </div>
      </section>

      <section className="section" style={{ paddingTop: "1rem" }}>
        <div className="container stack-xl">
          <Pipeline />

          <div>
            <h2 style={{ marginTop: "2rem" }}>Technology Layers</h2>
            <div className="grid grid--2 mt-1">
              {STACK.map((s) => (
                <article className="card" key={s.name}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap", alignItems: "center" }}>
                    <h3 style={{ margin: 0 }}>{s.name}</h3>
                    <ProductBadge status={s.status} />
                  </div>
                  <p className="small muted" style={{ marginTop: "0.6rem", marginBottom: 0 }}>{s.detail}</p>
                </article>
              ))}
            </div>
          </div>

          <Disclaimer />
        </div>
      </section>
    </>
  );
}