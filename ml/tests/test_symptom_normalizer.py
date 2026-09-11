"""Tests for symptom normalisation (Bangla + English)."""
from src.symptom_normalizer import (
    normalize_symptom,
    normalize_symptoms,
    normalize_text,
)


def test_english_multiple_words():
    assert normalize_symptom("head ache") == "headache"
    assert normalize_symptom("breathlessness") == "shortness of breath"


def test_bangla_mapping():
    assert normalize_symptom("জ্বর") == "fever"
    assert normalize_symptom("কাশি") == "cough"
    assert normalize_symptom("মাথা ব্যথা") == "headache"
    assert normalize_symptom("শ্বাসকষ্ট") == "shortness of breath"


def test_lowercase_and_trimming():
    assert normalize_symptom("  FEVER ") == "fever"
    assert normalize_symptom("Cough") == "cough"


def test_normalize_text_whitespace():
    assert normalize_text("  fever   cough  ") == "fever cough"


def test_list_dedupes_and_preserves_order():
    assert normalize_symptoms("fever, cough, fever, headache") == [
        "fever",
        "cough",
        "headache",
    ]


def test_mixed_bangla_english_list():
    result = normalize_symptoms(["জ্বর", "cough", "মাথা ব্যথা"])
    assert result == ["fever", "cough", "headache"]


def test_empty_input():
    assert normalize_symptoms("") == []
    assert normalize_symptoms(None) == []
    assert normalize_symptoms([]) == []


def test_strips_articles():
    assert normalize_symptom("i have a fever") == "fever"
    assert normalize_symptom("having cough") == "cough"