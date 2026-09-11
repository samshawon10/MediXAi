"""Reusable Bangla + English symptom normalisation layer.

MediXAI supports symptoms entered freely in English or Bangla and maps them to a
single canonical English token before feeding them to TF-IDF / the classifier.

Design goals: extensible dictionaries, preserves clinically meaningful info,
deterministic and idempotent. Does NOT claim comprehensive medical-language
coverage or automated Bangla->English translation of arbitrary text.
"""
from __future__ import annotations

import re
from typing import Iterable, List, Union

# Bangla -> canonical English
BANGLA_TO_ENGLISH: dict[str, str] = {
    "জ্বর": "fever",
    "কাশি": "cough",
    "মাথা ব্যথা": "headache",
    "মাথাব্যথা": "headache",
    "মাথা ঘোরা": "dizziness",
    "গলা ব্যথা": "sore throat",
    "বমি": "vomiting",
    "বমি বমি ভাব": "nausea",
    "শ্বাসকষ্ট": "shortness of breath",
    "দুর্বলতা": "weakness",
    "নাক দিয়ে পানি পড়া": "runny nose",
    "নাক বন্ধ": "nasal congestion",
    "হাঁচি": "sneezing",
    "ক্লান্তি": "fatigue",
    "জলবসন্ত": "chickenpox",
    "ডায়রিয়া": "diarrhea",
    "কোষ্ঠকাঠিন্য": "constipation",
    "পেট ব্যথা": "abdominal pain",
    "বুকে ব্যথা": "chest pain",
    "রক্তচাপ বেড়ে যাওয়া": "high blood pressure",
    "রক্তাল্পতা": "anemia",
    "কামলা": "jaundice",
    "পেশি ব্যথা": "muscle pain",
    "জয়েন্ট ব্যথা": "joint pain",
    "চামড়ায় ফুসকুড়ি": "skin rash",
    "ঘাম": "sweating",
    "ঠান্ডা লাগা": "chills",
    "ক্ষুধামন্দা": "loss of appetite",
    "ওজন হ্রাস": "weight loss",
    "অনিদ্রা": "insomnia",
}

# English variant / synonym -> canonical English
ENGLISH_CANONICAL: dict[str, str] = {
    "head ache": "headache",
    "head-ache": "headache",
    "headaches": "headache",
    "breathlessness": "shortness of breath",
    "short of breath": "shortness of breath",
    "breathing difficulty": "shortness of breath",
    "difficulty breathing": "shortness of breath",
    "stomach pain": "abdominal pain",
    "belly pain": "abdominal pain",
    "belly ache": "abdominal pain",
    "stomach ache": "abdominal pain",
    "sorethroat": "sore throat",
    "throat pain": "sore throat",
    "body ache": "body pain",
    "tiredness": "fatigue",
    "exhaustion": "fatigue",
    "sleeplessness": "insomnia",
    "high temperature": "fever",
    "high temp": "fever",
    "feeling cold": "chills",
    "loose motions": "diarrhea",
    "loose stools": "diarrhea",
    "high bp": "high blood pressure",
    "hypertension": "high blood pressure",
    "yellow eyes": "yellowing of eyes",
    "yellow urine": "yellowing of urine",
}

_SEPARATOR_RE = re.compile(r"[/\\]|\band\b|&|,|;|\t|\||\n")
_WS_RE = re.compile(r"\s+")
_PUNCT_EDGE_RE = re.compile(r"^[^\w\u0980-\u09ff]+|[^\w\u0980-\u09ff]+$")
_SPACE = "\x00"


def normalize_text(text: str) -> str:
    """Lowercase + strip punctuation edges + collapse whitespace."""
    if text is None:
        return ""
    text = str(text).lower()
    text = _SEPARATOR_RE.sub(" ", text)
    text = text.replace("_", " ")
    text = _WS_RE.sub(" ", text).strip()
    text = _PUNCT_EDGE_RE.sub("", text)
    return text.strip()


def _strip_articles(key: str) -> str:
    for token in ("i have ", "having ", "feeling ", "feel "):
        if key.startswith(token):
            key = key[len(token):].strip()
            break
    for article in ("a ", "an ", "the "):
        if key.startswith(article):
            key = key[len(article):].strip()
            break
    return key


def normalize_symptom(term: str) -> str:
    """Map a single symptom term (EN or BN) to its canonical English form."""
    if term is None:
        return ""
    raw = str(term).strip()
    if not raw:
        return ""

    bn_key = normalize_text(raw)
    bn_hit = _BN_LOOKUP.get(bn_key)
    if bn_hit is not None:
        return bn_hit

    key = _strip_articles(bn_key)
    en_hit = _EN_LOOKUP.get(key)
    if en_hit is not None:
        return en_hit
    return key


# Pre-normalised lookup tables (built once at import; O(1) per call).
_BN_LOOKUP: dict[str, str] = {normalize_text(k): v for k, v in BANGLA_TO_ENGLISH.items()}
_EN_LOOKUP: dict[str, str] = {normalize_text(k): v for k, v in ENGLISH_CANONICAL.items()}


# Known multi-word phrases that must survive the separator split intact.
_MULTIWORD = sorted(
    set(BANGLA_TO_ENGLISH.keys()) | set(ENGLISH_CANONICAL.keys()),
    key=len,
    reverse=True,
)


def _split_free_text(text: str) -> List[str]:
    """Protect multi-word phrases, then split the sentence into terms."""
    text = str(text)
    for phrase in _MULTIWORD:
        if phrase in text:
            text = text.replace(phrase, phrase.replace(" ", _SPACE))
    parts = []
    for raw in _SEPARATOR_RE.split(text):
        raw = raw.replace(_SPACE, " ")
        if raw.strip():
            parts.append(raw)
    return parts


def normalize_symptoms(symptoms: Union[str, Iterable[str]]) -> List[str]:
    """Split, normalise, and de-duplicate a symptom list.

    Accepts a free-text sentence (e.g. comma separated string) or an iterable of
    individual symptoms. Order is preserved; duplicates are removed.
    """
    if symptoms is None:
        return []

    if isinstance(symptoms, str):
        parts = _split_free_text(symptoms)
    else:
        parts = [str(s) for s in symptoms]

    out: List[str] = []
    seen: set[str] = set()
    for part in parts:
        canonical = normalize_symptom(part)
        if canonical and canonical not in seen:
            seen.add(canonical)
            out.append(canonical)
    return out