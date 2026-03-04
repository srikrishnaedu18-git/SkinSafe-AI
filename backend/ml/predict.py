import json
import sys
from pathlib import Path

import joblib
import numpy as np

BASE_DIR = Path(__file__).resolve().parents[1]  # backend/
MODEL_DIR = BASE_DIR / "ml" / "models"

IRRIT_MODEL_PATH = MODEL_DIR / "irritation_model.joblib"
ACNE_MODEL_PATH = MODEL_DIR / "acne_model.joblib"
FEATURE_COLS_PATH = MODEL_DIR / "feature_columns.json"
META_PATH = MODEL_DIR / "model_meta.json"


def clamp(x, lo, hi):
    return max(lo, min(hi, x))


def load_artifacts():
    if not IRRIT_MODEL_PATH.exists():
        raise FileNotFoundError(f"Missing: {IRRIT_MODEL_PATH}")
    if not ACNE_MODEL_PATH.exists():
        raise FileNotFoundError(f"Missing: {ACNE_MODEL_PATH}")
    if not FEATURE_COLS_PATH.exists():
        raise FileNotFoundError(f"Missing: {FEATURE_COLS_PATH}")
    if not META_PATH.exists():
        raise FileNotFoundError(f"Missing: {META_PATH}")

    irrit_model = joblib.load(IRRIT_MODEL_PATH)
    acne_model = joblib.load(ACNE_MODEL_PATH)

    with open(FEATURE_COLS_PATH, "r", encoding="utf-8") as f:
        feature_cols = json.load(f)

    with open(META_PATH, "r", encoding="utf-8") as f:
        meta = json.load(f)

    return irrit_model, acne_model, feature_cols, meta


def predict_one(payload, irrit_model, acne_model, feature_cols, meta):
    # payload must include:
    # { "features": {...}, "feature_schema_version": "fs-v1", "model_version_request": "ai-v1" }
    feats = payload.get("features", {})
    # Build vector in saved column order
    x = np.array([[float(feats.get(c, 0.0)) for c in feature_cols]], dtype=float)

    p_irrit = float(irrit_model.predict_proba(x)[0, 1])
    p_acne = float(acne_model.predict_proba(x)[0, 1])

    # ---- A4 scoring ----
    risk = 0.7 * p_irrit + 0.3 * p_acne
    risk = clamp(risk, 0.0, 1.0)

    suitability = int(round(100.0 * (1.0 - risk)))
    suitability = int(clamp(suitability, 0, 100))

    # ---- confidence (simple proxy) ----
    confidence = 1.0 - 2.0 * abs(risk - 0.5)
    confidence = clamp(confidence, 0.0, 1.0)

    return {
        "p_irritation": clamp(p_irrit, 0.0, 1.0),
        "p_acne": clamp(p_acne, 0.0, 1.0),
        "suitability_score": suitability,
        "confidence": confidence,
        "model_version": meta.get("model_version", "ai-v1"),
        "feature_schema_version": meta.get("feature_schema_version", "fs-v1"),
    }


def main():
    # Read JSON from stdin
    raw = sys.stdin.read()
    if not raw.strip():
        print(json.dumps({"error": "No input JSON provided"}))
        sys.exit(1)

    payload = json.loads(raw)

    irrit_model, acne_model, feature_cols, meta = load_artifacts()
    out = predict_one(payload, irrit_model, acne_model, feature_cols, meta)

    print(json.dumps(out))


if __name__ == "__main__":
    main()

