import Link from "next/link";
import Logo from "./Logo";

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer__grid">
          <div className="footer__brand">
            <span className="nav__logo" aria-hidden="true">+</span> MediXAI
          </div>
          <div className="footer__col">
            <h4>Product</h4>
            <ul>
              <li><Link href="/symptoms">Symptom Analysis</Link></li>
              <li><Link href="/how-it-works">How It Works</Link></li>
              <li><Link href="/about">About</Link></li>
            </ul>
          </div>
          <div className="footer__col">
            <h4>Resources</h4>
            <ul>
              <li><Link href="/reports/phase1_30_percent.md">Phase 1 Report</Link></li>
              <li><Link href="/how-it-works">ML Pipeline</Link></li>
              <li><Link href="/contact">Contact</Link></li>
            </ul>
          </div>
          <div className="footer__col">
            <h4>Responsibility</h4>
            <p style={{ fontSize: "0.88rem", color: "#aec6dc" }}>
              MediXAI is an academic decision-support prototype, not a medical
              diagnostic tool.
            </p>
          </div>
        </div>
        <div className="footer__bottom">
          <span>&copy; {new Date().getFullYear()} MediXAI — Academic research project.</span>
          <span>Explainable AI for Intelligent Healthcare Decision Support.</span>
        </div>
      </div>
    </footer>
  );
}