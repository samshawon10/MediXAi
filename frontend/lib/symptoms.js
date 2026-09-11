export const POPULAR_SYMPTOMS = [
  "appetite loss",
  "sneezing",
  "headache",
  "muscle pain",
  "anxiety",
  "depression",
  "fever",
  "weight loss",
  "swelling",
  "sore throat",
  "blurred vision",
  "fatigue",
  "runny nose",
  "nausea",
  "vomiting",
  "back pain",
  "sweating",
  "shortness of breath",
  "diarrhea",
  "weight gain",
  "rash",
  "joint pain",
  "tremors",
  "chest pain",
  "cough",
  "insomnia",
  "dizziness",
  "abdominal pain",
];

export const BANGLA_EXAMPLES = [
  ["জ্বর", "fever"],
  ["কাশি", "cough"],
  ["মাথা ব্যথা", "headache"],
  ["শ্বাসকষ্ট", "shortness of breath"],
];

export function normalizeChip(raw) {
  if (raw == null) return "";
  return String(raw).trim().replace(/[;,]+$/g, "").toLowerCase();
}