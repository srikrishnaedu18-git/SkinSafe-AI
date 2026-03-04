function clamp01(value) {
  const n = Number(value);
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function severityFromImpact(impact) {
  const x = clamp01(impact);
  if (x >= 0.18) return 'HIGH';
  if (x >= 0.08) return 'MEDIUM';
  return 'LOW';
}

function actionHint(reason) {
  const rules = reason?.evidence?.rules || [];
  const item = String(reason?.item || '').toLowerCase();

  if (item.includes('fragrance')) {
    return 'Prefer fragrance-free options; avoid eye/neck area and patch test.';
  }
  if (item.includes('alcohol denat')) {
    return 'Use with barrier support (moisturizer) and avoid on irritated skin.';
  }
  if (item.includes('salicylic')) {
    return 'Start slowly (1-2x/week) and avoid combining with other strong actives initially.';
  }
  if (item.includes('shea butter')) {
    return 'If acne-prone, limit heavy occlusive products; watch for clogged pores.';
  }
  if (rules.includes('R_PREF_FF_1')) {
    return 'Choose products aligned with your fragrance-free preference.';
  }

  if (reason?.risk_target === 'IRRITATION') {
    return 'Patch test and start with low frequency if you are new to this product.';
  }
  if (reason?.risk_target === 'ACNE') {
    return 'Monitor for breakouts during first week; reduce usage if pores feel congested.';
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

function whyLine(reason) {
  const message = reason?.message || '';
  return message.length > 140 ? `${message.slice(0, 140)}...` : message;
}

function enrichReason(reason) {
  const impact = clamp01(reason?.impact);
  return {
    ...reason,
    severity: severityFromImpact(impact),
    title: titleForReason(reason),
    why: whyLine(reason),
    action: actionHint(reason),
  };
}

export function composeReasons(reasons, limit = 5) {
  const arr = Array.isArray(reasons) ? reasons : [];
  const sorted = [...arr].sort((a, b) => {
    const ia = Number(a?.impact ?? 0);
    const ib = Number(b?.impact ?? 0);
    if (ib !== ia) return ib - ia;
    return String(a?.item || '').localeCompare(String(b?.item || ''));
  });

  const top = sorted.slice(0, limit).map(enrichReason);
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
