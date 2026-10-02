import Head from "next/head";
import Button from "@/components/Button";
import SectionHeading from "@/components/SectionHeading";
import FeatureCard from "@/components/FeatureCard";
import Pipeline from "@/components/Pipeline";
import Disclaimer from "@/components/Disclaimer";
import InteractiveDemo from "@/components/InteractiveDemo";
import Link from "next/link";
import { usePreferences } from "@/context/PreferencesContext";

const FEATURES = [
  { icon: "01", tone: "teal", title: "home.feature1", text: "home.feature1Text" },
  { icon: "02", tone: "teal", title: "home.feature2", text: "home.feature2Text" },
  { icon: "03", tone: "teal", title: "home.feature3", text: "home.feature3Text" },
  { icon: "04", tone: "teal", title: "home.feature4", text: "home.feature4Text" },
  { icon: "05", tone: "teal", title: "home.feature5", text: "home.feature5Text" },
  { icon: "06", tone: "teal", title: "home.feature6", text: "home.feature6Text" },
];

export default function HomePage() {
  const { t, language } = usePreferences();
  const faqs = language === "bn" ? [
    ["MediXAI কি চিকিৎসা নির্ণয় করে?", "না। এটি মডেল-তৈরি সিদ্ধান্ত-সহায়ক তথ্য দেয়; পেশাদার চিকিৎসা মূল্যায়নের বিকল্প নয়।"],
    ["জরুরি সূচকটি কীভাবে কাজ করে?", "এটি পূর্বনির্ধারিত বাক্যাংশ আলাদাভাবে পরীক্ষা করে। মডেলের পূর্বাভাস থেকে এটি স্বাধীন এবং কোনো মিল না পাওয়া নিরাপদ থাকার নিশ্চয়তা নয়।"],
    ["আমার বিশ্লেষণের তথ্য কোথায় থাকে?", "সম্মতি দিয়ে বিশ্লেষণ জমা দিলে তা আপনার ব্যক্তিগত অ্যাকাউন্টে থাকে। History থেকে আপনি সেটি মুছতে পারেন।"],
  ] : [
    ["Does MediXAI provide a diagnosis?", "No. It provides model-generated decision-support information and does not replace professional medical evaluation."],
    ["How does the emergency indicator work?", "It checks configured phrases separately from the model prediction. No matching phrase is not evidence that it is safe to wait."],
    ["Where is my analysis stored?", "When you consent and submit an analysis, it is stored in your private account. You can remove it from Analysis History."],
  ];
  return (
    <>
      <Head>
        <title>{t("page.homeTitle")}</title>
        <meta name="description" content={t("page.homeDescription")} />
      </Head>

      {/* Hero */}
      <section className="hero">
        <div className="container hero__grid">
          <div>
            <span className="eyebrow mb-pill">{t("home.eyebrow")}</span>
            <h1 className="hero__title">
              {t("home.title")}
            </h1>
            <p className="hero__lead">{t("home.lead")}</p>
            <div className="hero__actions">
              <Button href="/symptoms" size="lg" as="link">{t("home.analyze")}</Button>
              <Button href="/how-it-works" variant="secondary" size="lg" as="link">{t("home.how")}</Button>
            </div>
            <div className="hero__trust">
              <span>{t("home.trust1")}</span>
              <span>{t("home.trust2")}</span>
              <span>{t("home.trust3")}</span>
            </div>
          </div>

          <div className="hero__visual"><InteractiveDemo /></div>
        </div>
      </section>
      <div className="research-notice"><div className="container"><span>{t("result.modelLimitation")}</span><Link href="/transparency">{t("common.read")} →</Link></div></div>

      {/* Features */}
      <section className="section" aria-label={t("home.features")}>
        <div className="container">
          <SectionHeading eyebrow={t("home.capabilities")} title={t("home.features")} center>
            {t("home.featuresLead")}
          </SectionHeading>
          <div className="grid grid--3 mt-2">
            {FEATURES.map((f) => (
              <FeatureCard key={f.title} {...f} title={t(f.title)} text={t(f.text)} />
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="section section--alt home-pipeline" aria-label={t("home.pipelineTitle")}>
        <div className="container">
          <div className="stack-xl">
            <SectionHeading eyebrow={t("home.pipeline")} title={t("home.pipelineTitle")} center>
              {t("home.pipelineLead")}
            </SectionHeading>
            <Pipeline />
          </div>
        </div>
      </section>

      {/* Architecture note */}
      <section className="section" aria-labelledby="arch-title">
        <div className="container">
          <div className="card text-center" style={{ maxWidth: 760, marginInline: "auto" }}>
            <h3 id="arch-title" style={{ marginTop: "0.2em" }}>{t("home.architecture")}</h3>
            <p className="muted">
              {t("home.architectureText")}
            </p>
            <Button href="/how-it-works" variant="secondary" as="link">{t("home.architectureLink")}</Button>
          </div>
        </div>
      </section>

      <section className="section section--alt" aria-labelledby="faq-title">
        <div className="container faq-layout">
          <div><span className="eyebrow">{language === "bn" ? "সাধারণ প্রশ্ন" : "Common questions"}</span><h2 id="faq-title">{language === "bn" ? "পরিষ্কার তথ্য, সতর্ক ব্যবহার" : "Clear information for careful use"}</h2><p className="muted">{language === "bn" ? "MediXAI কী করে এবং কোথায় এর সীমা—তা আগে থেকেই জানুন।" : "Understand what MediXAI does, and where its boundaries remain, before using a result."}</p></div>
          <div className="faq-list">{faqs.map(([question, answer]) => <details key={question} className="faq-item"><summary>{question}</summary><p>{answer}</p></details>)}</div>
        </div>
      </section>

      {/* CTA + disclaimer */}
      <section className="section section--ink" aria-labelledby="cta-title">
        <div className="container">
          <div className="text-center" style={{ maxWidth: 640, marginInline: "auto" }}>
            <h2 id="cta-title">{t("home.ctaTitle")}</h2>
            <p className="muted">{t("home.ctaLead")}</p>
            <Button href="/symptoms" size="lg" as="link">{t("home.analyze")}</Button>
            <div className="mt-2">
              <Disclaimer variant="bare" />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
