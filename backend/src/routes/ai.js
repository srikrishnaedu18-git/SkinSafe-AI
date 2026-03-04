import { runA0Predict } from '../ai/predictor.js';
import { validateAiRequest, validateAiResponse } from '../ai/contracts.js';
import { normalizeProduct, normalizeProfile } from '../ai/normalizer.js';

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

export async function handleAiPredict(req, res) {
  try {
    const body = await readJson(req);

    const normalizedRequest = {
      user_profile: normalizeProfile(body.user_profile),
      product: normalizeProduct(body.product),
    };

    validateAiRequest(normalizedRequest);
    const output = runA0Predict(normalizedRequest.user_profile, normalizedRequest.product);
    validateAiResponse(output);

    sendJson(res, 200, output);
  } catch (error) {
    sendJson(res, 400, {
      error: error instanceof Error ? error.message : 'AI prediction failed',
    });
  }
}

