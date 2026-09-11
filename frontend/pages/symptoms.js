import Head from "next/head";
import { useState } from "react";
import useSymptomInput from "@/hooks/useSymptomInput";
import useAnalysis, { ANALYSIS_STAGES } from "@/hooks/useAnalysis";
import PatientForm from "@/components/PatientForm";
import SymptomInput from "@/components/SymptomInput";
import LoadingOverlay from "@/components/LoadingOverlay";
import PredictionSummary from "@/components/PredictionSummary";
import ExplainableAI from "@/components/ExplainableAI";
import EmergencyRisk from "@/components/EmergencyRisk";
import DiseaseInfo from "@/components/DiseaseInfo";
import Disclaimer from "@/components/Disclaimer";

export default function SymptomAnalysisPage() {
  const { chips, text, setText, addFromText, addSingle, remove, clearAll, validate, error } =
    useSymptomInput();
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const { phase, activeStage, result, run } = useAnalysis();

  function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;
    // Phase 1: the ML API is not connected yet, so run() resolves to a
    // `not_connected` result (no fabricated prediction is shown).
    // In the next update this switches to: run(() => analyzeSymptoms({ symptoms: chips }))
    run();
  }

  return (
    <>
      <Head>
        <title>Symptom Analysis — MediXAI</title>
        <meta name="description" content="Analyze your symptoms with MediXAI's explainable AI decision-support pipeline." />
      </Head>

      <section className="section" style={{ paddingBottom: "2rem" }}>
        <div className="container">
          <div className="text-center" style={{ maxWidth: 680, marginInline: "auto" }}>
            <span className="eyebrow mb-pill">🩺 Symptom Analysis</span>
            <h1>Analyze Your Symptoms</h1>
            <p className="muted">
              Describe what you are feeling in your own words. MediXAI normalizes
              the input and prepares it for an explainable ML prediction.
            </p>
          </div>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container">
          <form className="form-card" onSubmit={handleSubmit} noValidate>
            <h2>Patient Information</h2>
            <p className="small muted" style={{ marginBottom: "1rem" }}>
              We only collect what is needed for the demo. No sensitive medical
              history is requested.
            </p>
            <PatientForm age={age} setAge={setAge} gender={gender} setGender={setGender} />

            <h2 style={{ marginTop: "1.5rem" }}>Symptoms</h2>
            <p className="small muted" style={{ marginBottom: "0.5rem" }}>
              Type symptoms separated by commas (English or Bangla) or tap a suggestion.
            </p>
            <SymptomInput
              chips={chips}
              text={text}
              setText={setText}
              addFromText={addFromText}
              addSingle={addSingle}
              remove={remove}
              clearAll={clearAll}
              error={error}
            />

            <div className="form-note" role="note">
              <span aria-hidden="true">&#8505;&#65039;</span>
              <span>
                Demo note: live ML prediction connects in the next update. The
                pipeline is already trained &amp; verified; this UI is production-ready.
              </span>
            </div>

            <button type="submit" className="btn btn-primary btn-lg" style={{ width: "100%" }}>
              Analyze Symptoms
            </button>
          </form>
        </div>
      </section>

      {/* Loading / Results region */}
      <section className="section section--alt" style={{ paddingTop: "2.5rem" }}>
        <div className="container">
          {phase === "loading" && <LoadingOverlay stages={ANALYSIS_STAGES} activeStage={activeStage} />}

          {phase === "result" && (
            <div className="stack-xl" id="results">
              <div className="text-center">
                <span className="eyebrow mb-pill">Results</span>
                <h2>Analysis Results</h2>
              </div>

              <div className="result-grid">
                <div className="stack-xl">
                  <PredictionSummary result={result} />
                  <ExplainableAI />
                </div>
                <div className="stack-xl">
                  <EmergencyRisk />
                  <DiseaseInfo condition={result?.predicted_condition || null} />
                </div>
              </div>

              <Disclaimer />

              <div className="text-center">
                <button type="button" className="btn btn-secondary" onClick={() => run()}>
                  Re-run analysis
                </button>
              </div>
            </div>
          )}
        </div>
      </section>
    </>
  );
}