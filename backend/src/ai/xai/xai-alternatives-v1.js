function normalizeText(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

export function buildAlternativeConstraints({ risk_flags, user_profile, product }) {
  const avoidIngredients = new Set();
  const preferTags = new Set();
  const avoidTags = new Set();

  const preferences = new Set((user_profile?.preferences || []).map(normalizeText));
  const conditions = new Set((user_profile?.conditions || []).map(normalizeText));
  const skinType = normalizeText(user_profile?.skin_type);

  const productType = product?.type || null;
  const hasFlag = (code) => risk_flags?.some((flag) => flag.code === code);

  if (hasFlag('FRAGRANCE_PRESENT') || hasFlag('PREF_FRAGRANCE_FREE_VIOLATION')) {
    avoidIngredients.add('Fragrance');
    avoidTags.add('fragrance');
    preferTags.add('fragrance-free');
  }

  // [fs-v2] Hard block allergens from alternatives
  if (hasFlag('ALLERGY_FRAGRANCE_MATCH')) {
    avoidIngredients.add('Fragrance');
    avoidTags.add('fragrance');
    preferTags.add('fragrance-free');
  }

  if (hasFlag('ALLERGY_PARABENS_MATCH')) {
    avoidIngredients.add('Parabens');
    preferTags.add('paraben-free');
  }

  if (hasFlag('ALCOHOL_DENAT_PRESENT')) {
    avoidIngredients.add('Alcohol Denat');
    avoidTags.add('drying');
    preferTags.add('barrier-support');
  }

  if (hasFlag('SALICYLIC_ACID_PRESENT') && skinType === 'sensitive') {
    preferTags.add('gentle');
  }

  if (hasFlag('SHEA_BUTTER_COMEDOGENIC_RISK')) {
    avoidIngredients.add('Shea Butter');
    preferTags.add('low-comedogenic');
  }

  if (conditions.has('eczema')) {
    preferTags.add('barrier-support');
    preferTags.add('gentle');
  }

  if (conditions.has('acne-prone') || conditions.has('acne prone')) {
    preferTags.add('low-comedogenic');
  }

  if (preferences.has('fragrance-free')) {
    avoidIngredients.add('Fragrance');
    avoidTags.add('fragrance');
    preferTags.add('fragrance-free');
  }
  if (preferences.has('low-comedogenic')) {
    preferTags.add('low-comedogenic');
  }

  return {
    same_category: productType,
    avoid_ingredients: Array.from(avoidIngredients),
    avoid_tags: Array.from(avoidTags),
    prefer_tags: Array.from(preferTags),
    objective: 'minimize_fused_risk',
    max_results: 3,
  };
}
