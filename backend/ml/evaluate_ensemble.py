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

IRRIT_ENSEMBLE_PATH = MODEL_DIR / "irritation_ensemble.joblib"
ACNE_ENSEMBLE_PATH = MODEL_DIR / "acne_ensemble.joblib"
FEATURE_COLS_PATH = MODEL_DIR / "feature_columns.json"
META_PATH = MODEL_DIR / "model_meta.json"

LABEL_COLS = {"p_irritation_label", "y_irritation", "p_acne_label", "y_acne"}
ID_COLS = {"qr_id", "product_type", "skin_type"}


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


def best_threshold_by_f1(y_true, p):
    best = None
    for thr in np.linspace(0.05, 0.95, 19):
        m = metrics_at_threshold(y_true, p, thr)
        if best is None or m["f1"] > best["f1"]:
            best = m
    return best


def ensemble_mean_std(models, X):
    # models: list of sklearn pipelines
    probs = []
    for m in models:
        probs.append(m.predict_proba(X)[:, 1])
    P = np.vstack(probs)  # (K, N)
    return P.mean(axis=0), P.std(axis=0, ddof=0)


def main():
    if not CSV_PATH.exists():
        raise FileNotFoundError(f"train.csv not found at {CSV_PATH}")
    if not IRRIT_ENSEMBLE_PATH.exists() or not ACNE_ENSEMBLE_PATH.exists():
        raise FileNotFoundError("Ensemble model files missing. Run: python ml/train_ensemble.py")

    df = pd.read_csv(CSV_PATH)

    with open(FEATURE_COLS_PATH, "r", encoding="utf-8") as f:
        feature_cols = json.load(f)

    with open(META_PATH, "r", encoding="utf-8") as f:
        meta = json.load(f)

    X = df[feature_cols].astype(float).values
    y_irrit = df["y_irritation"].astype(int).values
    y_acne = df["y_acne"].astype(int).values

    irrit_models = joblib.load(IRRIT_ENSEMBLE_PATH)
    acne_models = joblib.load(ACNE_ENSEMBLE_PATH)

    p_irrit, std_irrit = ensemble_mean_std(irrit_models, X)
    p_acne, std_acne = ensemble_mean_std(acne_models, X)

    auc_irrit = float(roc_auc_score(y_irrit, p_irrit)) if len(np.unique(y_irrit)) > 1 else float("nan")
    auc_acne = float(roc_auc_score(y_acne, p_acne)) if len(np.unique(y_acne)) > 1 else float("nan")

    best_thr_irrit = best_threshold_by_f1(y_irrit, p_irrit)
    best_thr_acne = best_threshold_by_f1(y_acne, p_acne)

    # Risk buckets for final fused risk (same as A4/A5)
    # risk = 0.7*p_irrit + 0.3*p_acne
    fused_risk = np.clip(0.7 * p_irrit + 0.3 * p_acne, 0, 1)
    fused_std = 0.5 * (std_irrit + std_acne)

    report = {
        "model_version": meta.get("model_version", "ai-v2-ensemble"),
        "feature_schema_version": meta.get("feature_schema_version", "fs-v1"),
        "ensemble_size": meta.get("ensemble_size", None),
        "roc_auc": {"irritation": auc_irrit, "acne": auc_acne},
        "best_threshold_by_f1": {"irritation": best_thr_irrit, "acne": best_thr_acne},
        "risk_bucket_rules": {
            "low": "fused_risk < 0.35",
            "medium": "0.35 <= fused_risk <= 0.65",
            "high": "fused_risk > 0.65",
        },
        "uncertainty_summary": {
            "std_irritation_mean": float(np.mean(std_irrit)),
            "std_acne_mean": float(np.mean(std_acne)),
            "fused_std_mean": float(np.mean(fused_std)),
            "fused_std_p95": float(np.quantile(fused_std, 0.95)),
        },
    }

    out_path = MODEL_DIR / "evaluation_report_ensemble.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)

    print("Saved:", out_path)
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()

