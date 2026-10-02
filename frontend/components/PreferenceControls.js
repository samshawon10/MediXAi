import { usePreferences } from "@/context/PreferencesContext";
import { Languages, SunMoon, Sun, Moon } from "lucide-react";

export default function PreferenceControls({ placement }) {
  const { language, setLanguage, themeChoice, setTheme, t } = usePreferences();
  const prefix = placement || "preferences";
  const compact = ["desktop", "mobile"].includes(placement);
  const ThemeIcon = themeChoice === "dark" ? Moon : themeChoice === "light" ? Sun : SunMoon;
  if (compact) return <div className="preference-controls preference-controls--compact">
    <div className="preference-icon-control" title={`${t("pref.language")}: ${t(language === "bn" ? "pref.bangla" : "pref.english")}`}>
      <Languages size={19} strokeWidth={1.7} aria-hidden="true" />
      <label className="visually-hidden" htmlFor={`${prefix}-language`}>{t("pref.language")}</label>
      <select id={`${prefix}-language`} value={language} onChange={event => setLanguage(event.target.value)}>
        <option value="en">{t("pref.english")}</option><option value="bn">{t("pref.bangla")}</option>
      </select>
    </div>
    <div className="preference-icon-control" title={`${t("pref.theme")}: ${t(`pref.${themeChoice}`)}`}>
      <ThemeIcon size={19} strokeWidth={1.7} aria-hidden="true" />
      <label className="visually-hidden" htmlFor={`${prefix}-theme`}>{t("pref.theme")}</label>
      <select id={`${prefix}-theme`} value={themeChoice} onChange={event => setTheme(event.target.value)}>
        <option value="system">{t("pref.system")}</option><option value="light">{t("pref.light")}</option><option value="dark">{t("pref.dark")}</option>
      </select>
    </div>
  </div>;
  return (
    <div className="preference-controls">
      <Languages className="preference-controls__icon" size={16} strokeWidth={1.8} aria-hidden="true" />
      <label className="visually-hidden" htmlFor={`${prefix}-language`}>{t("pref.language")}</label>
      <select id={`${prefix}-language`} className="select preference-controls__select" value={language} onChange={(event) => setLanguage(event.target.value)}>
        <option value="en">{t("pref.english")}</option>
        <option value="bn">{t("pref.bangla")}</option>
      </select>
      <SunMoon className="preference-controls__icon" size={16} strokeWidth={1.8} aria-hidden="true" />
      <label className="visually-hidden" htmlFor={`${prefix}-theme`}>{t("pref.theme")}</label>
      <select id={`${prefix}-theme`} className="select preference-controls__select" value={themeChoice} onChange={(event) => setTheme(event.target.value)}>
        <option value="system">{t("pref.system")}</option>
        <option value="light">{t("pref.light")}</option>
        <option value="dark">{t("pref.dark")}</option>
      </select>
    </div>
  );
}
