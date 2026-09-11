# MediXAI — Phase 1 Report (First 30%)

**Project**
Explainable AI-Based Symptom Analysis and Emergency Risk Prediction for Intelligent Healthcare Decision Support

**Phase focus**
Complete final frontend + working ML foundation.

---

## 1. Project objective

MediXAI is an academic healthcare **decision-support** prototype. It:

1. accepts natural-language symptoms (English or Bangla),
2. normalizes them into a canonical feature representation,
3. predicts a **possible condition** with a trained multiclass machine-learning model,
4. will, in later phases, provide SHAP-based explanations and emergency-risk assessment.

MediXAI is **not** a diagnostic system. All outputs are framed as AI-generated
insights requiring professional medical consultation.

---

## 2. Dataset

Source: *Healthcare Symptoms–Disease Classification Dataset* (Kaggle, by Kundan
Sagar Bedmutha) — `ml/data/Healthcare.csv`: **25,000 records, 30 diseases**,
with demographics + symptoms + a disease label.

Columns found in the real file: `Patient_ID`, `Age`, `Gender`, `Symptoms`
(comma-separated text), `Symptom_Count` (auxiliary, excluded from TF-IDF),
`Disease` (label). Zero missing values, zero duplicate rows.

> The pipeline also ships a small synthetic demo
> (`ml/data/synthetic_demo_dataset.csv`) used only for fast unit tests.

The real Kaggle CSV is now the default dataset
(`config.dataset_path()` prefers `Healthcare*.csv`).

---

## 3. Dataset statistics (real Kaggle run, `reports/eda_summary.json`)

| Property | Value |
|---|---|
| Source file | `ml/data/Healthcare.csv` |
| Rows | 25,000 |
| Columns | 6 (`Patient_ID`, `Age`, `Gender`, `Symptoms`, `Symptom_Count`, `Disease`) |
| Missing values | 0 |
| Duplicate rows | 0 |
| Class label | `Disease` |
| Symptom representation | text (`Symptoms`, comma-separated) |
| Demographic columns | `Age`, `Gender` |
| Number of classes | 30 |
| Unique symptom tokens | 28 |
| Symptom count | min 3 · mean 5.00 · max 7 |

Disease distribution is near-balanced (~782–911 per class; Anxiety 911,
Arthritis 896, Food Poisoning 871, …, Stroke 790, Asthma 782).
All 28 symptom tokens appear ~4,360–4,595 times each, so TF-IDF weighting is
near-uniform. Gender split is even (Other 8,393 / Female 8,336 / Male 8,271).
Age is uniformly spread 1–90 (mean 45.3).

Top symptoms: `appetite loss` (4,595), `sneezing` (4,562), `headache` (4,555),
`muscle pain` (4,515), `anxiety` (4,506).

---

## 4. EDA findings

- Near-balanced classes (~782–911 each across 30 diseases) — stratification used
  at split time regardless.
- **Critical signal finding:** every one of the 28 symptom tokens occurs in
  *every* disease class (~uniformly), i.e. symptoms carry almost no
  discriminative signal in this dataset. Expect near-chance model performance
  (see §11) — an honest dataset limitation, not a pipeline bug.
- `Symptom_Count` (3–7) is an auxiliary column and is excluded from features.
- Demographics: gender ~even three-way split; age uniform 1–90.
- Full JSON: `reports/eda_summary.json`.
- Figures:

  | Figure | Path |
  |---|---|
  | Disease class distribution | `reports/figures/disease_distribution.png` |
  | Top symptoms | `reports/figures/top_symptoms.png` |
  | Symptom count distribution | `reports/figures/symptom_count_distribution.png` |

---

## 5. Preprocessing methodology

- lowercase + whitespace/separator normalization
- duplicate-symptom removal (order-preserving)
- multi-word canonical phrases protected as single TF-IDF tokens (space → underscore)
- missing-value tolerant (unknown/nan symptom cells → empty)
- separate **one-hot** handling if the dataset uses `0/1` symptom columns

Clinical meaning is preserved; no symptom token is dropped.

---

## 6. Symptom normalization (Bangla + English)

`ml/src/symptom_normalizer.py`:

- Bangla → English: `জ্বর → fever`, `কাশি → cough`, `মাথা ব্যথা → headache`,
  `বমি → vomiting`, `বমি বমি ভাব → nausea`, `শ্বাসকষ্ট → shortness of breath`,
  `দুর্বলতা → weakness`, and more (~29 entries).
- English synonym fixes: `head ache → headache`, `breathlessness → shortness of breath`,
  `stomach ache → abdominal pain`, etc.
- Extensible dictionaries; not claimed to be comprehensive medical-language coverage.

---

## 7. TF-IDF methodology

- `TfidfVectorizer`, unigram (`ngram_range=(1,1)`), `sublinear_tf=True`.
- Fitted **only on the training split** (no leakage).
- Vocabulary size (real): **28 features** (one per canonical symptom token).
- Top features by mean TF-IDF are near-uniform (~0.078–0.081): `sneezing`,
  `appetite loss`, `headache`, `muscle pain`, `fever`… — consistent with the
  uniform symptom distribution.
- Bigram config supported via `--ngrams 1-2` (tested: macro F1 ≈ 0.030, no gain).
- Saved: `ml/models/tfidf_vectorizer.joblib`.

---

## 8. Train / test strategy

