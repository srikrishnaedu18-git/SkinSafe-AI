import json
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.metrics import (
    roc_auc_score,
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    confusion_matrix,
)

BASE_DIR = Path(__file__).resolve().parents[1]  # backend/
CSV_PATH = BASE_DIR / "ai" / "dataset" / "train.csv"
MODEL_DIR = BASE_DIR / "ml" / "models"

IRRIT_MODEL_PATH = MODEL_DIR / "irritation_model.joblib"
ACNE_MODEL_PATH = MODEL_DIR / "acne_model.joblib"
FEATURE_COLS_PATH = MODEL_DIR / "feature_columns.json"


def load_all():
    df = pd.read_csv(CSV_PATH)
    with open(FEATURE_COLS_PATH, "r", encoding="utf-8") as f:
        cols = json.load(f)

    X = df[cols].astype(float).values
    y_irrit = df["y_irritation"].astype(int).values
    y_acne = df["y_acne"].astype(int).values

    irrit_model = joblib.load(IRRIT_MODEL_PATH)
    acne_model = joblib.load(ACNE_MODEL_PATH)

    return df, X, y_irrit, y_acne, irrit_model, acne_model


def metrics_at_threshold(y_true, p, thr):
    pred = (p >= thr).astype(int)
    return {
        "threshold": float(thr),
        "accuracy": float(accuracy_score(y_true, pred)),
        "precision": float(precision_score(y_true, pred, zero_division=0)),
        "recall": float(recall_score(y_true, pred, zero_division=0)),
        "f1": float(f1_score(y_true, pred, zero_division=0)),
        "confusion_matrix": confusion_matrix(y_true, pred).tolist(),
    }


def find_best_threshold_f1(y_true, p):
    best = None
    for thr in np.linspace(0.05, 0.95, 19):
        m = metrics_at_threshold(y_true, p, thr)
        if best is None or m["f1"] > best["f1"]:
            best = m
    return best


def main():
    _, X, y_irrit, y_acne, irrit_model, acne_model = load_all()

    p_irrit = irrit_model.predict_proba(X)[:, 1]
    p_acne = acne_model.predict_proba(X)[:, 1]

    # ROC-AUC overall
    auc_irrit = float(roc_auc_score(y_irrit, p_irrit)) if len(np.unique(y_irrit)) > 1 else float("nan")
    auc_acne = float(roc_auc_score(y_acne, p_acne)) if len(np.unique(y_acne)) > 1 else float("nan")

    best_thr_irrit = find_best_threshold_f1(y_irrit, p_irrit)
    best_thr_acne = find_best_threshold_f1(y_acne, p_acne)

    # Simple risk buckets (you can tune)
    # low < 0.35, medium 0.35-0.65, high > 0.65
    report = {
        "roc_auc": {"irritation": auc_irrit, "acne": auc_acne},
        "best_threshold_by_f1": {"irritation": best_thr_irrit, "acne": best_thr_acne},
        "risk_bucket_rules": {
            "low": "risk < 0.35",
            "medium": "0.35 <= risk <= 0.65",
            "high": "risk > 0.65",
        },
    }

    out_path = MODEL_DIR / "evaluation_report.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)

    print("A7 evaluation saved:", out_path)
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()

