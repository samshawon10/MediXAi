import Link from "next/link";

export default function Button({ as, href, children, variant = "primary", size, disabled, type, onClick, className = "" }) {
  const cls = `btn btn-${variant}${size === "lg" ? " btn-lg" : ""} ${className}`.trim();
  if (href && as !== "button") {
    return (
      <Link href={href} className={cls} aria-disabled={disabled}>
        {children}
      </Link>
    );
  }
  return (
    <button type={type || "button"} className={cls} disabled={disabled} onClick={onClick}>
      {children}
    </button>
  );
}