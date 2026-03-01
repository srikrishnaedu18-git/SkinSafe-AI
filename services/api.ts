import { runtimeConfig } from '@/constants/runtime-config';
import {
  AssessmentResult,
  ProductResolved,
  SkinType,
  UserProfile,
  VerificationResult,
} from '@/types/models';

const API_BASE = runtimeConfig.apiBaseUrl;
const USE_MOCK_FALLBACK = runtimeConfig.useMockApi;
const REQUEST_TIMEOUT_MS = 8000;
const MAX_RETRIES = 2;

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function inferSkinType(value: string): SkinType {
  const normalized = value.toLowerCase();
  if (normalized.includes('sensitive')) return 'sensitive';
  if (normalized.includes('oily')) return 'oily';
  if (normalized.includes('dry')) return 'dry';
  if (normalized.includes('comb')) return 'combination';
  return 'normal';
}

async function parseResponseBody(response: Response): Promise<unknown> {
  const contentType = response.headers.get('content-type') ?? '';

  if (contentType.includes('application/json')) {
    return response.json();
  }

  return response.text();
}

function buildErrorMessage(status: number, body: unknown) {
  if (typeof body === 'string' && body.trim().length > 0) {
    return `Request failed (${status}): ${body}`;
  }

  if (body && typeof body === 'object' && 'message' in body) {
    return `Request failed (${status}): ${String((body as { message: unknown }).message)}`;
  }

  return `Request failed with status ${status}`;
}

async function requestWithTimeout<T>(path: string, init: RequestInit): Promise<T> {
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

    return responseBody as T;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Request timed out after ${REQUEST_TIMEOUT_MS}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function request<T>(path: string, init: RequestInit): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      return await requestWithTimeout<T>(path, init);
    } catch (error) {
      lastError = error;
      const isLastAttempt = attempt === MAX_RETRIES;
      if (isLastAttempt) break;
      await wait(300 * (attempt + 1));
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Request failed');
}

async function withFallback<T>(onlineCall: () => Promise<T>, mockCall: () => Promise<T>) {
  if (!USE_MOCK_FALLBACK) {
    return onlineCall();
  }

  try {
    return await onlineCall();
  } catch {
    return mockCall();
  }
}

async function mockProfile(payload: UserProfile): Promise<UserProfile> {
  await wait(250);
  return payload;
}

async function mockResolve(barcode: string): Promise<ProductResolved> {
  await wait(350);
  return {
    productId: `prod-${barcode || 'manual'}-001`,
    brand: 'Dermaclean',
    name: 'Daily Repair Moisturizer',
    category: 'Face Moisturizer',
    recordUri: 'record://sample/DRM-2103',
    inciList: ['Water', 'Niacinamide', 'Glycerin', 'Fragrance'],
  };
}

async function mockVerify(productId: string): Promise<VerificationResult> {
  await wait(300);
  return {
    verified: productId.length > 0,
    issuerId: 'issuer.dermaclean',
    batchId: 'BATCH-2103',
    timestamp: new Date().toISOString(),
    proof: 'sha256:f1e4ab34cc98a2107a91e2d9eac401f7',
  };
}

async function mockAssess(skinTypeHint: string, productId: string): Promise<AssessmentResult> {
  await wait(450);
  const skin = inferSkinType(skinTypeHint);
  const sensitivePenalty = skin === 'sensitive' ? 8 : 0;
  const score = Math.max(45, 82 - sensitivePenalty);

  return {
    assessmentId: `asm-${productId}-${Date.now()}`,
    score,
    confidence: 0.81,
    flags: ['Irritant-risk (low)', 'Allergy watchlist: Fragrance'],
    reasons: [
      'Profile includes sensitivity and fragrance appears in ingredient list.',
      'Niacinamide aligns with acne-support preference and skin barrier goals.',
      'Record verification passed with issuer and hash proof metadata.',
    ],
    precautions: [
      'Patch test on inner forearm for 24 hours.',
      'Start with once-daily usage for first 7 days.',
      'Avoid inflamed or broken skin in initial trials.',
    ],
    alternatives: [
      'Barrier Calm Gel Cream (fragrance-free)',
      'HydraBalance Lite Lotion (low-comedogenic)',
      'Sensitive Restore Fluid (minimal allergen profile)',
    ],
  };
}

async function mockFeedback(): Promise<{ success: boolean }> {
  await wait(220);
  return { success: true };
}

export const api = {
  upsertProfile: (payload: UserProfile) =>
    withFallback(
      () => request<UserProfile>('/profile', { method: 'POST', body: JSON.stringify(payload) }),
      () => mockProfile(payload)
    ),

  resolveProduct: (barcode: string) =>
    withFallback(
      () =>
        request<ProductResolved>('/product/resolve', {
          method: 'POST',
          body: JSON.stringify({ barcode }),
        }),
      () => mockResolve(barcode)
    ),

  verifyProduct: (productId: string) =>
    withFallback(
      () =>
        request<VerificationResult>('/product/verify', {
          method: 'POST',
          body: JSON.stringify({ product_id: productId }),
        }),
      () => mockVerify(productId)
    ),

  assess: (userId: string, productId: string, skinType?: SkinType) =>
    withFallback(
      () =>
        request<AssessmentResult>('/assess', {
          method: 'POST',
          body: JSON.stringify({ user_id: userId, product_id: productId }),
        }),
      () => mockAssess(skinType ?? userId, productId)
    ),

  submitFeedback: (assessmentId: string, reaction: string, severity: 'low' | 'medium' | 'high', notes: string) =>
    withFallback(
      () =>
        request<{ success: boolean }>('/feedback', {
          method: 'POST',
          body: JSON.stringify({ assessment_id: assessmentId, reaction, severity, notes }),
        }),
      () => mockFeedback()
    ),
};
