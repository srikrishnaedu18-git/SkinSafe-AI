const SKIN_TYPES = new Set(['sensitive', 'normal', 'oily', 'dry', 'combination']);

const SYNONYM_MAP = {
  'acne prone': 'acne-prone',
  parfum: 'fragrance',
  perfume: 'fragrance',
  'eczema skin': 'eczema',
};

function normalizeToken(value) {
  const lowered = String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
  return SYNONYM_MAP[lowered] ?? lowered;
}

export function normalizeCommaList(input) {
  const rawValues = Array.isArray(input) ? input : [input ?? ''];
  const tokens = rawValues
    .flatMap((item) => String(item).split(','))
    .map(normalizeToken)
    .filter(Boolean);

  const seen = new Set();
  const unique = [];
  for (const token of tokens) {
    if (!seen.has(token)) {
      seen.add(token);
      unique.push(token);
    }
  }
  return unique;
}

export function normalizeSkinType(value) {
  const normalized = normalizeToken(value);
  if (!SKIN_TYPES.has(normalized)) {
    throw new Error('Invalid skin_type. Expected one of sensitive, normal, oily, dry, combination');
  }
  return normalized;
}

export function normalizeProfile(input) {
  const obj = input && typeof input === 'object' ? input : {};

  const userIdRaw = obj.user_id ?? obj.userId ?? '';
  const user_id = String(userIdRaw).trim() || `user-${Date.now()}`;

  return {
    user_id,
    skin_type: normalizeSkinType(obj.skin_type ?? obj.skinType ?? ''),
    allergies: normalizeCommaList(obj.allergies),
    conditions: normalizeCommaList(obj.conditions),
    preferences: normalizeCommaList(obj.preferences),
  };
}

export function normalizeProduct(input) {
  const obj = input && typeof input === 'object' ? input : {};
  const qr_id = String(obj.qr_id ?? '').trim().toUpperCase();
  const type = String(obj.type ?? '').trim();
  const ingredients = normalizeCommaList(obj.ingredients);

  return {
    qr_id,
    type,
    ingredients,
    is_expired: Boolean(obj.is_expired),
  };
}

