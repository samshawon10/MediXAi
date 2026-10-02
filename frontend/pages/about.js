import Head from "next/head";
import SectionHeading from "@/components/SectionHeading";
import ProductBadge from "@/components/ProductBadge";
import Button from "@/components/Button";
import { usePreferences } from "@/context/PreferencesContext";

const PRINCIPLES = [
  { icon: "🛡️", tone: "emerald", title: "about.principle1", text: "about.principle1Text" },
  { icon: "🔬", tone: "teal", title: "about.principle2", text: "about.principle2Text" },
  { icon: "🤝", tone: "indigo", title: "about.principle3", text: "about.principle3Text" },
  { icon: "🌐", tone: "violet", title: "about.principle4", text: "about.principle4Text" },
];

export default function AboutPage() {
  const { t } = usePreferences();
  return (
    <>
      <Head>
        <title>{t("page.aboutTitle")}</title>
        <meta name="description" content={t("page.aboutDescription")} />
      </Head>

      <section className="section" style={{ paddingBottom: "1rem" }}>
        <div className="container" style={{ maxWidth: 820 }}>
          <span className="eyebrow mb-pill">{t("about.eyebrow")}</span>
          <h1>{t("about.title")}</h1>
          <p className="muted" style={{ fontSize: "1.08rem" }}>{t("about.lead")}</p>
        </div>
      </section>

      <section className="section section--alt" style={{ paddingTop: "3rem" }}>
        <div className="container">
          <SectionHeading eyebrow={t("about.build")} title={t("about.principles")} center />
          <div className="grid grid--2 mt-2">
            {PRINCIPLES.map((p) => (
              <article className="card card--hover" key={p.title}>
                <div className={`card__icon card__icon--${p.tone}`} aria-hidden="true">{p.icon}</div>
                <h3>{t(p.title)}</h3>
                <p className="muted">{t(p.text)}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container" style={{ maxWidth: 820 }}>
          <h2>{t("about.status")}</h2>
          <p className="muted">
            {t("about.statusText")}
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", marginTop: "1rem" }}>
            <ProductBadge status="live" />
          </div>
          <div className="mt-2">
            <Button href="/how-it-works" variant="secondary" as="link">{t("about.explore")}</Button>
          </div>
          <div className="disclaimer mt-2" role="note">
            <span aria-hidden="true">&#9888;&#65039;</span>
            <span>{t("about.disclaimer")}</span>
          </div>
        </div>
      </section>
    </>
  );
}
