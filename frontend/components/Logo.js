import Link from "next/link";

export default function Logo({ light = false }) {
  return (
    <Link href="/" className="nav__brand" aria-label="MediXAI home">
      <span className="nav__logo" aria-hidden="true">
        +
      </span>
      <span style={{ color: light ? "#fff" : undefined }}>
        Medi<span style={{ color: "var(--teal-500)" }}>XAI</span>
      </span>
    </Link>
  );
}