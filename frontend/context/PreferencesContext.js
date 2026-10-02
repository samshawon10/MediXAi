import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { MESSAGES } from "@/lib/translations";
import { PRODUCT_MESSAGES } from "@/lib/productMessages";
import { PLATFORM_MESSAGES } from "@/lib/platformMessages";

function readPreference(key) { try { return window.localStorage.getItem(key); } catch { return null; } }
function savePreference(key, value) { try { window.localStorage.setItem(key, value); } catch {} }

const PreferencesContext = createContext(null);
const LANGUAGE_KEY = "medixai-language";
const THEME_KEY = "medixai-theme";

function systemLanguage() {
  return typeof navigator !== "undefined" && navigator.language?.toLowerCase().startsWith("bn")
    ? "bn"
    : "en";
}

function systemTheme() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export function PreferencesProvider({ children }) {
  const [language, setLanguage] = useState("en");
  const [theme, setTheme] = useState("light");
  const [themeChoice, setThemeChoice] = useState("system");
  const [preferencesReady, setPreferencesReady] = useState(false);

  useEffect(() => {
    const savedLanguage = readPreference(LANGUAGE_KEY);
    const savedTheme = readPreference(THEME_KEY);
    setLanguage(savedLanguage === "bn" || savedLanguage === "en" ? savedLanguage : systemLanguage());
    setTheme(savedTheme === "dark" || savedTheme === "light" ? savedTheme : systemTheme());
    setThemeChoice(["light", "dark"].includes(savedTheme) ? savedTheme : "system");
    setPreferencesReady(true);
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const followSystem = () => {
      if (!["light", "dark"].includes(readPreference(THEME_KEY))) setTheme(media.matches ? "dark" : "light");
    };
    media.addEventListener?.("change", followSystem);
    return () => media.removeEventListener?.("change", followSystem);
  }, []);

  useEffect(() => {
    if (!preferencesReady) return;
    document.documentElement.lang = language;
  }, [language, preferencesReady]);

  useEffect(() => {
    if (!preferencesReady) return;
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
  }, [theme, preferencesReady]);

  const value = useMemo(() => ({
    language,
    theme,
    themeChoice,
    setLanguage: (next) => {
      if (next !== "en" && next !== "bn") return;
      savePreference(LANGUAGE_KEY, next);
      setLanguage(next);
    },
    setTheme: (next) => {
      if (!["light", "dark", "system"].includes(next)) return;
      savePreference(THEME_KEY, next);
      setThemeChoice(next);
      setTheme(next === "system" ? systemTheme() : next);
    },
    t: (key) => PLATFORM_MESSAGES[language][key] ?? PRODUCT_MESSAGES[language][key] ?? MESSAGES[language][key] ?? PLATFORM_MESSAGES.en[key] ?? PRODUCT_MESSAGES.en[key] ?? MESSAGES.en[key] ?? key,
  }), [language, theme, themeChoice]);

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences() {
  const value = useContext(PreferencesContext);
  if (!value) throw new Error("usePreferences must be used within PreferencesProvider");
  return value;
}
