const SKIN_TYPES = new Set(['sensitive', 'normal', 'oily', 'dry', 'combination']);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

export function validateAiRequest(payload) {
  assert(payload && typeof payload === 'object', 'Invalid payload: expected object');
  assert(payload.user_profile && typeof payload.user_profile === 'object', 'Invalid payload: user_profile is required');
  assert(payload.product && typeof payload.product === 'object', 'Invalid payload: product is required');

  const profile = payload.user_profile;
  const product = payload.product;

  assert(typeof profile.skin_type === 'string', 'Invalid user_profile.skin_type');
  assert(SKIN_TYPES.has(profile.skin_type), 'Invalid user_profile.skin_type value');
  assert(Array.isArray(profile.allergies), 'Invalid user_profile.allergies');
  assert(Array.isArray(profile.conditions), 'Invalid user_profile.conditions');
  assert(Array.isArray(profile.preferences), 'Invalid user_profile.preferences');

  assert(typeof product.qr_id === 'string' && product.qr_id.length > 0, 'Invalid product.qr_id');
  assert(typeof product.type === 'string' && product.type.length > 0, 'Invalid product.type');
  assert(Array.isArray(product.ingredients), 'Invalid product.ingredients');
}

export function validateAiResponse(response) {
  assert(response && typeof response === 'object', 'Invalid AI response');
  assert(typeof response.p_irritation === 'number', 'Invalid p_irritation');
  assert(response.p_irritation >= 0 && response.p_irritation <= 1, 'p_irritation out of range');
  assert(response.p_acne === null || typeof response.p_acne === 'number', 'Invalid p_acne');
  if (typeof response.p_acne === 'number') {
    assert(response.p_acne >= 0 && response.p_acne <= 1, 'p_acne out of range');
  }
  assert(typeof response.suitability_score === 'number' && Number.isFinite(response.suitability_score), 'Invalid suitability_score');
  assert(response.suitability_score >= 0 && response.suitability_score <= 100, 'suitability_score out of range');
  assert(typeof response.confidence === 'number', 'Invalid confidence');
  assert(response.confidence >= 0 && response.confidence <= 1, 'confidence out of range');
  assert(typeof response.model_version === 'string' && response.model_version.length > 0, 'Invalid model_version');
  assert(
    typeof response.feature_schema_version === 'string' && response.feature_schema_version.length > 0,
    'Invalid feature_schema_version'
  );
}

