import Document, { Html, Head, Main, NextScript } from "next/document";

export default class MediXaiDocument extends Document {
  render() {
    return (
      <Html lang="en">
        <Head>
          <script
            dangerouslySetInnerHTML={{
              __html: `(function(){try{var l=localStorage.getItem("medixai-language");var t=localStorage.getItem("medixai-theme");var lang=l==="bn"||l==="en"?l:(navigator.language||"").toLowerCase().startsWith("bn")?"bn":"en";var theme=t==="dark"||t==="light"?t:matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";document.documentElement.lang=lang;document.documentElement.dataset.theme=theme;document.documentElement.style.colorScheme=theme;}catch(e){}})();`,
            }}
          />
          <link rel="stylesheet" href="/fonts/fonts.css" />
          <meta name="theme-color" content="#0b1f33" />
        </Head>
        <body>
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}
