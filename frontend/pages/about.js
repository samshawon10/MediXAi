import Head from "next/head";
import SectionHeading from "@/components/SectionHeading";
import ProductBadge from "@/components/ProductBadge";
import Disclaimer from "@/components/Disclaimer";
import Button from "@/components/Button";

const PRINCIPLES = [
  { icon: "🛡️", tone: "emerald", title: "Responsible Decision Support", text: "Every output is framed as an AI-generated insight, never a confirmed diagnosis." },
  { icon: "🔬", tone: "teal", title: "Reproducible Science", text: "Fixed seeds, stratified splits, and documented metrics keep results honest and repeatable." },
  { icon: "🤝", tone: "indigo", title: "Human in the Loop", text: "Clinical judgement and qualified professionals always have the final word." },
  { icon: "🌐", tone: "violet", title: "Language-Aware", text: "Bangla and English symptom input are normalized to a common feature space." },
];

export default function AboutPage() {
  return (
    <>
      <Head>
        <title>About MediXAI — Explainable AI Research</title>
        <meta name="description" content="About the MediXAI academic project: explainable AI-based symptom analysis and emergency risk prediction for intelligent healthcare decision support." />
      </Head>

      <section className="section" style={{ paddingBottom: "1rem" }}>
        <div className="container" style={{ maxWidth: 820 }}>
          <span className="eyebrow mb-pill">About the project</span>
          <h1>
            Explainable AI-Based Symptom Analysis and Emergency Risk Prediction for
            Intelligent Healthcare Decision Support
          </h1>
          <p className="muted" style={{ fontSize: "1.08rem" }}>
            MediXAI is an academic research prototype that explores how machine
            learning models can assist people in understanding their symptoms and
            make better-informed health decisions &mdash; while remaining fully
            transparent about the reasoning behind each prediction.
          </p>
        </div>
      </section>

      <section className="section section--alt" style={{ paddingTop: "3rem" }}>
        <div className="container">
          <SectionHeading eyebrow="What we build" title="Our core principles" center />
          <div className="grid grid--2 mt-2">
            {PRINCIPLES.map((p) => (
              <article className="card card--hover" key={p.title}>
                <div className={`card__icon card__icon--${p.tone}`} aria-hidden="true">{p.icon}</div>
                <h3>{p.title}</h3>
                <p className="muted">{p.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container" style={{ maxWidth: 820 }}>
          <h2>Development status</h2>
          <p className="muted">
            This is the first development phase (~30%). The ML foundation and the
            complete frontend are in place; explainability, emergency risk, and the
            live backend are scheduled for the next update.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", marginTop: "1rem" }}>
            <ProductBadge status="live" />
            <ProductBadge status="coming" />
            <ProductBadge status="dev" />
          </div>
          <div className="mt-2">
            <Button href="/how-it-works" variant="secondary" as="link">Explore the technology</Button>
          </div>
          <div className="disclaimer mt-2" role="note">
            <span aria-hidden="true">&#9888;&#65039;</span>
            <span>
              MediXAI provides AI-assisted health insights for decision support.
              Predictions are not confirmed medical diagnoses. Consult a qualified
              healthcare professional for medical advice.
            </span>
          </div>
        </div>
      </section>
    </>
  );
}