import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useRef, useState } from "react";
import { Activity, Home, Info, LayoutDashboard, Menu, ShieldCheck, Waypoints, X } from "lucide-react";
import Logo from "./Logo";
import PreferenceControls from "./PreferenceControls";
import { usePreferences } from "@/context/PreferencesContext";
import { useAuth } from "@/context/AuthContext";

const LINKS = [
  { href: "/", key: "nav.home", icon: Home },
  { href: "/symptoms", key: "nav.symptoms", icon: Activity },
  { href: "/how-it-works", key: "nav.how", icon: Waypoints },
  { href: "/transparency", key: "nav.transparency", icon: ShieldCheck },
  { href: "/about", key: "nav.about", icon: Info },
];

export default function Navbar() {
  const router = useRouter();
  const { t } = usePreferences();
  const { user, loading } = useAuth();
  const [open, setOpen] = useState(false);
  const toggle = useRef(null);
  const header = useRef(null);

  useEffect(() => setOpen(false), [router.pathname]);
  useEffect(() => {
    const close = (event) => { if (event.key === "Escape" && open) { setOpen(false); toggle.current?.focus(); } };
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const closeOutside = event => { if (!header.current?.contains(event.target)) setOpen(false); };
    const closeWide = () => { if (window.innerWidth > 1180) setOpen(false); };
    document.addEventListener("pointerdown", closeOutside);
    window.addEventListener("resize", closeWide);
    return () => { document.removeEventListener("pointerdown", closeOutside); window.removeEventListener("resize", closeWide); };
  }, [open]);

  return (
    <header className="nav" ref={header}>
      <div className="container nav__inner">
        <Logo />
        <nav className="nav__desktop" aria-label={t("nav.primary")}>
          <div className="nav__links">
            {LINKS.map((l) => {
              const active = router.pathname === l.href;
              const Icon = l.icon;
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={`nav__link${active ? " nav__link--active" : ""}`}
                  aria-current={active ? "page" : undefined}
                >
                  <Icon className="nav__link-icon" size={16} strokeWidth={1.8} aria-hidden="true" />
                  {t(l.key)}
                </Link>
              );
            })}
            <PreferenceControls placement="desktop" />
            <Link href={user ? "/dashboard" : "/login"} className="btn btn-primary nav__cta" aria-busy={loading}>
              <LayoutDashboard size={16} strokeWidth={1.9} aria-hidden="true" />
              {t(user ? "dash.title" : "account.login")}
            </Link>
          </div>
        </nav>
        <button
          className="nav__toggle"
          ref={toggle}
          aria-controls="mobile-navigation"
          aria-label={open ? t("nav.close") : t("nav.open")}
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
        >
          {open ? <X size={22} aria-hidden="true" /> : <Menu size={23} aria-hidden="true" />}
        </button>
      </div>
      {open && (
        <nav id="mobile-navigation" className="container nav__mobile nav__mobile--open" aria-label={t("nav.mobile")}>
          {LINKS.map((l) => {
            const Icon = l.icon;
            return <Link key={l.href} href={l.href} onClick={() => setOpen(false)} aria-current={router.pathname === l.href ? "page" : undefined}>
              <Icon size={18} strokeWidth={1.8} aria-hidden="true" />
              {t(l.key)}
            </Link>;
          })}
          <PreferenceControls placement="mobile" />
          <Link href={user ? "/dashboard" : "/login"} className="btn btn-primary" style={{ marginTop: "0.5rem" }}>
            <LayoutDashboard size={16} strokeWidth={1.9} aria-hidden="true" />
            {t(user ? "dash.title" : "account.login")}
          </Link>
        </nav>
      )}
    </header>
  );
}
