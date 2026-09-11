export default function SectionHeading({ eyebrow, title, children, center = false }) {
  return (
    <div className={`section-title${center ? " text-center" : ""}`} style={center ? { marginInline: "auto" } : undefined}>
      {eyebrow && <div className="eyebrow mb-pill">{eyebrow}</div>}
      <h2>{title}</h2>
      {children && <p>{children}</p>}
    </div>
  );
}