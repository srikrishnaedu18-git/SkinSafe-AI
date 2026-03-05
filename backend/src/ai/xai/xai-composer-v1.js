function clamp01(value) {
  const n = Number(value);
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function normalizeText(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function severityFromImpact(impact) {
  const x = clamp01(impact);
  if (x >= 0.18) return 'HIGH';
  if (x >= 0.08) return 'MEDIUM';
  return 'LOW';
}

function actionHint(reason, userProfile) {
  const rules = reason?.evidence?.rules || [];
  const item = String(reason?.item || '').toLowerCase();
  const skinType = normalizeText(userProfile?.skin_type);

  if (item.includes('fragrance')) {
    return 'Prefer fragrance-free options; avoid eye/neck area and patch test.';
  }
  if (item.includes('alcohol denat')) {
    return skinType === 'dry' || skinType === 'sensitive'
      ? 'Use with barrier support moisturizer and avoid use on irritated skin.'
      : 'Use with moisturizer if tightness appears and reduce frequency.';
  }
  if (item.includes('salicylic')) {
    return 'Start slowly (1-2x/week) and avoid combining with other strong actives initially.';
  }
  if (item.includes('shea butter')) {
    return 'If acne-prone, limit heavy occlusive products and monitor for clogged pores.';
  }
  if (rules.includes('R_PREF_FF_1')) {
    return 'Choose products aligned with your fragrance-free preference.';
  }

  if (reason?.risk_target === 'IRRITATION') {
    return 'Patch test and start with low frequency for your skin profile.';
  }
  if (reason?.risk_target === 'ACNE') {
    return 'Monitor for breakouts during first week and reduce usage if needed.';
  }
  return 'Patch test before full-face use.';
}

function titleForReason(reason) {
  const type = reason?.type;
  const item = reason?.item || 'Factor';

  if (type === 'INGREDIENT') return `${item} may increase risk`;
  if (type === 'INTERACTION') return `${item} interaction increases risk`;
  if (type === 'USER_CONTEXT') return 'Your profile increases sensitivity';
  return `${item} contributes to the score`;
}

function personalizeWhy(reason, userProfile) {
  const message = reason?.message || '';
  const skinType = normalizeText(userProfile?.skin_type);
  const conditions = new Set((userProfile?.conditions || []).map(normalizeText));

  if (reason?.type === 'USER_CONTEXT' && skinType) {
    return `${message} This is personalized for your ${skinType} skin profile.`;
  }
  if (conditions.has('eczema') && reason?.risk_target === 'IRRITATION') {
    return `${message} Your eczema condition makes barrier disruption more likely.`;
  }
  if (conditions.has('acne-prone') && reason?.risk_target === 'ACNE') {
    return `${message} Your acne-prone condition increases sensitivity to pore-clogging ingredients.`;
  }
  return message;
}

function personalizationBoost(reason, userProfile) {
  const features = reason?.evidence?.features || [];
  const conditions = new Set((userProfile?.conditions || []).map(normalizeText));

  let boost = 0;
  if (features.some((f) => f.startsWith('u_skin_') || f.startsWith('u_has_') || f.startsWith('x_'))) {
    boost += 0.08;
  }
  if (reason?.type === 'USER_CONTEXT') boost += 0.08;
  if (conditions.has('eczema') && features.includes('u_has_eczema')) boost += 0.06;
  if (conditions.has('acne-prone') && features.includes('u_has_acne_prone')) boost += 0.06;

  return boost;
}

function enrichReason(reason, userProfile) {
  const baseImpact = clamp01(reason?.impact);
  const boostedImpact = clamp01(baseImpact + personalizationBoost(reason, userProfile));
  return {
    ...reason,
    impact: boostedImpact,
    severity: severityFromImpact(boostedImpact),
    title: titleForReason(reason),
    why: personalizeWhy(reason, userProfile),
    action: actionHint(reason, userProfile),
  };
}

export function composeReasons(reasons, userProfile, limit = 5) {
  const arr = Array.isArray(reasons) ? reasons : [];
  const enriched = arr.map((reason) => enrichReason(reason, userProfile));

  const sorted = [...enriched].sort((a, b) => {
    const ia = Number(a?.impact ?? 0);
    const ib = Number(b?.impact ?? 0);
    if (ib !== ia) return ib - ia;
    return String(a?.item || '').localeCompare(String(b?.item || ''));
  });

  const top = sorted.slice(0, limit);
  top.forEach((reason, index) => {
    reason.rank = index + 1;
  });
  return top;
}

export function groupReasons(reasons) {
  const grouped = { IRRITATION: [], ACNE: [], OVERALL: [] };
  for (const reason of Array.isArray(reasons) ? reasons : []) {
    const target = reason?.risk_target || 'OVERALL';
    if (!grouped[target]) grouped[target] = [];
    grouped[target].push(reason);
  }
  return grouped;
}
