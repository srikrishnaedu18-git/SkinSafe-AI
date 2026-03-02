import { syntheticProducts } from '../data/synthetic-products';
import { runtimeConfig } from '../constants/runtime-config';
import { assessCompatibility } from './ai/compatibility-engine';
const API_BASE = runtimeConfig.apiBaseUrl;
const USE_MOCK_FALLBACK = runtimeConfig.useMockApi;
const REQUEST_TIMEOUT_MS = 8000;
const MAX_RETRIES = 2;
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
    }
    catch {
        return value;
    }
}
function normalizeQrId(raw) {
    let normalized = raw.trim();
    for (let i = 0; i < 2; i += 1) {
        const decoded = safeDecode(normalized);
        if (decoded === normalized)
            break;
        normalized = decoded;
    }
    try {
        const parsed = new URL(normalized);
        const qrFromQuery = parsed.searchParams.get('qr_id') ??
            parsed.searchParams.get('product_id') ??
            parsed.searchParams.get('qr');
        if (qrFromQuery) {
            normalized = qrFromQuery;
        }
    }
    catch {
        // keep decoded non-URL payload as-is
    }
    normalized = normalized.toUpperCase();
    const regexMatch = normalized.match(/PROD\d{3}_BATCH\d{2}/);
    if (regexMatch?.[0])
        return regexMatch[0];
    return normalized;
}
function mapSyntheticToProduct(qrId) {
    const normalizedQr = normalizeQrId(qrId);
    let matched = syntheticProducts.find((item) => item.qr_id.toUpperCase() === normalizedQr);
    if (!matched) {
        matched = syntheticProducts.find((item) => normalizedQr.includes(item.qr_id.toUpperCase()));
    }
    if (!matched)
        return null;
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
function normalizeCompatibilityResponse(raw, productId) {
    return {
        assessmentId: raw.assessmentId ?? `asm-${productId}-${Date.now()}`,
        suitabilityScore: raw.suitabilityScore,
        confidence: raw.confidence,
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
        const response = await fetch(`${API_BASE}${path}`, {
            ...init,
            signal: controller.signal,
            headers: {
                'Content-Type': 'application/json',
                ...(init.headers ?? {}),
            },
        });
        const responseBody = await parseResponseBody(response);
        if (!response.ok) {
            throw new Error(buildErrorMessage(response.status, responseBody));
        }
        return responseBody;
    }
    catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
            throw new Error(`Request timed out after ${REQUEST_TIMEOUT_MS}ms`);
        }
        throw error;
    }
    finally {
        clearTimeout(timeoutId);
    }
}
async function request(path, init) {
    let lastError;
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
        try {
            return await requestWithTimeout(path, init);
        }
        catch (error) {
            lastError = error;
            const isLastAttempt = attempt === MAX_RETRIES;
            if (isLastAttempt)
                break;
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
    }
    catch {
        return mockCall();
    }
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
    upsertProfile: (payload) => withFallback(() => request('/profile', { method: 'POST', body: JSON.stringify(payload) }), () => mockProfile(payload)),
    resolveProduct: (qrId) => withFallback(() => request('/product/resolve', {
        method: 'POST',
        body: JSON.stringify({ qr_id: normalizeQrId(qrId) }),
    }), () => mockResolve(qrId)),
    verifyProduct: (productId) => withFallback(() => request('/product/verify', {
        method: 'POST',
        body: JSON.stringify({ product_id: productId }),
    }), () => mockVerify(productId)),
    assess: (profile, product) => withFallback(async () => {
        const response = await request('/compatibility/check', {
            method: 'POST',
            body: JSON.stringify({
                userProfile: {
                    skinType: profile.skinType,
                    concerns: profile.conditions,
                    allergies: profile.allergies,
                    sensitivities: profile.preferences,
                    acneProne: profile.conditions.some((c) => c.toLowerCase() === 'acne-prone'),
                    fragrancePreference: profile.preferences.some((p) => p.toLowerCase() === 'fragrance-free')
                        ? 'fragrance-free'
                        : 'fragrance-ok',
                },
                product: {
                    productId: product.productId,
                    name: product.name,
                    category: product.category,
                    ingredients: product.inciList ?? [],
                    concentrationsAvailable: false,
                    warnings: product.isExpired ? ['product marked expired in record'] : [],
                },
            }),
        });
        return normalizeCompatibilityResponse(response, product.productId);
    }, () => mockAssess(profile, product)),
    submitFeedback: (assessmentId, reaction, severity, notes) => withFallback(() => request('/feedback', {
        method: 'POST',
        body: JSON.stringify({ assessment_id: assessmentId, reaction, severity, notes }),
    }), () => mockFeedback()),
};
export { normalizeQrId };
