import { usePreferences } from "@/context/PreferencesContext";
import { Check, Circle, LoaderCircle } from "lucide-react";

export default function LoadingOverlay({ stages, activeStage }) {
  const { t } = usePreferences();
  return (
    <div className="analysis" role="status" aria-live="polite" aria-label={t("loading.label")}>
      <div className="analysis__head">
        <div className="spinner" aria-hidden="true" />
        <h2 style={{ fontSize: "1.3rem" }}>{t("loading.title")}</h2>
        <p className="muted small" style={{ marginTop: "0.5rem" }}>
          {t("loading.text")}
        </p>
      </div>
      <ol className="stages">
        {stages.map((s, i) => {
          const active = i === activeStage;
          const done = i < activeStage;
          return (
            <li
              key={s.id}
              className={`stage${done ? " stage--done" : ""}${active ? " stage--active" : ""}`}
            >
              <span className="stage__icon" aria-hidden="true">
                {done ? <Check size={16} strokeWidth={2.3} /> : active ? <LoaderCircle size={16} className="stage__loading" /> : <Circle size={11} />}
              </span>
              <span>{t("loading.stage")}</span>
              {active && (
                <span className="muted small" style={{ marginLeft: "auto" }}>
                  {t("loading.working")}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
