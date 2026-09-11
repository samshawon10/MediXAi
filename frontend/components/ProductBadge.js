export default function ProductBadge({ status }) {
  const map = {
    live: { cls: "badge--live", label: "Live" },
    coming: { cls: "badge--coming", label: "Coming in Next Update" },
    dev: { cls: "badge--dev", label: "Under Development" },
    info: { cls: "badge--info", label: "Info" },
  };
  const s = map[status] || map.info;
  return (
    <span className={`badge ${s.cls}`}>
      <span aria-hidden="true">{status === "live" ? "\u2713" : "\u26A0"}</span>
      {s.label}
    </span>
  );
}