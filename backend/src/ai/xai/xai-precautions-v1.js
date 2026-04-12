function uniqByCode(list) {
  const seen = new Set();
  const out = [];
  for (const precaution of list) {
    if (!precaution?.code) continue;
    if (seen.has(precaution.code)) continue;
    seen.add(precaution.code);
    out.push(precaution);
  }
  return out;
}

export function buildPrecautionsV1({ risk_level, risk_flags, user_profile }) {
  const precautions = [];

  // [fs-v2] Allergy stop-use warnings — highest priority (0), shown before everything else
  const hasFlag = (code) => risk_flags?.some((flag) => flag.code === code);

  if (hasFlag('ALLERGY_FRAGRANCE_MATCH')) {
    precautions.push({
      code: 'ALLERGY_FRAGRANCE_STOP',
      priority: 0,
      text: '⚠️ ALLERGY ALERT: You have a stated fragrance allergy and this product contains Fragrance. Do NOT use this product — seek a fragrance-free alternative.',
    });
  }

  if (hasFlag('ALLERGY_PARABENS_MATCH')) {
    precautions.push({
      code: 'ALLERGY_PARABENS_STOP',
      priority: 0,
      text: '⚠️ ALLERGY ALERT: You have a stated parabens allergy and this product contains Parabens. Do NOT use this product — seek a paraben-free alternative.',
    });
  }

  precautions.push({
    code: 'PATCH_TEST_24H',
    priority: 1,
    text: 'Patch test: apply a small amount on inner arm, leave for 24 hours, and check for redness/itching/burning.',
  });

  if (risk_level === 'HIGH') {
    precautions.push({
      code: 'START_1_2X_PER_WEEK',
      priority: 2,
      text: 'Start with 1-2 uses per week. Increase slowly only if there is no irritation.',
    });
    precautions.push({
      code: 'AVOID_BROKEN_SKIN',
      priority: 3,
      text: 'Avoid applying on broken/irritated skin. Stop immediately if burning persists.',
    });
    precautions.push({
      code: 'AVOID_EYE_NECK',
      priority: 4,
      text: 'Avoid sensitive zones (around eyes, corners of nose, neck) during initial trials.',
    });
  } else if (risk_level === 'MEDIUM') {
    precautions.push({
      code: 'START_3_4X_PER_WEEK',
      priority: 2,
      text: 'Start with moderate frequency (3-4 uses/week) and monitor for dryness or redness.',
    });
    precautions.push({
      code: 'MONITOR_FIRST_3_USES',
      priority: 3,
      text: 'Monitor during the first 3 uses for stinging, itching, or increased dryness.',
    });
  } else {
    precautions.push({
      code: 'INTRODUCE_GRADUALLY',
      priority: 2,
      text: 'Even with low risk, introduce gradually and patch test before full-face use.',
    });
  }

  if (hasFlag('FRAGRANCE_PRESENT')) {
    precautions.push({
      code: 'FRAGRANCE_CAUTION',
      priority: 5,
      text: 'Fragrance present: if you are sensitive, avoid eye/neck area and prefer fragrance-free alternatives.',
    });
  }

  if (hasFlag('ALCOHOL_DENAT_PRESENT')) {
    precautions.push({
      code: 'ALCOHOL_DRYNESS_CAUTION',
      priority: 5,
      text: 'Alcohol Denat present: can be drying. Use a moisturizer after application and stop if skin feels tight or flaky.',
    });
  }

  if (hasFlag('SALICYLIC_ACID_PRESENT')) {
    precautions.push({
      code: 'ACID_LAYERING_CAUTION',
      priority: 5,
      text: 'Salicylic Acid present: avoid combining initially with other strong actives (retinoids/AHAs). Start slowly.',
    });
  }

  if (hasFlag('SHEA_BUTTER_COMEDOGENIC_RISK')) {
    precautions.push({
      code: 'COMEDOGENIC_CAUTION',
      priority: 5,
      text: 'Heavy emollients present: if acne-prone, monitor for clogged pores and reduce usage if breakouts increase.',
    });
  }

  const conditions = new Set((user_profile?.conditions || []).map((x) => String(x).toLowerCase().trim()));
  if (conditions.has('eczema')) {
    precautions.push({
      code: 'ECZEMA_BARRIER_SUPPORT',
      priority: 6,
      text: 'Eczema-prone: prioritize barrier support (ceramides/moisturizer). Avoid applying during active flare-ups.',
    });
  }
  if (conditions.has('acne-prone') || conditions.has('acne prone')) {
    precautions.push({
      code: 'ACNE_MONITOR_7_DAYS',
      priority: 6,
      text: 'Acne-prone: monitor for 7 days. If new breakouts appear, reduce frequency or switch to lower-comedogenic options.',
    });
  }

  if (hasFlag('PREF_FRAGRANCE_FREE_VIOLATION')) {
    precautions.push({
      code: 'PREF_ALIGNMENT_NOTE',
      priority: 7,
      text: 'Preference mismatch: your profile prefers fragrance-free. Consider alternatives aligned with your preference.',
    });
  }

  return uniqByCode(precautions).sort((a, b) => (a.priority || 99) - (b.priority || 99));
}
