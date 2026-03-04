import json
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import roc_auc_score, accuracy_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

BASE_DIR = Path(__file__).resolve().parents[1]  # backend/
CSV_PATH = BASE_DIR / "ai" / "dataset" / "train.csv"
OUT_DIR = BASE_DIR / "ml" / "models"

LABEL_COLS = {"p_irritation_label", "y_irritation", "p_acne_label", "y_acne"}
ID_COLS = {"qr_id", "product_type", "skin_type"}


def ensure_out_dir():
    OUT_DIR.mkdir(parents=True, exist_ok=True)


def load_data():
    if not CSV_PATH.exists():
        raise FileNotFoundError(f"train.csv not found at: {CSV_PATH}")

    df = pd.read_csv(CSV_PATH)

    # Detect feature columns from the CSV header
    feature_cols = [c for c in df.columns if c not in ID_COLS and c not in LABEL_COLS]

    if "y_irritation" not in df.columns or "y_acne" not in df.columns:
        raise ValueError("Missing target columns y_irritation and/or y_acne in train.csv")

    # Enforce numeric
    X = df[feature_cols].astype(float).values
    y_irrit = df["y_irritation"].astype(int).values
    y_acne = df["y_acne"].astype(int).values

    return df, feature_cols, X, y_irrit, y_acne


def train_model(X, y, seed=42):
    # Logistic regression baseline (fast + good)
    model = Pipeline([
        ("scaler", StandardScaler(with_mean=True, with_std=True)),
        ("clf", LogisticRegression(
            max_iter=2000,
            class_weight="balanced",
            solver="lbfgs"
        ))
    ])

    X_train, X_test, y_train, y_test = train_test_split(
        X, y,
        test_size=0.2,
        random_state=seed,
        stratify=y if len(np.unique(y)) > 1 else None
    )

    model.fit(X_train, y_train)

    proba = model.predict_proba(X_test)[:, 1]
    pred = (proba >= 0.5).astype(int)

    acc = accuracy_score(y_test, pred)
    auc = roc_auc_score(y_test, proba) if len(np.unique(y_test)) > 1 else float("nan")

    return model, {
        "accuracy": float(acc),
        "roc_auc": float(auc),
        "test_size": int(len(y_test)),
        "positive_rate_test": float(np.mean(y_test))
    }


def main():
    ensure_out_dir()

    df, feature_cols, X, y_irrit, y_acne = load_data()

    irrit_model, irrit_metrics = train_model(X, y_irrit, seed=42)
    acne_model, acne_metrics = train_model(X, y_acne, seed=43)

    # Save models
    joblib.dump(irrit_model, OUT_DIR / "irritation_model.joblib")
    joblib.dump(acne_model, OUT_DIR / "acne_model.joblib")

    # Save feature columns order (CRITICAL for prediction consistency)
    with open(OUT_DIR / "feature_columns.json", "w", encoding="utf-8") as f:
        json.dump(feature_cols, f, indent=2)

    # Save metadata
    meta = {
        "model_version": "ai-v1",
        "feature_schema_version": "fs-v1",
        "rows": int(len(df)),
        "num_features": int(len(feature_cols)),
        "targets": ["y_irritation", "y_acne"],
        "metrics": {
            "irritation": irrit_metrics,
            "acne": acne_metrics
        }
    }

    with open(OUT_DIR / "model_meta.json", "w", encoding="utf-8") as f:
        json.dump(meta, f, indent=2)

    print("\nA3 COMPLETE: Models saved to:", OUT_DIR)
    print(json.dumps(meta, indent=2))


if __name__ == "__main__":
    main()

