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
    irrit_models = joblib.load(IRRIT_ENSEMBLE_PATH)
    acne_models = joblib.load(ACNE_ENSEMBLE_PATH)

    with open(FEATURE_COLS_PATH, "r", encoding="utf-8") as f:
        feature_cols = json.load(f)

    with open(META_PATH, "r", encoding="utf-8") as f:
        meta = json.load(f)

    return irrit_models, acne_models, feature_cols, meta


def ensemble_predict(models, x):
    probs = np.array([m.predict_proba(x)[0, 1] for m in models], dtype=float)
    return float(probs.mean()), float(probs.std(ddof=0))


def fused_risk(p_irrit, p_acne):
    return clamp(0.7 * p_irrit + 0.3 * p_acne, 0.0, 1.0)


def confidence_from_std(std, max_std=0.20):
    return clamp(1.0 - (std / max_std), 0.0, 1.0)


def main():
    raw = sys.stdin.read()
    if not raw.strip():
        print(json.dumps({"error": "No input JSON"}))
        sys.exit(1)

    payload = json.loads(raw)
    feats = payload.get("features", {})
    top_k = int(payload.get("top_k", 10))

    irrit_models, acne_models, feature_cols, meta = load_artifacts()

    x0 = np.array([[float(feats.get(c, 0.0)) for c in feature_cols]], dtype=float)

    p_irrit0, std_irrit0 = ensemble_predict(irrit_models, x0)
    p_acne0, std_acne0 = ensemble_predict(acne_models, x0)

    risk0 = fused_risk(p_irrit0, p_acne0)
    suitability0 = round(100.0 * (1.0 - risk0), 2)
    suitability0 = float(clamp(suitability0, 0.0, 100.0))

    avg_std0 = 0.5 * (std_irrit0 + std_acne0)
    confidence0 = confidence_from_std(avg_std0, max_std=0.20)

    impacts = []
    x_ab = x0.copy()

    for j, fname in enumerate(feature_cols):
        original = x_ab[0, j]
        if original == 0:
            continue

        x_ab[0, j] = 0.0
        p_irrit1, _ = ensemble_predict(irrit_models, x_ab)
        p_acne1, _ = ensemble_predict(acne_models, x_ab)
        risk1 = fused_risk(p_irrit1, p_acne1)

        impact = risk0 - risk1
        impacts.append(
            {
                "feature": fname,
                "value": float(original),
                "impact_on_risk": float(impact),
                "risk_before": float(risk0),
                "risk_after": float(risk1),
            }
        )

        x_ab[0, j] = original

    impacts.sort(key=lambda x: abs(x["impact_on_risk"]), reverse=True)
    impacts = impacts[:top_k]

    out = {
        "p_irritation": float(clamp(p_irrit0, 0.0, 1.0)),
        "p_acne": float(clamp(p_acne0, 0.0, 1.0)),
        "suitability_score": suitability0,
        "confidence": float(confidence0),
        "uncertainty": {
            "std_irritation": float(std_irrit0),
            "std_acne": float(std_acne0),
            "avg_std": float(avg_std0),
        },
        "model_version": meta.get("model_version", "ai-v2-ensemble"),
        "feature_schema_version": meta.get("feature_schema_version", "fs-v1"),
        "ensemble_size": meta.get("ensemble_size", None),
        "xai_model_signal": {
            "method": "ablation_feature_zero",
            "top_k": top_k,
            "feature_impacts": impacts,
        },
    }

    print(json.dumps(out))


if __name__ == "__main__":
    main()
