import { normalizeCommaList } from './normalizer.js';

const IRRITANT_INGREDIENTS = new Set(['fragrance', 'alcohol denat', 'salicylic acid', 'retinol']);
const COMEDOGENIC_INGREDIENTS = new Set(['coconut oil', 'isopropyl myristate']);

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

function round2(value) {
  return Number(value.toFixed(2));
}

export function runA0Predict(userProfile, product) {
  const ingredients = normalizeCommaList(product.ingredients);
  const allergies = new Set(userProfile.allergies);
  const conditions = new Set(userProfile.conditions);

  let pIrritation = 0.08;
  let pAcne = conditions.has('acne-prone') ? 0.1 : null;

  for (const ingredient of ingredients) {
    if (allergies.has(ingredient)) pIrritation += 0.35;
    if (IRRITANT_INGREDIENTS.has(ingredient) && userProfile.skin_type === 'sensitive') pIrritation += 0.18;
    if (ingredient === 'fragrance' && userProfile.preferences.includes('fragrance-free')) pIrritation += 0.2;
    if (pAcne !== null && COMEDOGENIC_INGREDIENTS.has(ingredient)) pAcne += 0.3;
  }

  pIrritation = clamp01(pIrritation);
  if (pAcne !== null) pAcne = clamp01(pAcne);

  const acnePenalty = pAcne === null ? 0 : pAcne * 0.25;
  const suitability = Math.round(Math.max(0, Math.min(100, (1 - pIrritation * 0.75 - acnePenalty) * 100)));

  let confidence = 0.9;
  if (ingredients.length < 2) confidence -= 0.15;
  if (pAcne === null) confidence -= 0.05;
  confidence = clamp01(confidence);

  return {
    p_irritation: round2(pIrritation),
    p_acne: pAcne === null ? null : round2(pAcne),
    suitability_score: suitability,
    confidence: round2(confidence),
    model_version: 'ai-v1',
    feature_schema_version: 'fs-v1',
  };
}

