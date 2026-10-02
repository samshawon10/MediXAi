"""Conservative phrase flags, independent of the disease classifier.

These are prototype categories, not learned probabilities or clinical triage.
No numeric score is produced without a validated basis.
"""
import re
import unicodedata

URGENT = "These symptoms may require urgent medical attention. Seek immediate professional medical assistance or contact your local emergency service."
LIMITATION = "This limited academic rule set cannot rule out an emergency. Seek professional care for severe, worsening, or concerning symptoms, regardless of this result."
SOURCES = [
    "https://www.nhs.uk/nhs-services/urgent-and-emergency-care-services/when-to-call-999/",
    "https://www.nhs.uk/symptoms/shortness-of-breath/",
    "https://medlineplus.gov/ency/article/001927.htm",
]
RULES = [
    ("severe breathing difficulty", "CRITICAL", ["severe difficulty breathing", "cannot breathe", "can't breathe", "not breathing", "gasping", "choking", "শ্বাস নিতে পারছি না"]),
    ("severe chest pain", "CRITICAL", ["severe chest pain", "crushing chest pain", "বুকে তীব্র ব্যথা"]),
    ("loss of consciousness", "CRITICAL", ["loss of consciousness", "unconscious", "unresponsive", "অজ্ঞান"]),
    ("severe bleeding", "CRITICAL", ["severe bleeding", "uncontrolled bleeding", "heavy bleeding", "প্রচুর রক্তপাত"]),
    ("blue lips", "CRITICAL", ["blue lips", "lips turning blue", "নীল ঠোঁট"]),
    ("seizure", "CRITICAL", ["seizure", "seizures", "convulsion", "খিঁচুনি"]),
    ("sudden weakness", "CRITICAL", ["sudden weakness", "one sided weakness", "one-sided weakness", "হঠাৎ দুর্বলতা"]),
    ("sudden confusion", "CRITICAL", ["sudden confusion", "suddenly confused"]),
    ("severe allergic reaction", "CRITICAL", ["severe allergic reaction", "anaphylaxis", "swollen tongue", "tongue swelling"]),
    ("severe trauma", "CRITICAL", ["severe trauma", "major injury", "serious accident"]),
    ("breathing difficulty", "HIGH", ["difficulty breathing", "shortness of breath", "short of breath", "breathlessness", "breathing difficulty", "শ্বাসকষ্ট"]),
    ("chest pain", "HIGH", ["chest pain", "chest pressure", "বুকে ব্যথা"]),
    ("confusion", "HIGH", ["confusion", "confused", "বিভ্রান্তি"]),
]


def assess_risk(symptoms):
    text = re.sub(r"\s+", " ", unicodedata.normalize("NFC", symptoms).lower().replace("_", " "))
    reasons = []
    for symptom, level, phrases in RULES:
        if any(re.search(r"(?<!\w)" + re.escape(unicodedata.normalize("NFC", phrase)) + r"(?!\w)", text) for phrase in phrases):
            reasons.append({"symptom": symptom, "level": level, "basis": "configured phrase indicator"})
    level = "CRITICAL" if any(r["level"] == "CRITICAL" for r in reasons) else "HIGH" if reasons else "UNASSESSED"
    return {
        "available": True, "level": level, "score": None, "method": "prototype phrase rules v1",
        "reasons": reasons, "urgent": bool(reasons),
        "guidance": URGENT if reasons else "No configured emergency phrases were detected. This does not establish low risk.",
        "limitation": LIMITATION,
        "contextNote": "Mentions are flagged conservatively, including negated or historical mentions; this rule set cannot reliably interpret context.",
        "sources": SOURCES,
    }
