/**
 * Minimal patient information fields (no unnecessary sensitive data).
 */
export default function PatientForm({ age, setAge, gender, setGender }) {
  return (
    <div>
      <div className="row row--2">
        <div className="field">
          <label htmlFor="age">Age</label>
          <select id="age" className="select" value={age} onChange={(e) => setAge(e.target.value)}>
            <option value="">Select age range</option>
            {["0-12", "13-17", "18-30", "31-50", "51-70", "71+"].map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="gender">Gender</label>
          <select id="gender" className="select" value={gender} onChange={(e) => setGender(e.target.value)}>
            <option value="">Select gender</option>
            <option value="Female">Female</option>
            <option value="Male">Male</option>
            <option value="Other">Other / Prefer not to say</option>
          </select>
        </div>
      </div>
    </div>
  );
}