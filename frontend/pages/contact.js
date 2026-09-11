import Head from "next/head";
import { useState } from "react";

export default function ContactPage() {
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [errors, setErrors] = useState({});
  const [sent, setSent] = useState(false);

  function update(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    const next = {};
    if (!form.name.trim()) next.name = "Please enter your name.";
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email)) next.email = "Please enter a valid email.";
    if (!form.message.trim()) next.message = "Please enter a message.";
    setErrors(next);
    if (Object.keys(next).length === 0) {
      // Wired to a real backend in a future update.
      setSent(true);
    }
  }

  return (
    <>
      <Head>
        <title>Contact — MediXAI</title>
        <meta name="description" content="Contact the MediXAI research team." />
      </Head>

      <section className="section" style={{ paddingBottom: "1rem" }}>
        <div className="container" style={{ maxWidth: 760 }}>
          <span className="eyebrow mb-pill">Get in touch</span>
          <h1>Contact the MediXAI Team</h1>
          <p className="muted">
            Questions about the research, the ML pipeline, or potential academic
            collaboration? Reach out.
          </p>
        </div>
      </section>

      <section className="section" style={{ paddingTop: "1rem" }}>
        <div className="container" style={{ maxWidth: 760 }}>
          {sent ? (
            <div className="card text-center">
              <div className="empty__icon" aria-hidden="true">✓</div>
              <h3>Thank you for your message</h3>
              <p className="muted">
                Your note was received. In this prototype phase, messages are not
                transmitted to a server &mdash; form delivery is wired in a future
                update.
              </p>
              <button type="button" className="btn btn-secondary" onClick={() => setSent(false)}>
                Send another message
              </button>
            </div>
          ) : (
            <form className="form-card" onSubmit={handleSubmit} noValidate>
              <div className="row row--2">
                <div className="field">
                  <label htmlFor="contact-name">Name</label>
                  <input id="contact-name" className="input" value={form.name} onChange={(e) => update("name", e.target.value)} aria-invalid={!!errors.name} />
                  {errors.name && <p className="small" style={{ color: "var(--rose-500)", fontWeight: 600 }}>{errors.name}</p>}
                </div>
                <div className="field">
                  <label htmlFor="contact-email">Email</label>
                  <input id="contact-email" type="email" className="input" value={form.email} onChange={(e) => update("email", e.target.value)} aria-invalid={!!errors.email} />
                  {errors.email && <p className="small" style={{ color: "var(--rose-500)", fontWeight: 600 }}>{errors.email}</p>}
                </div>
              </div>
              <div className="field">
                <label htmlFor="contact-subject">Subject</label>
                <input id="contact-subject" className="input" value={form.subject} onChange={(e) => update("subject", e.target.value)} placeholder="e.g. Research collaboration" />
              </div>
              <div className="field">
                <label htmlFor="contact-message">Message</label>
                <textarea id="contact-message" className="textarea" value={form.message} onChange={(e) => update("message", e.target.value)} aria-invalid={!!errors.message} />
                {errors.message && <p className="small" style={{ color: "var(--rose-500)", fontWeight: 600 }}>{errors.message}</p>}
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: "100%" }}>
                Send message
              </button>
              <p className="small muted" style={{ marginTop: "0.75rem", marginBottom: 0 }}>
                Form submission will be connected to the backend in the next update.
              </p>
            </form>
          )}

          <div className="mt-2" style={{ display: "grid", gap: "0.75rem", gridTemplateColumns: "repeat(auto-fit, minmax(200px,1fr))" }}>
            <div className="card"><h3>📍 Academic</h3><p className="small muted" style={{ margin: 0 }}>University AI Lab research project</p></div>
            <div className="card"><h3>🧠 Focus</h3><p className="small muted" style={{ margin: 0 }}>Healthcare XAI &amp; decision support</p></div>
            <div className="card"><h3>🛠️ Stack</h3><p className="small muted" style={{ margin: 0 }}>Next.js · scikit-learn · Python</p></div>
          </div>
        </div>
      </section>
    </>
  );
}