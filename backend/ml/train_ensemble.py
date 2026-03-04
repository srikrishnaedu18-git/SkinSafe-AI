import json
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

BASE_DIR = Path(__file__).resolve().parents[1]  # backend/
CSV_PATH = BASE_DIR / "ai" / "dataset" / "train.csv"
OUT_DIR = BASE_DIR / "ml" / "models"

LABEL_COLS = {"p_irritation_label", "y_irritation", "p_acne_label", "y_acne"}
ID_COLS = {"qr_id", "product_type", "skin_type"}

K = 5  # ensemble size


def ensure_out_dir():
    OUT_DIR.mkdir(parents=True, exist_ok=True)


def load_data():
    df = pd.read_csv(CSV_PATH)
    feature_cols = [c for c in df.columns if c not in ID_COLS and c not in LABEL_COLS]

    X = df[feature_cols].astype(float).values
    y_irrit = df["y_irritation"].astype(int).values
    y_acne = df["y_acne"].astype(int).values

    return df, feature_cols, X, y_irrit, y_acne


def fit_one(X, y, seed):
    # Bootstrap sampling
    rng = np.random.RandomState(seed)
    n = len(y)
    idx = rng.randint(0, n, size=n)  # sample with replacement

    Xb = X[idx]
    yb = y[idx]

    model = Pipeline([
        ("scaler", StandardScaler(with_mean=True, with_std=True)),
        ("clf", LogisticRegression(
            max_iter=2000,
            class_weight="balanced",
            solver="lbfgs",
            random_state=seed
        ))
    ])

    model.fit(Xb, yb)
    return model


def main():
    ensure_out_dir()
    df, feature_cols, X, y_irrit, y_acne = load_data()

    # Save feature columns order (must match predictor)
    with open(OUT_DIR / "feature_columns.json", "w", encoding="utf-8") as f:
        json.dump(feature_cols, f, indent=2)

    irrit_models = []
    acne_models = []

    for i in range(K):
        irrit_models.append(fit_one(X, y_irrit, seed=100 + i))
        acne_models.append(fit_one(X, y_acne, seed=200 + i))

    joblib.dump(irrit_models, OUT_DIR / "irritation_ensemble.joblib")
    joblib.dump(acne_models, OUT_DIR / "acne_ensemble.joblib")

    meta = {
        "model_version": "ai-v2-ensemble",
        "feature_schema_version": "fs-v1",
        "rows": int(len(df)),
        "num_features": int(len(feature_cols)),
        "ensemble_size": K,
        "targets": ["y_irritation", "y_acne"],
        "notes": "Bootstrap ensemble of LogisticRegression pipelines"
    }

    with open(OUT_DIR / "model_meta.json", "w", encoding="utf-8") as f:
        json.dump(meta, f, indent=2)

    print("A5 COMPLETE: Ensemble models saved to:", OUT_DIR)
    print(json.dumps(meta, indent=2))


if __name__ == "__main__":
    main()

