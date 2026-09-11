import Head from "next/head";
import Button from "@/components/Button";
import SectionHeading from "@/components/SectionHeading";
import FeatureCard from "@/components/FeatureCard";
import Pipeline from "@/components/Pipeline";
import Disclaimer from "@/components/Disclaimer";

const FEATURES = [
  { icon: "🧬", tone: "teal", title: "AI Symptom Analysis", text: "Enter symptoms naturally and let the model interpret them for decision support.", status: "live" },
  { icon: "🎯", tone: "emerald", title: "Disease Risk Prediction", text: "A trained multiclass model suggests possible conditions from symptom signatures.", status: "live" },
  { icon: "🔍", tone: "indigo", title: "Explainable AI", text: "SHAP-based explanations show which symptoms drove each prediction.", status: "coming" },
  { icon: "🚨", tone: "rose", title: "Emergency Risk Assessment", text: "A dedicated engine flags low-to-emergency risk levels from symptoms.", status: "coming" },
  { icon: "📊", tone: "violet", title: "Evidence-Based Insights", text: "Decisions backed by reproducible TF-IDF features and model evaluation.", status: "live" },
  { icon: "🩺", tone: "amber", title: "Decision Support", text: "Provider-style insights — support, never a substitute for clinical judgement.", status: "coming" },
];

export default function HomePage() {
  return (
    <>
      <Head>
        <title>MediXAI — Explainable AI for Healthcare Decision Support</title>
        <meta name="description" content="MediXAI analyzes patient-reported symptoms and predicts possible conditions with explainable AI for intelligent healthcare decision support." />
      </Head>

      {/* Hero */}
      <section className="hero">
        <div className="container hero__grid">
          <div>
            <span className="eyebrow mb-pill">🧠 Explainable AI · Decision Support</span>
            <h1 className="hero__title">
              Understand Your Symptoms. <span className="accent">Make Better Health Decisions.</span>
            </h1>
            <p className="hero__lead">
              MediXAI analyzes patient-reported symptoms, predicts possible
              conditions with machine learning, and explains its reasoning &mdash;
              turning raw symptoms into responsible, evidence-based health insights.
            </p>
            <div className="hero__actions">
              <Button href="/symptoms" size="lg" as="link">Analyze Symptoms</Button>
              <Button href="/how-it-works" variant="secondary" size="lg" as="link">How It Works</Button>
            </div>
            <div className="hero__trust">
              <span>✓ Scientific pipeline</span>
              <span>✓ Private &amp; minimal data</span>
              <span>✓ Not a medical diagnosis</span>
            </div>
          </div>

          <div className="hero__visual">
            <div className="hero__panel" aria-hidden="true">
              <h3>Live analysis preview</h3>
              <div className="hero__mini-chips">
                <span className="mini-chip" style={{ "--the-color": "#cffafe", "--the-ink": "#0e7490" }}>fever</span>
                <span className="mini-chip" style={{ "--the-color": "#d1fae5", "--the-ink": "#047857" }}>cough</span>
                <span className="mini-chip" style={{ "--the-color": "#ede9fe", "--the-ink": "#6d28d9" }}>headache</span>
                <span className="mini-chip" style={{ "--the-color": "#fef3c7", "--the-ink": "#92400e" }}>fatigue</span>
              </div>
              <div className="hero__mini-result">
                <span className="dot">AI</span>
                <div>
                  <strong>Possible Condition</strong>
                  <div className="small muted">Explainable prediction from trained model</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="section" aria-labelledby="features-title">
        <div className="container">
          <SectionHeading eyebrow="Capabilities" title="Features at a glance" center>
            Six pillars power MediXAI. Everything you see is production-quality UI;
            modules still in development are clearly marked.
          </SectionHeading>
          <div className="grid grid--3 mt-2">
            {FEATURES.map((f) => (
              <FeatureCard key={f.title} {...f} />
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="section section--alt" aria-labelledby="how-title">
        <div className="container">
          <div className="stack-xl">
            <SectionHeading eyebrow="Pipeline" title="How MediXAI Works" center>
              A transparent, reproducible funnel from raw symptom text to visualized decision support.
            </SectionHeading>
            <Pipeline />
          </div>
        </div>
      </section>

      {/* Architecture note */}
      <section className="section" aria-labelledby="arch-title">
        <div className="container">
          <div className="card text-center" style={{ maxWidth: 760, marginInline: "auto" }}>
            <h3 id="arch-title" style={{ marginTop: "0.2em" }}>Built for today, architected for tomorrow</h3>
            <p className="muted">
              The frontend is structured around future API contracts. Prediction,
              SHAP explanations, and emergency risk will connect to the backend ML
              service without redesigning the UI.
            </p>
            <Button href="/how-it-works" variant="secondary" as="link">See the full architecture</Button>
          </div>
        </div>
      </section>

      {/* CTA + disclaimer */}
      <section className="section section--ink" aria-labelledby="cta-title">
        <div className="container">
          <div className="text-center" style={{ maxWidth: 640, marginInline: "auto" }}>
            <h2 id="cta-title">Ready to try an analysis?</h2>
            <p className="muted">Add a few symptoms and watch the explainable decision-support flow in action.</p>
            <Button href="/symptoms" size="lg" as="link">Analyze Symptoms</Button>
            <div className="mt-2">
              <Disclaimer variant="bare" />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}