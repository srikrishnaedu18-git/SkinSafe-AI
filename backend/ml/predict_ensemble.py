import json
import sys
from pathlib import Path

import joblib
import numpy as np

BASE_DIR = Path(__file__).resolve().parents[1]  # backend/
MODEL_DIR = BASE_DIR / "ml" / "models"

IRRIT_ENSEMBLE_PATH = MODEL_DIR / "irritation_ensemble.joblib"
ACNE_ENSEMBLE_PATH = MODEL_DIR / "acne_ensemble.joblib"
FEATURE_COLS_PATH = MODEL_DIR / "feature_columns.json"
META_PATH = MODEL_DIR / "model_meta.json"


def clamp(x, lo, hi):
    return max(lo, min(hi, x))


def load_artifacts():
    if not IRRIT_ENSEMBLE_PATH.exists():
        raise FileNotFoundError(f"Missing: {IRRIT_ENSEMBLE_PATH}")
    if not ACNE_ENSEMBLE_PATH.exists():
        raise FileNotFoundError(f"Missing: {ACNE_ENSEMBLE_PATH}")
    if not FEATURE_COLS_PATH.exists():
        raise FileNotFoundError(f"Missing: {FEATURE_COLS_PATH}")
    if not META_PATH.exists():
        raise FileNotFoundError(f"Missing: {META_PATH}")

    irrit_models = joblib.load(IRRIT_ENSEMBLE_PATH)
    acne_models = joblib.load(ACNE_ENSEMBLE_PATH)

    with open(FEATURE_COLS_PATH, "r", encoding="utf-8") as f:
        feature_cols = json.load(f)

    with open(META_PATH, "r", encoding="utf-8") as f:
        meta = json.load(f)

    return irrit_models, acne_models, feature_cols, meta


def ensemble_predict(models, x):
    # returns mean prob and std prob
    probs = np.array([m.predict_proba(x)[0, 1] for m in models], dtype=float)
    return float(probs.mean()), float(probs.std(ddof=0))


def confidence_from_std(std, max_std=0.20):
    # Normalize std into [0,1] confidence.
    # If std >= max_std => confidence ~ 0
    # If std = 0 => confidence = 1
    c = 1.0 - (std / max_std)
    return clamp(c, 0.0, 1.0)


def main():
    raw = sys.stdin.read()
    if not raw.strip():
        print(json.dumps({"error": "No input JSON provided"}))
        sys.exit(1)

    payload = json.loads(raw)
    feats = payload.get("features", {})

    irrit_models, acne_models, feature_cols, meta = load_artifacts()

    x = np.array([[float(feats.get(c, 0.0)) for c in feature_cols]], dtype=float)

    p_irrit, std_irrit = ensemble_predict(irrit_models, x)
    p_acne, std_acne = ensemble_predict(acne_models, x)

    # A4 scoring (same)
    risk = 0.7 * p_irrit + 0.3 * p_acne
    risk = clamp(risk, 0.0, 1.0)
    suitability = int(round(100.0 * (1.0 - risk)))
    suitability = int(clamp(suitability, 0, 100))

    # Ensemble confidence: combine both uncertainties
    # Use average std as uncertainty signal
    avg_std = 0.5 * (std_irrit + std_acne)
    confidence = confidence_from_std(avg_std, max_std=0.20)

    out = {
        "p_irritation": clamp(p_irrit, 0.0, 1.0),
        "p_acne": clamp(p_acne, 0.0, 1.0),
        "suitability_score": suitability,
        "confidence": confidence,
        "uncertainty": {
            "std_irritation": std_irrit,
            "std_acne": std_acne,
            "avg_std": avg_std
        },
        "model_version": meta.get("model_version", "ai-v2-ensemble"),
        "feature_schema_version": meta.get("feature_schema_version", "fs-v1"),
        "ensemble_size": meta.get("ensemble_size", None)
    }

    print(json.dumps(out))


if __name__ == "__main__":
    main()

