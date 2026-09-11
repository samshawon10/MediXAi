import Head from "next/head";
import Button from "@/components/Button";

export default function NotFoundPage() {
  return (
    <>
      <Head><title>Page not found — MediXAI</title></Head>
      <section className="section">
        <div className="container text-center" style={{ maxWidth: 520, marginInline: "auto" }}>
          <div className="empty__icon" aria-hidden="true">🔍</div>
          <h1>Page not found</h1>
          <p className="muted">The page you are looking for does not exist or has moved.</p>
          <Button href="/" as="link">Back to home</Button>
        </div>
      </section>
    </>
  );
}