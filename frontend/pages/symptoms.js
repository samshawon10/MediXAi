import Head from "next/head";
import { useEffect, useRef, useState } from "react";
import useSymptomInput from "@/hooks/useSymptomInput";
import useAnalysis, { ANALYSIS_STAGES } from "@/hooks/useAnalysis";
import { analyzeSymptoms } from "@/services/api";
import Link from "next/link";
import AnalysisReport from "@/components/AnalysisReport";
import SymptomInput from "@/components/SymptomInput";
import LoadingOverlay from "@/components/LoadingOverlay";
import PredictionSummary from "@/components/PredictionSummary";
import EmergencyRisk from "@/components/EmergencyRisk";
import { usePreferences } from "@/context/PreferencesContext";
import { RequireAuth } from "@/components/platform/Workspace";
import { ReportButton } from "@/components/platform/UserWorkspace";
import SimpleResults from "@/components/SimpleResults";
import { FilePenLine, Sparkles, ShieldCheck, ArrowRight } from "lucide-react";

export default function SymptomAnalysisPage() {
  return <RequireAuth><AnalysisWorkspace /></RequireAuth>;
}
export function AnalysisWorkspace() {
  const { t, language: displayLanguage } = usePreferences();
  const say = (en, bn) => displayLanguage === "bn" ? bn : en;
  const input = useSymptomInput();
  const [language, setLanguage] = useState("en");
  const [consent, setConsent] = useState(false);
  const { phase, activeStage, result, run, reset } = useAnalysis();
  const heading = useRef(null);
  useEffect(() => { if (phase === "result") heading.current?.focus(); }, [phase]);

  async function handleSubmit(event) {
    event?.preventDefault();
    if (phase === "loading") return;
    const symptoms = [...input.chips, input.text.trim()].filter(Boolean).join(", ");
    if (!symptoms || !/[a-zA-Z\u0980-\u09ff]/u.test(symptoms)) { input.setError(t("input.errorEmpty")); return; }
    if (symptoms.length > 2000) { input.setError(t("input.errorLong")); return; }
    if (!consent) { input.setError(t("dash.consentRequired")); return; }
    input.setError("");
    await run((signal) => analyzeSymptoms({ symptoms, language, disclaimerAccepted: true }, signal));
  }

  return <>
    <Head><title>{t("page.symptomTitle")}</title><meta name="description" content={t("page.symptomDescription")} /></Head>
    <div className="symptom-check">
    {phase !== "result" && <><section className="check-intro"><div className="container check-width">
      <span className="eyebrow mb-pill">{say("SYMPTOM CHECK", "উপসর্গ পরীক্ষা")}</span><h1>{say("Check My Symptoms", "আপনার উপসর্গ জানান")}</h1>
      <p className="muted">{say("Describe how you feel and get a simple AI-assisted summary.", "কেমন লাগছে লিখুন, সহজ ভাষায় AI-এর সারাংশ দেখুন।")}</p>
      <div className="check-benefits">{[[FilePenLine, say("Simple & easy", "সহজে লিখুন"), say("Just type your symptoms", "আপনার উপসর্গ লিখুন")], [Sparkles, say("AI analysis", "AI বিশ্লেষণ"), say("See possible matches", "সম্ভাব্য মিল দেখুন")], [ShieldCheck, say("Understand better", "সহজে বুঝুন"), say("Clear results and guidance", "ফল ও নির্দেশনা দেখুন")]].map(([Icon, title, text]) => <div key={title}><span><Icon size={24} aria-hidden="true" /></span><div><strong>{title}</strong><p>{text}</p></div></div>)}</div>
    </div></section>
    <section className="section" style={{ paddingTop: 0 }}><div className="container check-width">
      <form className="form-card analysis-form" onSubmit={handleSubmit} noValidate>
        <fieldset disabled={phase === "loading"} className="analysis-fields">
          <legend className="visually-hidden">{t("symptom.inputLegend")}</legend>
          <div className="check-form-heading"><div><h2>{say("Describe your current symptoms", "আপনার বর্তমান উপসর্গ লিখুন")}</h2><p className="small muted">{say("You can write in English or বাংলা.", "English বা বাংলায় লিখতে পারেন।")}</p></div><div className="check-language" role="group" aria-label={t("symptom.language")}>{["en", "bn"].map(value => <button key={value} type="button" aria-pressed={language === value} onClick={() => setLanguage(value)}>{value === "en" ? "English" : "বাংলা"}</button>)}</div></div>
          <SymptomInput {...input} inputLanguage={language} disabled={phase === "loading"} />
          <p className="form-note">{t("symptom.privacy")}</p><Link href="/privacy" className="small">{t("nav.privacy")} →</Link>
          <label className="history-consent"><input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} /> {t("dash.storageConsent")}</label>
          <button type="submit" className="btn btn-primary btn-lg check-submit">{phase === "loading" ? t("symptom.analyzing") : say("Check My Symptoms", "আমার উপসর্গ পরীক্ষা করুন")}<ArrowRight size={21} aria-hidden="true" /></button>
          <div className="check-important"><strong>{say("Important", "মনে রাখুন")}</strong><p>{say("This is AI-assisted information, not a medical diagnosis. Seek professional care for severe or worsening symptoms.", "এটি AI-এর সহায়তায় তথ্য, চিকিৎসা নির্ণয় নয়। তীব্র বা বাড়তে থাকা উপসর্গে চিকিৎসকের সাহায্য নিন।")}</p></div>
        </fieldset>
      </form>
    </div></section></>}
    {phase !== "idle" && <section className="section check-result-section"><div className="container check-width" aria-busy={phase === "loading"}>
      {phase === "loading" && <><LoadingOverlay stages={ANALYSIS_STAGES} activeStage={activeStage} /><div className="result-grid" aria-hidden="true"><div className="skeleton" /><div className="skeleton" /></div><button type="button" className="btn btn-secondary mt-1" onClick={reset}>{t("symptom.cancel")}</button></>}
      {phase === "result" && <div className="stack-xl" id="results">
        <button type="button" className="link-btn" onClick={reset}>← {say("Back to symptoms", "উপসর্গ লেখায় ফিরে যান")}</button>
        <div className="result-heading check-result-heading"><div><h1 ref={heading} tabIndex={-1}>{say("Your Results", "আপনার ফলাফল")}</h1><p className="muted">{say("A simple summary based on the symptoms you entered.", "আপনার দেওয়া উপসর্গের ভিত্তিতে সহজ একটি সারাংশ।")}</p></div><div className="check-heading-actions">{result?.success && <><span className="check-saved"><ShieldCheck size={15} aria-hidden="true" />{say("Saved to your history", "আপনার ইতিহাসে সংরক্ষিত")}</span><ReportButton result={result} /></>}<button type="button" className="btn btn-primary" onClick={() => { reset(); input.clearAll(); }}>{say("Check Another Symptom", "আরেকটি উপসর্গ পরীক্ষা করুন")}</button></div></div>
        {result?.success ? <SimpleResults result={result} /> : <><EmergencyRisk risk={result?.risk} /><PredictionSummary result={result} /></>}
        <div className="result-actions"><button type="button" className="btn btn-primary" onClick={handleSubmit}>{t(result?.success ? "symptom.rerun" : "result.retry")}</button><button type="button" className="btn btn-secondary" onClick={() => { reset(); input.clearAll(); document.getElementById("symptom-input")?.focus(); }}>{t("result.new")}</button></div>
      </div>}
    </div></section>}
    </div>
    <AnalysisReport result={result} />
  </>;
}
