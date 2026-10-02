import { usePreferences } from "@/context/PreferencesContext";
import { Activity, HeartPulse, House, ShieldCheck, CircleCheck, Info } from "lucide-react";
import ModelComparison from "./ModelComparison";
import ExplainableAI from "./ExplainableAI";
import EmergencyRisk from "./EmergencyRisk";

function Step({ number, title, hint, tone, children }) {
  return <section className={`check-step check-step--${tone}`}><header><span className="check-step__number">{number}</span><div><h3>{title}</h3><p>{hint}</p></div></header><div className="check-step__body">{children}</div></section>;
}

export default function SimpleResults({ result }) {
  const { language, t } = usePreferences();
  const bn = language === "bn";
  const say = (en, bangla) => bn ? bangla : en;
  const final = result.finalPrediction;
  const condition = final?.condition || result.prediction.condition;
  const features = [...(result.explanation?.features || [])].sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact)).slice(0, 4);
  return <div className="check-results">
    {result.risk?.urgent && <EmergencyRisk risk={result.risk} />}
    <Step number="1" tone="blue" title={say("Your symptom summary", "আপনার উপসর্গের সারাংশ")} hint={say("These are the symptoms we recognized.", "আপনার লেখা থেকে এই উপসর্গগুলো চেনা গেছে।")}>
      <div className="check-tags">{result.normalizedSymptoms.map(s => <span key={s}>{s}</span>)}</div>
      <p className="check-recognized"><CircleCheck size={17} aria-hidden="true" />{say(`${result.normalizedSymptoms.length} symptoms recognized from your description.`, `আপনার লেখা থেকে ${result.normalizedSymptoms.length}টি উপসর্গ চেনা গেছে।`)}</p>
      {result.unrecognizedSymptoms?.length > 0 && <p>{say("Some symptoms were not recognized:", "কিছু উপসর্গ চেনা যায়নি:")} {result.unrecognizedSymptoms.join(", ")}</p>}
    </Step>
    <Step number="2" tone="green" title={say("What the AI found", "AI কী খুঁজে পেয়েছে")} hint={say("A possible match from the model results, not a diagnosis.", "মডেলের ফল অনুযায়ী একটি সম্ভাব্য মিল—এটি রোগ নির্ণয় নয়।")}>
      <div className="check-findings"><div className="check-match"><div className="check-match__icon"><Activity size={32} aria-hidden="true" /></div><div><span className="check-match-label">{say("Combined model result", "মডেলগুলোর সম্মিলিত ফল")}</span><h2>{condition}</h2><p>{final ? <>{say("Model agreement", "মডেলের ভোট")}: <strong className="check-votes">{final.votes}/{final.totalModels}</strong></> : say("Selected model prediction", "নির্বাচিত মডেলের পূর্বাভাস")}</p><p className="small muted">{say("A possible pattern match, not a confirmed condition.", "একটি সম্ভাব্য মিল, নিশ্চিত রোগ নয়।")}</p></div></div><aside className="check-model-panel"><h4>{say("Individual model results", "প্রতিটি মডেলের ফল")}</h4>{result.modelPredictions ? result.modelPredictions.map(p => <div key={p.model}><span>{({naive_bayes: "Naive Bayes", logistic_regression: "Logistic Regression", svm: "SVM", random_forest: "Random Forest"})[p.model]}</span><strong>{p.condition}</strong></div>) : <p>{result.model.name}: {result.prediction.condition}</p>}</aside></div>
      {final?.tied && <p className="check-caution">{say("The models disagree: there is a tied vote. The displayed result was chosen alphabetically, not because it was more certain.", "মডেলগুলোর ভোট সমান হয়েছে। দেখানো ফলটি নামের বর্ণানুক্রমে বেছে নেওয়া, বেশি নিশ্চিত বলে নয়।")}</p>}
      <p className="check-caution">{say("This academic model performed near chance in testing. Treat this as a demonstration, not a reliable health assessment.", "এই শিক্ষামূলক মডেলের পরীক্ষার ফল প্রায় অনুমানের সমান। এটি নির্ভরযোগ্য স্বাস্থ্য মূল্যায়ন নয়।")}</p>
      <details className="check-disclosure"><summary>{say("See model scores and voting details", "মডেল স্কোর ও ভোটের বিস্তারিত দেখুন")}</summary><ModelComparison result={result} />{!final && <p>{result.prediction.condition} · {result.prediction.confidence == null ? t("common.unavailable") : `${(result.prediction.confidence * 100).toFixed(1)}%`}</p>}</details>
    </Step>
    <Step number="3" tone="amber" title={say("Do I need urgent help?", "জরুরি সাহায্য দরকার কি?")} hint={say("A separate check for a limited set of warning phrases.", "কিছু সতর্কতামূলক শব্দের জন্য আলাদা পরীক্ষা।")}>
      <p className="check-risk" role={result.risk?.urgent ? "alert" : undefined}>{!result.risk?.available ? say("The warning check is unavailable.", "সতর্কতার পরীক্ষা এখন পাওয়া যাচ্ছে না।") : result.risk.urgent ? t("risk.urgentGuidance") : say("No configured warning phrases were detected. This does not mean you are safe. Seek professional care for severe, worsening or concerning symptoms.", "নির্ধারিত সতর্কতার শব্দ পাওয়া যায়নি। এর মানে আপনি নিরাপদ নন। উপসর্গ তীব্র হলে, বাড়লে বা উদ্বেগজনক হলে চিকিৎসকের সাহায্য নিন।")}</p>
      <details className="check-disclosure"><summary>{say("About this warning check", "এই পরীক্ষার বিস্তারিত")}</summary><EmergencyRisk risk={result.risk} /></details>
    </Step>
    <Step number="4" tone="purple" title={say("Why this result appeared", "এই ফল কেন এসেছে")} hint={say(`These features influenced ${result.model.name}'s prediction of ${result.prediction.condition}. They do not explain the combined vote.`, `${result.model.name}-এর ${result.prediction.condition} পূর্বাভাসে এই বৈশিষ্ট্যগুলোর প্রভাব ছিল। এগুলো সম্মিলিত ভোটের ব্যাখ্যা নয়।`)}>
      {result.explanation?.available && features.length ? <div className="check-influence-columns">{[true, false].map(positive => <div key={String(positive)} className={`check-influence-panel${positive ? " check-influence-panel--positive" : ""}`}><h4>{positive ? say("Features increasing this score", "স্কোর বাড়ানো বৈশিষ্ট্য") : say("Features reducing or not changing this score", "স্কোর কমানো বা অপরিবর্তিত রাখা বৈশিষ্ট্য")}</h4><div className="check-influences">{features.filter(f => (f.impact > 0) === positive).map(f => <div key={f.feature}>{positive ? <CircleCheck size={16} aria-hidden="true" /> : <Info size={16} aria-hidden="true" />}<strong>{f.feature}</strong><span>{f.impact > 0 ? say("Increased the model score", "মডেল স্কোর বাড়িয়েছে") : f.impact < 0 ? say("Decreased the model score", "মডেল স্কোর কমিয়েছে") : say("No change to the model score", "স্কোরে পরিবর্তন নেই")}</span></div>)}</div>{!features.some(f => (f.impact > 0) === positive) && <p className="small muted">{say("None among the displayed features.", "দেখানো বৈশিষ্ট্যগুলোর মধ্যে নেই।")}</p>}</div>)}</div> : <p>{t("result.explanationFallback")}</p>}
      <details className="check-disclosure"><summary>{say("View detailed AI explanation", "AI ব্যাখ্যার বিস্তারিত দেখুন")}</summary><ExplainableAI explanation={result.explanation} /></details>
    </Step>
    <Step number="5" tone="blue" title={say("What should I do next?", "এখন কী করবেন?")} hint={say("General guidance, not advice based on the predicted disease.", "সাধারণ নির্দেশনা; অনুমান করা রোগের ভিত্তিতে চিকিৎসার পরামর্শ নয়।")}>
      <div className="check-next">{[[House, say("Keep track of your symptoms", "উপসর্গ খেয়াল রাখুন"), say("Note how you feel and any changes.", "কেমন লাগছে ও কী পরিবর্তন হচ্ছে লিখে রাখুন।")], [HeartPulse, say("Speak with a healthcare professional", "চিকিৎসকের সঙ্গে কথা বলুন"), say("Especially if symptoms persist or worsen.", "বিশেষ করে উপসর্গ থাকলে বা বাড়লে।")], [ShieldCheck, say("Get urgent help when needed", "প্রয়োজনে জরুরি সাহায্য নিন"), say("Do not wait for an AI result if symptoms are severe.", "তীব্র উপসর্গ হলে AI-এর ফলের জন্য অপেক্ষা করবেন না।")]].map(([Icon, title, text]) => <div key={title}><Icon size={25} aria-hidden="true" /><strong>{title}</strong><p>{text}</p></div>)}</div>
    </Step>
    <p className="check-footnote">{t("disclaimer.default")}</p>
  </div>;
}
