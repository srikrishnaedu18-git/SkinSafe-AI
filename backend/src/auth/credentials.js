import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

const USERNAME_REGEX = /^[a-zA-Z0-9._-]{3,30}$/;

export function validateUsername(username) {
  const cleaned = String(username ?? '').trim();
  if (!USERNAME_REGEX.test(cleaned)) {
    throw new Error('Username must be 3-30 chars and only contain letters, numbers, dot, underscore, or hyphen');
  }
  return cleaned;
}

export function validatePassword(password) {
  const cleaned = String(password ?? '');
  if (cleaned.length < 6) {
    throw new Error('Password must be at least 6 characters');
  }
  return cleaned;
}

export function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return { salt, hash };
}

export function verifyPassword(password, salt, hashHex) {
  const derived = scryptSync(password, salt, 64);
  const stored = Buffer.from(hashHex, 'hex');
  if (stored.length !== derived.length) return false;
  return timingSafeEqual(stored, derived);
}

export function createSessionToken() {
  return randomBytes(32).toString('hex');
}

export function extractBearerToken(req) {
  const header = req.headers?.authorization ?? req.headers?.Authorization;
  const value = Array.isArray(header) ? header[0] : header;
  if (!value) return null;
  const [scheme, token] = String(value).trim().split(/\s+/);
  if (!scheme || scheme.toLowerCase() !== 'bearer' || !token) return null;
  return token;
}
