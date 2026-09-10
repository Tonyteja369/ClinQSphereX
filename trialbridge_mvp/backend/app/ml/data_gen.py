import numpy as np
import pandas as pd

def generate_synthetic_data(n_samples=500, random_state=42):
    rng = np.random.default_rng(random_state)
    age = rng.integers(18, 80, size=n_samples)
    bmi = rng.normal(27, 6, size=n_samples)
    systolic_bp = rng.normal(125, 15, size=n_samples)
    hba1c = rng.normal(5.8, 1.0, size=n_samples)
    symptom_score = rng.integers(0, 10, size=n_samples)
    prior_condition_flag = rng.integers(0, 2, size=n_samples)
    medication_flag = rng.integers(0, 2, size=n_samples)

    df = pd.DataFrame({
        "age": age,
        "bmi": bmi,
        "systolic_bp": systolic_bp,
        "hba1c": hba1c,
        "symptom_score": symptom_score,
        "prior_condition_flag": prior_condition_flag,
        "medication_flag": medication_flag,
    })

    rule = (
        (df["age"] >= 18) & (df["age"] <= 65) &
        (df["bmi"] >= 18.5) & (df["bmi"] <= 35.0) &
        (df["systolic_bp"] < 140) &
        (df["hba1c"] < 6.5) &
        (df["symptom_score"] >= 4) &
        (df["prior_condition_flag"] == 0) &
        (df["medication_flag"] == 0)
    )

    noise = rng.random(n_samples) < 0.08
    labels = rule.astype(int)
    labels = np.where(noise, 1 - labels, labels)

    return df, labels
