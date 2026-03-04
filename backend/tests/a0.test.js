import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeCommaList, normalizeProfile } from '../src/ai/normalizer.js';
import { validateAiResponse } from '../src/ai/contracts.js';
import { runA0Predict } from '../src/ai/predictor.js';

test('normalizeCommaList handles trimming/lowercase/synonyms', () => {
  const actual = normalizeCommaList(' Fragrance, parfum, acne prone, eczema skin ');
  assert.deepEqual(actual, ['fragrance', 'acne-prone', 'eczema']);
});

test('normalizeProfile accepts UI-style fields and returns locked schema fields', () => {
  const profile = normalizeProfile({
    userId: 'U123',
    skinType: 'Sensitive',
    allergies: 'Fragrance, Parabens',
    conditions: 'acne prone, eczema skin',
    preferences: 'fragrance-free, low-comedogenic',
  });

  assert.equal(profile.user_id, 'U123');
  assert.equal(profile.skin_type, 'sensitive');
  assert.deepEqual(profile.allergies, ['fragrance', 'parabens']);
  assert.deepEqual(profile.conditions, ['acne-prone', 'eczema']);
});

test('A0 predictor returns valid response contract', () => {
  const response = runA0Predict(
    {
      user_id: 'U1',
      skin_type: 'sensitive',
      allergies: ['fragrance'],
      conditions: ['acne-prone'],
      preferences: ['fragrance-free'],
    },
    {
      qr_id: 'PROD004_BATCH01',
      type: 'Serum',
      ingredients: ['Alcohol Denat', 'Panthenol', 'Fragrance', 'Vitamin C'],
      is_expired: false,
    }
  );

  validateAiResponse(response);
  assert.equal(response.model_version, 'ai-v1');
  assert.equal(response.feature_schema_version, 'fs-v1');
});

