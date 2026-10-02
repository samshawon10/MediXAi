import { useEffect, useRef, useState } from "react";
import { Mic, Square } from "lucide-react";
import { usePreferences } from "@/context/PreferencesContext";

export default function VoiceInput({ onTranscript, inputLanguage, disabled }) {
  const { t } = usePreferences();
  const recognition = useRef(null);
  const callback = useRef(onTranscript);
  callback.current = onTranscript;
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [notice, setNotice] = useState("");
  useEffect(() => {
    setSupported(Boolean(window.SpeechRecognition || window.webkitSpeechRecognition));
    return () => { if (recognition.current) { recognition.current.onresult = null; recognition.current.onend = null; recognition.current.onerror = null; recognition.current.abort(); } };
  }, []);
  useEffect(() => { if (disabled || inputLanguage !== "en") { recognition.current?.abort(); setListening(false); } }, [disabled, inputLanguage]);
  function start() {
    if (listening) { recognition.current?.stop(); return; }
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) return;
    const session = new Recognition(); recognition.current = session;
    session.lang = "en-US"; session.continuous = false; session.interimResults = false;
    session.onresult = event => {
      const text = Array.from(event.results).filter(result => result.isFinal).map(result => result[0].transcript).join(" ");
      if (text) { callback.current(text); setNotice("voice.review"); }
    };
    session.onerror = event => { if (event.error !== "aborted") setNotice("voice.error"); setListening(false); };
    session.onend = () => setListening(false);
    try { setListening(true); setNotice(""); session.start(); } catch { setListening(false); setNotice("voice.error"); }
  }
  return <div className="voice-input"><p className="small muted" id="voice-privacy">{t("voice.privacy")}</p>
    {supported && inputLanguage === "en" ? <button type="button" className="btn btn-secondary" disabled={disabled} onClick={start} aria-pressed={listening} aria-describedby="voice-privacy">{listening ? <Square size={16} aria-hidden="true" /> : <Mic size={16} aria-hidden="true" />}{t(listening ? "voice.stop" : "voice.start")}</button> : <p className="small muted">{t(inputLanguage === "bn" ? "voice.bangla" : "voice.unsupported")}</p>}
    <p className="small" role="status">{listening ? t("voice.listening") : notice ? t(notice) : ""}</p></div>;
}
