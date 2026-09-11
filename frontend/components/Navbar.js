import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import Logo from "./Logo";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/symptoms", label: "Symptom Analysis" },
  { href: "/how-it-works", label: "How It Works" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export default function Navbar() {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  useEffect(() => setOpen(false), [router.pathname]);

  return (
    <header className="nav">
      <div className="container nav__inner">
        <Logo />
        <nav aria-label="Primary">
          <div className="nav__links">
            {LINKS.map((l) => {
              const active = router.pathname === l.href;
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={`nav__link${active ? " nav__link--active" : ""}`}
                  aria-current={active ? "page" : undefined}
                >
                  {l.label}
                </Link>
              );
            })}
            <Link href="/symptoms" className="btn btn-primary nav__cta">
              Analyze
            </Link>
          </div>
        </nav>
        <button
          className="nav__toggle"
          aria-label={open ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
        >
          {open ? "\u2715" : "\u2630"}
        </button>
      </div>
      {open && (
        <nav className="container nav__mobile nav__mobile--open" aria-label="Mobile">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href}>
              {l.label}
            </Link>
          ))}
          <Link href="/symptoms" className="btn btn-primary" style={{ marginTop: "0.5rem" }}>
            Analyze Symptoms
          </Link>
        </nav>
      )}
    </header>
  );
}