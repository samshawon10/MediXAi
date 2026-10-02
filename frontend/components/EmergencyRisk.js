import { usePreferences } from "@/context/PreferencesContext";
import { AlertTriangle } from "lucide-react";

export default function EmergencyRisk({ risk }) {
  const { t } = usePreferences();
  const urgent = risk?.urgent || ["HIGH", "CRITICAL"].includes(risk?.level);
  const levelKey = { critical: "risk.critical", high: "risk.high", unassessed: "risk.unassessed" };
  const phraseTranslations = {
    "severe breathing difficulty": "risk.severeBreathing",
    "severe chest pain": "risk.severeChest",
    "loss of consciousness": "risk.lossConsciousness",
    "severe bleeding": "risk.severeBleeding",
    "blue lips": "risk.blueLips",
    seizure: "risk.seizure",
    "sudden weakness": "risk.suddenWeakness",
    "sudden confusion": "risk.suddenConfusion",
    "severe allergic reaction": "risk.severeAllergy",
    "severe trauma": "risk.severeTrauma",
    "breathing difficulty": "risk.breathing",
    "chest pain": "risk.chestPain",
    confusion: "risk.confusion",
  };
  const levelText = (level) => t(levelKey[String(level).toLowerCase()] || "result.riskUnavailable");
  const riskText = (text, kind) => {
    const known = {
      guidance: {
        "These symptoms may require urgent medical attention. Seek immediate professional medical assistance or contact your local emergency service.": "risk.urgentGuidance",
        "No configured emergency phrases were detected. This does not establish low risk.": "risk.noPhraseGuidance",
      },
      limitation: {
        "This limited academic rule set cannot rule out an emergency. Seek professional care for severe, worsening, or concerning symptoms, regardless of this result.": "risk.limitation",
      },
      context: {
        "Mentions are flagged conservatively, including negated or historical mentions; this rule set cannot reliably interpret context.": "risk.context",
      },
    };
    if (known[kind]?.[text]) return t(known[kind][text]);
    return text;
  };
  return (
    <section className={`card risk-card${urgent ? " risk-card--urgent" : ""}`} aria-label={t("result.emergency")} role={urgent ? "alert" : undefined}>
      <h3 className="icon-heading"><AlertTriangle size={20} aria-hidden="true" />{t("result.emergency")}</h3>
      <p className="risk-level">{risk?.level ? levelText(risk.level) : t("result.riskUnavailable")}</p>
      <p className="small muted">{t("result.riskNote")}</p>
      <p className={urgent ? "risk-guidance" : ""}>{!risk?.available ? t("result.guidanceUnavailable") : risk?.guidance ? riskText(risk.guidance, "guidance") : t("result.guidanceUnavailable")}</p>
      {risk?.reasons?.length > 0 && <><h4>{t("result.indicators")}</h4><ul>{risk.reasons.map((r) => <li key={r.symptom}>{t(phraseTranslations[r.symptom] || "") || r.symptom} · {levelText(r.level)}</li>)}</ul></>}
      <p>{risk?.limitation ? riskText(risk.limitation, "limitation") : t("result.riskLimit")}</p>
      {risk?.contextNote && <p className="small muted">{riskText(risk.contextNote, "context")}</p>}
      <details className="disclosure"><summary>{t("result.technical")}</summary><p className="small">{t("research.riskText")}</p>{risk?.sources?.map(url => <p className="small" key={url}><a href={url} target="_blank" rel="noreferrer">{url.includes("nhs.uk") ? "NHS" : "MedlinePlus"}: {url.split("/").filter(Boolean).pop()} ↗</a></p>)}</details>
    </section>
  );
}
