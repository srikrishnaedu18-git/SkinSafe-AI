function normalizeText(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function normalizePreferences(preferences) {
  return new Set(
    (Array.isArray(preferences) ? preferences : []).map(normalizeText).map((pref) => {
      if (pref === 'fragrance free') return 'fragrance-free';
      if (pref === 'low comedogenic') return 'low-comedogenic';
      return pref;
    })
  );
}

function normalizeConditions(conditions) {
  return new Set(
    (Array.isArray(conditions) ? conditions : []).map(normalizeText).map((condition) => {
      if (condition === 'acne prone' || condition === 'acneprone') return 'acne-prone';
      return condition;
    })
  );
}

function normalizeIngredients(ingredients) {
  return (Array.isArray(ingredients) ? ingredients : []).map(normalizeText).filter(Boolean);
}

function makeFlag(code, severity, ingredients = [], features = [], rules = []) {
  return {
    code,
    severity,
    evidence: {
      ingredients,
      features,
      rules,
    },
  };
}

function makeReason(type, riskTarget, item, impact, message, ingredients = [], features = [], rules = []) {
  return {
    rank: null,
    type,
    risk_target: riskTarget,
    item,
    impact,
    message,
    evidence: {
      ingredients,
      features,
      rules,
    },
  };
}

export function runXaiRules({ user_profile, product, features, attributions }) {
  const rules_fired = [];
  const risk_flags = [];
  const reasons = [];

  const skinType = normalizeText(user_profile?.skin_type);
  const conditions = normalizeConditions(user_profile?.conditions);
  const preferences = normalizePreferences(user_profile?.preferences);
  const ingredients = normalizeIngredients(product?.ingredients);

  const hasFragrance = ingredients.includes('fragrance') || features.ing_has_fragrance === 1;
  const hasAlcoholDenat = ingredients.includes('alcohol denat') || features.ing_has_alcohol_denat === 1;
  const hasSalicylic = ingredients.includes('salicylic acid') || features.ing_has_salicylic_acid === 1;
  const hasShea = ingredients.includes('shea butter') || features.ing_has_shea_butter === 1;

  function ingFromFeature(featureName, fallback = []) {
    const found = attributions?.feature_to_ingredients?.[featureName];
    return Array.isArray(found) && found.length ? found : fallback;
  }

  if (hasFragrance) {
    const rule = 'R_FRAG_1';
    rules_fired.push(rule);
    const fragranceIngredients = ingFromFeature('ing_has_fragrance', ['Fragrance']);
    risk_flags.push(makeFlag('FRAGRANCE_PRESENT', 'HIGH', fragranceIngredients, ['ing_has_fragrance'], [rule]));
    reasons.push(
      makeReason(
        'INGREDIENT',
        'IRRITATION',
        'Fragrance',
        0.25,
        'Fragrance is a common sensitizer/irritant and may trigger redness or stinging.',
        fragranceIngredients,
        ['ing_has_fragrance'],
        [rule]
      )
    );
  }

  if (preferences.has('fragrance-free') && hasFragrance) {
    const rule = 'R_PREF_FF_1';
    rules_fired.push(rule);
    risk_flags.push(
      makeFlag(
        'PREF_FRAGRANCE_FREE_VIOLATION',
        'HIGH',
        ingFromFeature('ing_has_fragrance', ['Fragrance']),
        ['u_pref_fragrance_free', 'ing_has_fragrance'],
        [rule]
      )
    );
    reasons.push(
      makeReason(
        'INTERACTION',
        'OVERALL',
        'Fragrance-Free Preference',
        0.2,
        'You prefer fragrance-free products, but this product contains fragrance.',
        ingFromFeature('ing_has_fragrance', ['Fragrance']),
        ['u_pref_fragrance_free', 'ing_has_fragrance'],
        [rule]
      )
    );
  }

  if (hasAlcoholDenat) {
    const rule = 'R_ALC_1';
    rules_fired.push(rule);
    const alcoholIngredients = ingFromFeature('ing_has_alcohol_denat', ['Alcohol Denat']);
    risk_flags.push(makeFlag('ALCOHOL_DENAT_PRESENT', 'MEDIUM', alcoholIngredients, ['ing_has_alcohol_denat'], [rule]));
    reasons.push(
      makeReason(
        'INGREDIENT',
        'IRRITATION',
        'Alcohol Denat',
        0.18,
        'Alcohol Denat can be drying and may worsen irritation for sensitive or compromised skin barriers.',
        alcoholIngredients,
        ['ing_has_alcohol_denat'],
        [rule]
      )
    );
  }

  if (conditions.has('eczema') && Number(features.ing_count_drying_irritants || 0) > 0) {
    const rule = 'R_ECZ_1';
    rules_fired.push(rule);
    const ingredientsEvidence = ingFromFeature(
      'ing_count_drying_irritants',
      hasAlcoholDenat ? ['Alcohol Denat'] : []
    );
    risk_flags.push(
      makeFlag(
        'ECZEMA_DRYING_IRRITANT_RISK',
        'HIGH',
        ingredientsEvidence,
        ['u_has_eczema', 'ing_count_drying_irritants'],
        [rule]
      )
    );
    reasons.push(
      makeReason(
        'INTERACTION',
        'IRRITATION',
        'Eczema + Drying Irritants',
        0.22,
        'With eczema-prone skin, drying ingredients can increase the chance of flare-ups or stinging.',
        ingredientsEvidence,
        ['u_has_eczema', 'ing_count_drying_irritants'],
        [rule]
      )
    );
  }

  if (skinType === 'sensitive' && Number(features.ing_irritant_severity_sum || 0) >= 4) {
    const rule = 'R_SENS_1';
    rules_fired.push(rule);
    const irritantLoadIngredients = ingFromFeature('ing_irritant_severity_sum', []);
    risk_flags.push(
      makeFlag(
        'SENSITIVE_HIGH_IRRITANT_LOAD',
        'HIGH',
        irritantLoadIngredients,
        ['u_skin_sensitive', 'ing_irritant_severity_sum'],
        [rule]
      )
    );
    reasons.push(
      makeReason(
        'USER_CONTEXT',
        'IRRITATION',
        'Sensitive Skin + Irritant Load',
        0.2,
        'Your sensitive skin combined with multiple potentially irritating actives increases irritation risk.',
        irritantLoadIngredients,
        ['u_skin_sensitive', 'ing_irritant_severity_sum'],
        [rule]
      )
    );
  }

  if (hasSalicylic) {
    const rule = 'R_ACID_1';
    rules_fired.push(rule);
    const severity = skinType === 'sensitive' ? 'MEDIUM' : 'LOW';
    const impact = skinType === 'sensitive' ? 0.14 : 0.08;
    const salicylicIngredients = ingFromFeature('ing_has_salicylic_acid', ['Salicylic Acid']);
    risk_flags.push(
      makeFlag('SALICYLIC_ACID_PRESENT', severity, salicylicIngredients, ['ing_has_salicylic_acid'], [rule])
    );
    reasons.push(
      makeReason(
        'INGREDIENT',
        'IRRITATION',
        'Salicylic Acid',
        impact,
        'Salicylic Acid can cause dryness/tingling, especially if overused or on sensitive skin.',
        salicylicIngredients,
        ['ing_has_salicylic_acid'],
        [rule]
      )
    );
  }

  if (hasShea && (skinType === 'oily' || conditions.has('acne-prone'))) {
    const rule = 'R_COMED_1';
    rules_fired.push(rule);
    const sheaIngredients = ingFromFeature('ing_has_shea_butter', ['Shea Butter']);
    const comedogenicIngredients = ingFromFeature('ing_comedogenic_severity_sum', sheaIngredients);
    risk_flags.push(
      makeFlag('SHEA_BUTTER_COMEDOGENIC_RISK', 'MEDIUM', comedogenicIngredients, ['ing_has_shea_butter'], [rule])
    );
    reasons.push(
      makeReason(
        'INTERACTION',
        'ACNE',
        'Shea Butter',
        0.16,
        'Shea Butter can be heavy/occlusive and may increase clogging risk for oily or acne-prone skin.',
        comedogenicIngredients,
        ['ing_has_shea_butter'],
        [rule]
      )
    );
  }

  return { risk_flags, reasons, rules_fired };
}
