import { isBlockchainEnabled, isZeroHash, readChainHash } from '../blockchain/client.js';
import { canonicalizeRecord, sha256Hex } from '../blockchain/hashing.js';
import { getRawLedgerRecordByQr, resolveByQr } from '../data/product-records.js';
import { normalizeProfile } from '../ai/normalizer.js';
import { getUserProfileByUserId, saveUserProfile } from '../db/mongo.js';
import { getAuthUserFromRequest } from './auth.js';

async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(Buffer.from(chunk));
  }
  const raw = Buffer.concat(chunks).toString('utf-8');
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error('Invalid JSON body');
  }
}

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(payload));
}

function toProfileResponse(profile, username, storage = undefined) {
  const payload = {
    userId: profile.user_id,
    username,
    skinType: profile.skin_type,
    allergies: profile.allergies,
    conditions: profile.conditions,
    preferences: profile.preferences,
    ai_profile: profile,
  };

  if (storage) {
    payload.storage = storage;
  }

  return payload;
}

async function saveProfileWithTimeout(normalized, timeoutMs = 2000) {
  const timeoutPromise = new Promise((resolve) => {
    setTimeout(() => resolve({ stored: false, reason: 'mongodb_timeout' }), timeoutMs);
  });

  try {
    return await Promise.race([saveUserProfile(normalized), timeoutPromise]);
  } catch (error) {
    return {
      stored: false,
      reason: error instanceof Error ? error.message : 'mongodb_error',
    };
  }
}

export async function handleGetProfile(req, res) {
  try {
    const auth = await getAuthUserFromRequest(req);
    if (!auth) {
      sendJson(res, 401, { error: 'Unauthorized' });
      return;
    }

    const existing = await getUserProfileByUserId(auth.userId);
    if (!existing) {
      sendJson(res, 200, {
        profile: null,
        username: auth.username,
      });
      return;
    }

    sendJson(res, 200, {
      profile: toProfileResponse(existing, auth.username),
    });
  } catch (error) {
    sendJson(res, 400, { error: error instanceof Error ? error.message : 'Profile fetch failed' });
  }
}

export async function handleProfile(req, res) {
  try {
    const auth = await getAuthUserFromRequest(req);
    if (!auth) {
      sendJson(res, 401, { error: 'Unauthorized' });
      return;
    }

    const body = await readJson(req);
    if (!body || typeof body !== 'object') {
      throw new Error('Invalid profile payload');
    }

    const normalized = normalizeProfile({
      ...body,
      user_id: auth.userId,
    });

    const storage = await saveProfileWithTimeout(normalized);

    sendJson(res, 200, toProfileResponse(normalized, auth.username, storage));
  } catch (error) {
    sendJson(res, 400, { error: error instanceof Error ? error.message : 'Profile request failed' });
  }
}

export async function handleProductResolve(req, res) {
  try {
    const body = await readJson(req);
    const qrId = (body.qr_id ?? '').trim();
    if (!qrId) {
      throw new Error('qr_id is required');
    }

    const record = resolveByQr(qrId);
    if (!record) {
      throw new Error('qr_id format invalid. Expected like PROD001_BATCH01');
    }

    sendJson(res, 200, record);
  } catch (error) {
    sendJson(res, 400, { error: error instanceof Error ? error.message : 'Resolve request failed' });
  }
}

export async function handleProductVerify(req, res) {
  try {
    const body = await readJson(req);
    const productId = (body.product_id ?? '').trim();
    if (!productId) {
      throw new Error('product_id is required');
    }

    const resolved = resolveByQr(productId);
    const rawRecord = getRawLedgerRecordByQr(productId);
    if (!resolved || !rawRecord) {
      throw new Error('product_id format invalid. Expected like PROD001_BATCH01');
    }

    const qrId = resolved.productId;
    const timestamp = new Date().toISOString();

    if (!isBlockchainEnabled()) {
      sendJson(res, 200, {
        verified: false,
        status: 'blockchain_disabled',
        reason: 'Blockchain verification is disabled in server config',
        issuerId: 'unavailable',
        batchId: qrId,
        timestamp,
        proof: 'none',
        localHash: null,
        chainHash: null,
      });
      return;
    }

    const localHash = sha256Hex(canonicalizeRecord(rawRecord)).toLowerCase();

    let chainHash = null;
    try {
      chainHash = await readChainHash(qrId);
    } catch (error) {
      sendJson(res, 200, {
        verified: false,
        status: 'blockchain_error',
        reason: error instanceof Error ? error.message : 'Failed to read chain hash',
        issuerId: 'unavailable',
        batchId: qrId,
        timestamp,
        proof: localHash,
        localHash,
        chainHash: null,
      });
      return;
    }

    const hasAnchor = chainHash && !isZeroHash(chainHash);
    const verified = Boolean(hasAnchor && chainHash === localHash);
    const status = !hasAnchor ? 'anchor_missing' : verified ? 'verified' : 'hash_mismatch';

    sendJson(res, 200, {
      verified,
      status,
      reason: verified ? 'Hash matched with on-chain anchor' : 'On-chain hash did not match local record hash',
      issuerId: process.env.ISSUER_ID ?? 'issuer.blockchain',
      batchId: qrId,
      timestamp,
      proof: localHash,
      localHash,
      chainHash,
    });
  } catch (error) {
    sendJson(res, 400, { error: error instanceof Error ? error.message : 'Verify request failed' });
  }
}

export async function handleFeedback(req, res) {
  try {
    await readJson(req);
    sendJson(res, 200, { success: true });
  } catch (error) {
    sendJson(res, 400, { error: error instanceof Error ? error.message : 'Feedback request failed' });
  }
}
