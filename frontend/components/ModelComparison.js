import { usePreferences } from "@/context/PreferencesContext";

const names = { naive_bayes: "Naive Bayes", logistic_regression: "Logistic Regression", svm: "SVM", random_forest: "Random Forest" };

export default function ModelComparison({ result }) {
  const { language } = usePreferences();
  const bn = language === "bn";
  if (!result.finalPrediction || !result.modelPredictions) return null;
  const final = result.finalPrediction;
  return <div className="result-details">
    <h3>{bn ? "চারটি মডেলের আলাদা পূর্বাভাস" : "Individual model predictions"}</h3>
    <div className="table-scroll"><table className="data-table">
      <thead><tr><th>{bn ? "মডেল" : "Model"}</th><th>{bn ? "সম্ভাব্য অবস্থা" : "Condition"}</th><th>{bn ? "মডেল স্কোর" : "Model score"}</th></tr></thead>
      <tbody>{result.modelPredictions.map(p => <tr key={p.model}><td>{names[p.model] || p.model}</td><td>{p.condition}</td><td>{p.confidence == null ? (bn ? "উপলব্ধ নয়" : "Unavailable") : `${(p.confidence * 100).toFixed(1)}%`}</td></tr>)}</tbody>
    </table></div>
    <p className="small muted">{bn ? "স্কোরগুলো ক্যালিব্রেট করা নয়। SVM সম্ভাব্যতার স্কোর দেয় না। প্রতিটি মডেলের ভোট সমান।" : "Scores are uncalibrated. SVM does not provide a probability score. Every model has one equal vote."}</p>
    <p><strong>{bn ? "একত্রিত ফলাফল" : "Combined result"}: {final.condition}</strong> · {final.votes}/{final.totalModels} {bn ? "ভোট" : "votes"}</p>
    <p className="small muted">{bn ? "ভোটের সংখ্যা চিকিৎসাগত সম্ভাব্যতা নয়।" : "Vote counts are not medical probabilities."}</p>
    {final.tied && <p role="status">{bn ? "ভোট সমান" : "Tied vote"}: {final.tiedConditions.join(", ")}. {bn ? "ইংরেজি নামের বর্ণানুক্রমে ফল বেছে নেওয়া হয়েছে; কোনো একক বিজয়ী নেই।" : "Alphabetical condition order breaks the tie; there is no unique winner."}</p>}
    <p className="small">{bn ? "নিচের স্কোর ও SHAP ব্যাখ্যার মডেল" : "Model for the scores and SHAP explanation below"}: {names[result.model.name] || result.model.name} — {result.prediction.condition}</p>
  </div>;
}
