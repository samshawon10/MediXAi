import Link from "next/link";
import { usePreferences } from "@/context/PreferencesContext";

export default function Logo({ light = false }) {
  const { t } = usePreferences();
  return (
    <Link href="/" className="nav__brand" aria-label={`MediXAI — ${t("nav.home")}`}>
      <span className="nav__logo" aria-hidden="true">
        +
      </span>
      <span style={{ color: light ? "#fff" : undefined }}>
        Medi<span style={{ color: "var(--brand-accent)" }}>XAI</span>
      </span>
    </Link>
  );
}