import { syntheticProducts } from '../data/synthetic-products';
import { runtimeConfig } from '../constants/runtime-config';
import { assessCompatibility } from './ai/compatibility-engine';

const API_BASE = runtimeConfig.apiBaseUrl;
const USE_MOCK_FALLBACK = runtimeConfig.useMockApi;
const REQUEST_TIMEOUT_MS = 12000;
const MAX_RETRIES = 2;

let authToken = null;

export function setAuthToken(token) {
  authToken = typeof token === 'string' && token.trim() ? token.trim() : null;
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseBrand(name) {
  const first = name.trim().split(' ')[0] ?? 'Unknown';
  return first;
}

function safeDecode(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function normalizeQrId(raw) {
  let normalized = raw.trim();

  for (let i = 0; i < 2; i += 1) {
    const decoded = safeDecode(normalized);
    if (decoded === normalized) break;
    normalized = decoded;
  }

  try {
    const parsed = new URL(normalized);
    const qrFromQuery =
      parsed.searchParams.get('qr_id') ??
      parsed.searchParams.get('product_id') ??
      parsed.searchParams.get('qr');

    if (qrFromQuery) {
      normalized = qrFromQuery;
    }
  } catch {
    // keep decoded non-URL payload as-is
  }

  normalized = normalized.toUpperCase();

  const regexMatch = normalized.match(/PROD\d{3}_BATCH\d{2}/);
  if (regexMatch?.[0]) return regexMatch[0];

  return normalized;
}

function mapSyntheticToProduct(qrId) {
  const normalizedQr = normalizeQrId(qrId);
  let matched = syntheticProducts.find((item) => item.qr_id.toUpperCase() === normalizedQr);

  if (!matched) {
    matched = syntheticProducts.find((item) => normalizedQr.includes(item.qr_id.toUpperCase()));
  }

  if (!matched) return null;

  return {
    productId: matched.qr_id,
    qrId: matched.qr_id,
    brand: parseBrand(matched.product_name),
    name: matched.product_name,
    category: matched.type,
    recordUri: `record://synthetic/${matched.qr_id}`,
    inciList: matched.ingredients,
    batchNumber: matched.batch_number,
    origin: matched.origin,
    manufacturedDate: matched.manufactured_date,
    expiryDate: matched.expiry_date,
    isExpired: matched.is_expired,
  };
}

function toConfidence100(value) {
  const numeric = Number(value ?? 0);
  if (!Number.isFinite(numeric)) return 0;
  const scaled = numeric <= 1 ? numeric * 100 : numeric;
  return Math.max(0, Math.min(100, scaled));
}

function normalizeCompatibilityResponse(raw, productId) {
  const ai = raw?.ai;
  const xai = raw?.xai;

  if (ai && xai) {
    const reasons = Array.isArray(xai.reasons) ? xai.reasons : [];
    const rulesFired = xai?.meta?.evidence?.rules_fired ?? [];
    const precautions = Array.isArray(xai.precautions) ? xai.precautions : [];
    const alternatives = xai?.alternatives?.results ?? [];

    const confidenceReason = ai?.uncertainty
      ? `ensemble uncertainty avg std ${Number(ai.uncertainty.avg_std ?? 0).toFixed(4)}`
      : `risk level ${String(xai?.summary?.risk_level ?? 'UNKNOWN').toLowerCase()}`;

    return {
      assessmentId: `asm-${raw.product_id ?? productId}-${Date.now()}`,
      suitabilityScore: Number(ai.suitability_score ?? 0),
      confidence: {
        value: toConfidence100(ai.confidence),
        reason: confidenceReason,
      },
      riskFlags: (xai.risk_flags ?? []).map((flag) => ({
        code: flag.code,
        severity: String(flag.severity ?? 'low').toLowerCase(),
        ingredients: flag?.evidence?.ingredients ?? [],
      })),
      explanations: {
        summary: xai?.summary?.headline ?? 'Explanation unavailable.',
        topNegativeDrivers: reasons.map((reason) => ({
          ingredient: reason.item ?? 'Unknown',
          reason: reason.why ?? reason.message ?? 'No description.',
          penalty: Number((Number(reason.impact ?? 0) * 100).toFixed(2)),
        })),
        topPositiveDrivers: [],
        triggeredRules: rulesFired.map((ruleId) => ({
          ruleId,
          description: `Rule ${ruleId} triggered by current profile and ingredients.`,
        })),
        ingredientContributions: reasons.flatMap((reason) =>
          (reason?.evidence?.ingredients ?? []).map((ingredient) => ({
            ingredient,
            scoreImpact: Number((-Number(reason.impact ?? 0) * 100).toFixed(2)),
            tags: [reason.risk_target ?? 'OVERALL', reason.severity ?? 'LOW'],
          }))
        ),
      },
      guidance: {
        patchTest: precautions
          .filter((item) => String(item.code ?? '').includes('PATCH_TEST'))
          .map((item) => item.text),
        usage: precautions
          .filter((item) => /START_|MONITOR_|INTRODUCE_/.test(String(item.code ?? '')))
          .map((item) => item.text),
        avoidIf: precautions
          .filter((item) => !/PATCH_TEST|START_|MONITOR_|INTRODUCE_/.test(String(item.code ?? '')))
          .map((item) => item.text),
      },
      alternatives: alternatives.map((alt) => ({
        productId: alt.qr_id,
        name: alt.product_name,
        whyBetter: alt.why_better ?? `Higher suitability score (${alt.suitability_score}/100) in same category.`,
      })),
      xai: raw.xai,
    };
  }

  return {
    assessmentId: raw.assessmentId ?? `asm-${productId}-${Date.now()}`,
    suitabilityScore: raw.suitabilityScore,
    confidence: {
      ...(raw.confidence ?? {}),
      value: toConfidence100(raw?.confidence?.value),
    },
    riskFlags: raw.riskFlags,
    explanations: raw.explanations,
    guidance: raw.guidance,
    alternatives: raw.alternatives,
  };
}

async function parseResponseBody(response) {
  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    return response.json();
  }
  return response.text();
}

function buildErrorMessage(status, body) {
  if (typeof body === 'string' && body.trim().length > 0) {
    return `Request failed (${status}): ${body}`;
  }
  if (body && typeof body === 'object' && 'error' in body) {
    return `Request failed (${status}): ${String(body.error)}`;
  }
  if (body && typeof body === 'object' && 'message' in body) {
    return `Request failed (${status}): ${String(body.message)}`;
  }
  return `Request failed with status ${status}`;
}

async function requestWithTimeout(path, init) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const headers = {
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    };
    if (authToken) {
      headers.Authorization = `Bearer ${authToken}`;
    }

    const response = await fetch(`${API_BASE}${path}`, {
      ...init,
      signal: controller.signal,
      headers,
    });

    const responseBody = await parseResponseBody(response);

    if (!response.ok) {
      throw new Error(buildErrorMessage(response.status, responseBody));
    }

    return responseBody;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Request timed out after ${REQUEST_TIMEOUT_MS}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function request(path, init) {
  let lastError;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      return await requestWithTimeout(path, init);
    } catch (error) {
      lastError = error;
      const isLastAttempt = attempt === MAX_RETRIES;
      if (isLastAttempt) break;
      await wait(300 * (attempt + 1));
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Request failed');
}

async function withFallback(onlineCall, mockCall) {
  if (!USE_MOCK_FALLBACK) {
    return onlineCall();
  }

  try {
    return await onlineCall();
  } catch {
    return mockCall();
  }
}

async function mockRegister(payload) {
  await wait(200);
  return {
    token: `mock-token-${Date.now()}`,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    user: {
      id: `mock-user-${payload.username}`,
      username: payload.username,
    },
  };
}

async function mockLogin(payload) {
  return mockRegister(payload);
}

async function mockLogout() {
  await wait(120);
  return { success: true };
}

async function mockGetProfile() {
  await wait(80);
  return { profile: null };
}

async function mockProfile(payload) {
  await wait(250);
  return payload;
}

async function mockResolve(qrId) {
  await wait(250);
  const mapped = mapSyntheticToProduct(qrId);
  if (!mapped) {
    throw new Error('QR ID not found in synthetic dataset. Example: PROD001_BATCH01');
  }
  return mapped;
}

async function mockVerify(productId) {
  await wait(220);
  return {
    verified: false,
    status: 'blockchain_disabled',
    reason: 'Blockchain verification is disabled in mock mode',
    issuerId: 'unavailable',
    batchId: productId,
    timestamp: new Date().toISOString(),
    proof: 'none',
    localHash: null,
    chainHash: null,
  };
}

async function mockAssess(profile, product) {
  await wait(320);
  return assessCompatibility(profile, product);
}

async function mockFeedback() {
  await wait(220);
  return { success: true };
}

export const api = {
  register: (payload) =>
    withFallback(
      () => request('/auth/register', { method: 'POST', body: JSON.stringify(payload) }),
      () => mockRegister(payload)
    ),
  login: (payload) =>
    withFallback(
      () => request('/auth/login', { method: 'POST', body: JSON.stringify(payload) }),
      () => mockLogin(payload)
    ),
  logout: () =>
    withFallback(
      () => request('/auth/logout', { method: 'POST', body: JSON.stringify({}) }),
      () => mockLogout()
    ),
  me: () => request('/auth/me', { method: 'GET' }),
  getProfile: () =>
    withFallback(
      () => request('/profile', { method: 'GET' }),
      () => mockGetProfile()
    ),
  upsertProfile: (payload) =>
    withFallback(
      () => request('/profile', { method: 'POST', body: JSON.stringify(payload) }),
      () => mockProfile(payload)
    ),
  resolveProduct: (qrId) =>
    withFallback(
      () =>
        request('/product/resolve', {
          method: 'POST',
          body: JSON.stringify({ qr_id: normalizeQrId(qrId) }),
        }),
      () => mockResolve(qrId)
    ),
  verifyProduct: (productId) =>
    withFallback(
      () =>
        request('/product/verify', {
          method: 'POST',
          body: JSON.stringify({ product_id: productId }),
        }),
      () => mockVerify(productId)
    ),
  assess: (profile, product) =>
    withFallback(
      async () => {
        const response = await request('/ai/predict', {
          method: 'POST',
          body: JSON.stringify({
            user_profile: {
              user_id: profile.userId,
              skin_type: profile.skinType,
              allergies: profile.allergies,
              conditions: profile.conditions,
              preferences: profile.preferences,
            },
            product: {
              qr_id: product.qrId ?? product.productId,
              type: product.category,
              ingredients: product.inciList ?? [],
            },
          }),
        });

        return normalizeCompatibilityResponse(response, product.productId);
      },
      () => mockAssess(profile, product)
    ),
  submitFeedback: (assessmentId, reaction, severity, notes) =>
    withFallback(
      () =>
        request('/feedback', {
          method: 'POST',
          body: JSON.stringify({ assessment_id: assessmentId, reaction, severity, notes }),
        }),
      () => mockFeedback()
    ),
};

export { normalizeQrId };
