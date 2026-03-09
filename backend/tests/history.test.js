import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { deleteUserHistoryByUserId, getUserHistoryByUserId, saveUserHistoryEntry } from '../src/db/mongo.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const fallbackStorePath = path.join(__dirname, '../data/local-auth-store.json');

test('user history entries are saved, loaded, and cleared in fallback storage', async () => {
  const original = await fs.readFile(fallbackStorePath, 'utf8');
  const userId = 'history-test-user';
  const assessmentId = `asm-history-${Date.now()}`;

  try {
    const saved = await saveUserHistoryEntry({
      userId,
      username: 'history_user',
      entry: {
        createdAt: '2026-03-06T10:00:00.000Z',
        productName: 'Barrier Serum',
        productSnapshot: {
          category: 'Serum',
          ingredients: ['Water', 'Niacinamide'],
        },
        userProfileSnapshot: {
          skinType: 'sensitive',
          allergies: ['fragrance'],
          conditions: ['eczema'],
          preferences: ['fragrance-free'],
        },
        assessment: {
          assessmentId,
          suitabilityScore: 91.25,
          confidence: {
            value: 88.1,
            reason: 'test confidence',
          },
          riskFlags: [],
          explanations: {
            summary: 'Good match',
            topNegativeDrivers: [],
            topPositiveDrivers: [],
            triggeredRules: [],
            ingredientContributions: [],
          },
          guidance: {
            patchTest: [],
            usage: [],
            avoidIf: [],
          },
          alternatives: [],
          xai: {
            summary: {
              risk_level: 'LOW',
            },
          },
        },
        reportPayload: {
          assessment_id: assessmentId,
          product: {
            name: 'Barrier Serum',
          },
        },
      },
    });

    assert.equal(saved.stored, true);
    assert.equal(saved.entry.userDetails.userId, userId);
    assert.equal(saved.entry.userDetails.username, 'history_user');
    assert.equal(saved.entry.assessment.assessmentId, assessmentId);

    const loaded = await getUserHistoryByUserId(userId);
    assert.equal(loaded.length, 1);
    assert.equal(loaded[0].productName, 'Barrier Serum');
    assert.deepEqual(loaded[0].userProfileSnapshot.conditions, ['eczema']);
    assert.equal(loaded[0].reportPayload.assessment_id, assessmentId);

    const cleared = await deleteUserHistoryByUserId(userId);
    assert.equal(cleared.deleted, 1);

    const afterClear = await getUserHistoryByUserId(userId);
    assert.deepEqual(afterClear, []);
  } finally {
    await fs.writeFile(fallbackStorePath, original, 'utf8');
  }
});
