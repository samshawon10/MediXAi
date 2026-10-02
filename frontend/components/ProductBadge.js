import { usePreferences } from "@/context/PreferencesContext";

export default function ProductBadge({ status }) {
  const { t } = usePreferences();
  const map = {
    live: { cls: "badge--live", label: t("badge.live") },
    coming: { cls: "badge--coming", label: t("badge.coming") },
    dev: { cls: "badge--dev", label: t("badge.dev") },
    info: { cls: "badge--info", label: t("badge.info") },
  };
  const s = map[status] || map.info;
  return (
    <span className={`badge ${s.cls}`}>
      <span aria-hidden="true">{status === "live" ? "\u2713" : "\u26A0"}</span>
      {s.label}
    </span>
  );
}