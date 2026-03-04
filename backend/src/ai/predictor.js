import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const { buildFeatures } = require(path.join(__dirname, '../../ai/feature_builder.js'));

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

function round2(value) {
  return Number(value.toFixed(2));
}

export function runA0Predict(userProfile, product) {
  const engineered = buildFeatures(userProfile, product.ingredients);
  const f = engineered.features;

  let pIrritation =
    0.05 +
    0.06 * f.ing_count_fragrance +
    0.05 * f.ing_count_drying_irritants +
    0.035 * f.ing_count_acids +
    0.02 * f.ing_irritant_severity_sum +
    0.025 * f.x_sensitive__irritant_sum +
    0.06 * f.x_pref_ff__has_fragrance +
    0.04 * f.x_eczema__drying_count;

  let pAcne = f.u_has_acne_prone
    ? 0.07 + 0.03 * f.ing_count_emollients + 0.03 * f.ing_comedogenic_severity_sum + 0.04 * f.x_acneprone__comedogenic_sum
    : null;

  pIrritation = clamp01(pIrritation);
  if (pAcne !== null) pAcne = clamp01(pAcne);

  const acnePenalty = pAcne === null ? 0 : pAcne * 0.25;
  const suitability = Math.round(Math.max(0, Math.min(100, (1 - pIrritation * 0.75 - acnePenalty) * 100)));

  let confidence = 0.9;
  if (f.ing_count_total < 2) confidence -= 0.15;
  if (f.ing_count_total > 0 && f.ing_count_total >= 2 && f.ing_irritant_severity_sum === 0 && f.ing_comedogenic_severity_sum === 0) {
    confidence -= 0.1;
  }
  if (pAcne === null) confidence -= 0.05;
  confidence = clamp01(confidence);

  return {
    p_irritation: round2(pIrritation),
    p_acne: pAcne === null ? null : round2(pAcne),
    suitability_score: suitability,
    confidence: round2(confidence),
    model_version: 'ai-v1',
    feature_schema_version: engineered.feature_schema_version,
  };
}