- **80/20** stratified split (multiclass).
- `random_state = 42`.
- All data-learned transforms (vectorizer, label encoder) fit on training only.
- Real split: `n_train = 20,000`, `n_test = 5,000`.
## 9. Models tested

| Model | Framework |
|---|---|
| Multinomial Naive Bayes | `MultinomialNB` |
| Logistic Regression | `LogisticRegression` (`C=1.0`, `max_iter=1000`) |
| Support Vector Machine | `LinearSVC` (linear, sparse-friendly, balanced) |
| Random Forest | `RandomForestClassifier` (100 trees, `max_depth=30`, balanced_subsample) |

All reproducible (`random_state=42`).

---

## 10 & 11. Evaluation metrics + actual results

Metrics: Accuracy, Macro/Weighted Precision, Macro/Weighted Recall, Macro/Weighted F1.
Macro Recall and Macro F1 are the primary concern for this medical decision-support task.

**Actual results on the real Kaggle test set (5,000 rows, unigram TF-IDF):**

| Model | Accuracy | Macro P | Macro R | **Macro F1** | Wgt P | Wgt R | Wgt F1 |
|---|---|---|---|---|---|---|---|
| random_forest | 0.0342 | 0.0345 | 0.0344 | **0.0342** | 0.0344 | 0.0342 | 0.0341 |
| svm | 0.0356 | 0.0367 | 0.0357 | 0.0337 | 0.0366 | 0.0356 | 0.0336 |
| logistic_regression | 0.0356 | 0.0373 | 0.0351 | 0.0329 | 0.0374 | 0.0356 | 0.0331 |
| naive_bayes | 0.0364 | 0.0320 | 0.0350 | 0.0267 | 0.0323 | 0.0364 | 0.0273 |

> **Honesty note:** chance level for 30 balanced classes is ≈ 0.033, so all four
> models perform at **near-chance**. This is expected given the EDA finding that
> every symptom occurs in every disease class — the dataset as released contains
> almost no symptom→disease signal (likely synthetically generated with uniform
> random symptoms). The pipeline itself is proven correct: stratified split, no
> leakage, reproducible training, honest metric computation. Improving signal
> (feature engineering with demographics, richer symptom encoding, or a cleaner
> dataset) is explicitly scoped to the next phase.
>
> `reports/model_comparison.csv` · `reports/classification_report.txt`
> · `reports/train_summary.json` · `reports/evaluation.json`

---

## 12. Confusion matrix

- `reports/confusion_matrix.npy` (array)
- `reports/figures/confusion_matrix.png` (heatmap)
- `reports/figures/class_support.png` (per-class test support)

---

## 13. Preliminary best model

Selected **random_forest** by highest **Macro F1** (0.0342) on the real test set,
even though naive_bayes has marginally higher raw accuracy (0.0364 vs 0.0342) —
per the project rule, class-balanced performance outranks accuracy.

Artifacts:
- `ml/models/best_model.joblib`
- `ml/models/tfidf_vectorizer.joblib`
- `ml/models/label_encoder.joblib`
- per-model files `ml/models/model_*.joblib`

---

## 14. Error analysis (real data)

The confusion matrix (`reports/figures/confusion_matrix.png`) shows diffuse,
near-uniform predictions — no disease class is reliably distinguished, and no
pairwise confusion pattern dominates, because the input symptoms are
statistically independent of the label. Per-class precision/recall in
`reports/classification_report.txt` are all ≈ 0.02–0.05. This confirms the
dataset carries no learnable symptom signal in its current form; it does not
indicate a modelling bug. Recommended next-phase mitigations: incorporate
Age/Gender features, test symptom-combination encodings, and/or source a
clinically grounded dataset.

---

## 15 & 16. Frontend implementation status / completed features

Complete final frontend implemented (Next.js), **including locked/disabled states**
for every unfinished module. No fake predictions or fabricated medical content.

| Area | Status |
|---|---|
| MediXAI branding, navigation (responsive) | ✅ |
| Home page (hero, features, how-it-works, CTA) | ✅ |
| Symptom Analysis page (patient info + symptom chips) | ✅ |
| Analyze flow / loading sequence (reusable) | ✅ |
| Results, Explainable AI, Emergency Risk, Disease info sections | ✅ (XAI/risk/info locked) |
| Loading / empty / error / coming-next-update states | ✅ |
| Healthcare disclaimer | ✅ |
| Responsive + accessible (semantic HTML, focus, ARIA labels) | ✅ |

Future-feature UI shipped but locked / marked *Coming in Next Update*:
Explainable AI (SHAP), Emergency Risk Prediction, live prediction backend.

---

## 17 & 18. Upcoming features / limitations

**Next update (priority order)**
1. SHAP explainability engine + integrate into the Explainable AI UI
2. Emergency-risk model + wire into risk UI
3. FastAPI ML service (`ml/` → endpoint)
4. Express server + real frontend ↔ backend connection
5. Advanced healthcare features (history, doctor view)

**Limitations (this phase)**
- No live ML API; frontend prediction is a locked state (pipeline proven via CLI).
- Real-dataset metrics are near-chance (documented honestly above) — the Kaggle
  file as released has almost no symptom→disease signal.
- SHAP / emergency risk are UI-only placeholders.

---

## 19. Next development phase

Connect `ml/src/predict.py` to a FastAPI service, add SHAP explanations, build the
emergency-risk engine, and replace the frontend's locked states with live data —
**without redesigning the UI**, which is already structured around these API
contracts.