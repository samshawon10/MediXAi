import Link from "next/link";
import { usePreferences } from "@/context/PreferencesContext";

export default function Footer() {
  const { t } = usePreferences();
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer__grid">
          <div className="footer__brand">
            <span className="nav__logo" aria-hidden="true">+</span> MediXAI
          </div>
          <div className="footer__col">
            <h4>{t("footer.product")}</h4>
            <ul>
              <li><Link href="/symptoms">{t("nav.symptoms")}</Link></li>
              <li><Link href="/how-it-works">{t("nav.how")}</Link></li>
              <li><Link href="/about">{t("nav.about")}</Link></li>
            </ul>
          </div>
          <div className="footer__col">
            <h4>{t("footer.resources")}</h4>
            <ul>
              <li><Link href="/transparency">{t("nav.transparency")}</Link></li>
              <li><Link href="/performance">{t("nav.performance")}</Link></li>
              <li><Link href="/privacy">{t("nav.privacy")}</Link></li>
              <li><Link href="/disclaimer">{t("nav.disclaimer")}</Link></li>
              <li><Link href="/contact">{t("nav.contact")}</Link></li>
            </ul>
          </div>
          <div className="footer__col">
            <h4>{t("footer.responsibility")}</h4>
            <p style={{ fontSize: "0.88rem", color: "#aec6dc" }}>
              {t("footer.responsibilityText")}
            </p>
          </div>
        </div>
        <div className="footer__bottom">
          <span>&copy; {new Date().getFullYear()} MediXAI — {t("footer.copyright")}</span>
          <span>{t("footer.tagline")}</span>
        </div>
      </div>
    </footer>
  );
}
