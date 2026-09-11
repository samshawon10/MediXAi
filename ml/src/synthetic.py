"""Generate a SMALL, clearly-labelled SYNTHETIC demo dataset.

Purpose: let the whole ML pipeline (EDA -> preprocess -> train -> evaluate ->
predict) run end-to-end *before* the real Kaggle dataset is downloaded and placed
in ``ml/data/``. This is NOT clinical data and must never be used to claim real
medical results — effects computed from it are demo-only.

The real pipeline reads the real CSV automatically; swap this file out by placing
the Kaggle "Healthcare Symptoms–Disease Classification" CSV in ``ml/data/``.
"""
from __future__ import annotations

import random
import sys

import pandas as pd

from . import config

random.seed(42)

# Disease -> (core symptom signature, extra symptoms it may show)
CARDS = {
    "Influenza": (["fever", "cough", "fatigue", "body pain"], ["headache", "chills"]),
    "Common Cold": (["runny nose", "sneezing", "cough", "sore throat"], ["headache"]),
    "Covid-19": (["fever", "cough", "fatigue", "shortness of breath"], ["loss of appetite", "headache"]),
    "Food Poisoning": (["nausea", "vomiting", "diarrhea", "abdominal pain"], ["dizziness"]),
    "Typhoid": (["fever", "headache", "weakness", "abdominal pain"], ["loss of appetite"]),
    "Dengue": (["fever", "body pain", "headache", "skin rash"], ["vomiting", "weakness"]),
    "Migraine": (["headache", "nausea", "dizziness"], ["vomiting"]),
    "Bronchitis": (["cough", "shortness of breath", "fatigue", "chills"], ["fever"]),
    "Gastritis": (["abdominal pain", "nausea", "indigestion"], ["vomiting"]),
    "Anemia": (["weakness", "fatigue", "dizziness", "pale skin"], ["shortness of breath"]),
    "Tonsillitis": (["sore throat", "fever", "difficulty swallowing"], ["headache", "chills"]),
    "Urinary Tract Infection": (["burning urination", "lower abdominal pain", "fever"], ["nausea"]),
}


def generate(rows_per_class: int = 60) -> pd.DataFrame:
    rows = []
    for disease, (core, extra) in CARDS.items():
        for _ in range(rows_per_class):
            syms = list(core)
            # add some extra / rare symptoms
            if random.random() < 0.7:
                syms.append(random.choice(extra))
            if random.random() < 0.15:
                noise = random.choice(list(CARDS))
                syms.append(random.choice(CARDS[noise][0]))
            age = random.randint(5, 85)
            gender = random.choice(["Male", "Female"])
            rows.append({
                "Age": age,
                "Gender": gender,
                "Symptoms": ", ".join(sorted(set(syms))) if False else ", ".join(syms),
                "Disease": disease,
            })
    df = pd.DataFrame(rows).sample(frac=1.0, random_state=42).reset_index(drop=True)
    return df


def main(out_path=None, rows_per_class: int = 60) -> str:
    df = generate(rows_per_class=rows_per_class)
    path = out_path or str(config.DATA_DIR / "synthetic_demo_dataset.csv")
    df.to_csv(path, index=False)
    print(f"Wrote synthetic demo dataset: {path} ({len(df)} rows, "
          f"{df['Disease'].nunique()} classes)")
    print("LABEL: this is SYNTHETIC demo data, not clinical data.")
    return path


if __name__ == "__main__":
    rows = int(sys.argv[1]) if len(sys.argv) > 1 else 60
    main(rows_per_class=rows)