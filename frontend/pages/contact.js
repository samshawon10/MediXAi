import Head from "next/head";
import { useState } from "react";
import { usePreferences } from "@/context/PreferencesContext";

export default function ContactPage() {
  const { t } = usePreferences();
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [errors, setErrors] = useState({});
  const [deliveryUnavailable, setDeliveryUnavailable] = useState(false);

  function update(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
    setDeliveryUnavailable(false);
  }

  function handleSubmit(e) {
    e.preventDefault();
    const next = {};
    if (!form.name.trim()) next.name = t("contact.nameError");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email)) next.email = t("contact.emailError");
    if (!form.message.trim()) next.message = t("contact.messageError");
    setErrors(next);
    if (Object.keys(next).length === 0) {
      setDeliveryUnavailable(true);
    }
  }

  return (
    <>
      <Head>
        <title>{t("contact.pageTitle")}</title>
        <meta name="description" content="Contact the MediXAI research team." />
      </Head>

      <section className="section" style={{ paddingBottom: "1rem" }}>
        <div className="container" style={{ maxWidth: 760 }}>
          <span className="eyebrow mb-pill">{t("contact.eyebrow")}</span>
          <h1>{t("contact.title")}</h1>
          <p className="muted">{t("contact.lead")}</p>
        </div>
      </section>

      <section className="section" style={{ paddingTop: "1rem" }}>
        <div className="container" style={{ maxWidth: 760 }}>
          <form className="form-card" onSubmit={handleSubmit} noValidate>
              <p className="form-note" role="note">{t("contact.deliveryUnavailable")}</p>
              <div className="row row--2">
                <div className="field">
                  <label htmlFor="contact-name">{t("contact.name")}</label>
                  <input id="contact-name" className="input" value={form.name} onChange={(e) => update("name", e.target.value)} aria-invalid={!!errors.name} />
                  {errors.name && <p className="small" style={{ color: "var(--rose-500)", fontWeight: 600 }}>{errors.name}</p>}
                </div>
                <div className="field">
                  <label htmlFor="contact-email">{t("contact.email")}</label>
                  <input id="contact-email" type="email" className="input" value={form.email} onChange={(e) => update("email", e.target.value)} aria-invalid={!!errors.email} />
                  {errors.email && <p className="small" style={{ color: "var(--rose-500)", fontWeight: 600 }}>{errors.email}</p>}
                </div>
              </div>
              <div className="field">
                <label htmlFor="contact-subject">{t("contact.subject")}</label>
                <input id="contact-subject" className="input" value={form.subject} onChange={(e) => update("subject", e.target.value)} placeholder={t("contact.subjectPlaceholder")} />
              </div>
              <div className="field">
                <label htmlFor="contact-message">{t("contact.message")}</label>
                <textarea id="contact-message" className="textarea" value={form.message} onChange={(e) => update("message", e.target.value)} aria-invalid={!!errors.message} />
                {errors.message && <p className="small" style={{ color: "var(--rose-500)", fontWeight: 600 }}>{errors.message}</p>}
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: "100%" }}>
                {t("contact.send")}
              </button>
              <p className="small muted" style={{ marginTop: "0.75rem", marginBottom: 0 }}>
                {t("contact.note")}
              </p>
              {deliveryUnavailable && <p className="small" role="status" style={{ color: "var(--risk-ink)", fontWeight: 600, marginTop: "0.75rem" }}>{t("contact.deliveryResult")}</p>}
          </form>

          <div className="mt-2" style={{ display: "grid", gap: "0.75rem", gridTemplateColumns: "repeat(auto-fit, minmax(200px,1fr))" }}>
            <div className="card"><h3>{t("contact.academic")}</h3><p className="small muted" style={{ margin: 0 }}>{t("contact.academicText")}</p></div>
            <div className="card"><h3>{t("contact.focus")}</h3><p className="small muted" style={{ margin: 0 }}>{t("contact.focusText")}</p></div>
            <div className="card"><h3>{t("contact.stack")}</h3><p className="small muted" style={{ margin: 0 }}>Next.js · scikit-learn · Python</p></div>
          </div>
        </div>
      </section>
    </>
  );
}