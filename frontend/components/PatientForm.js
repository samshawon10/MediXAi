/**
 * Minimal patient information fields (no unnecessary sensitive data).
 */
import { usePreferences } from "@/context/PreferencesContext";

export default function PatientForm({ age, setAge, gender, setGender }) {
  const { t } = usePreferences();
  return (
    <div>
      <div className="row row--2">
        <div className="field">
          <label htmlFor="age">{t("form.age")}</label>
          <select id="age" className="select" value={age} onChange={(e) => setAge(e.target.value)}>
            <option value="">{t("form.ageSelect")}</option>
            {["0-12", "13-17", "18-30", "31-50", "51-70", "71+"].map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="gender">{t("form.gender")}</label>
          <select id="gender" className="select" value={gender} onChange={(e) => setGender(e.target.value)}>
            <option value="">{t("form.genderSelect")}</option>
            <option value="Female">{t("form.female")}</option>
            <option value="Male">{t("form.male")}</option>
            <option value="Other">{t("form.other")}</option>
          </select>
        </div>
      </div>
    </div>
  );
}