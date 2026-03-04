import { XAI_VERSION, riskLevelFromSuitability, RISK_LEVELS } from './xai-schema.js';

function nowISO() {
  return new Date().toISOString();
}

function headlineFromRiskLevel(riskLevel) {
  if (riskLevel === RISK_LEVELS.HIGH) return 'Higher risk for your profile';
  if (riskLevel === RISK_LEVELS.MEDIUM) return 'Moderate risk - review precautions';
  return 'Generally low risk - still patch test';
}

export function buildXaiSkeleton({ ai }) {
  const riskLevel = riskLevelFromSuitability(ai.suitability_score);

  return {
    summary: {
      risk_level: riskLevel,
      headline: headlineFromRiskLevel(riskLevel),
    },
    risk_flags: [],
    reasons: [],
    precautions: [
      {
        code: 'PATCH_TEST_24H',
        priority: 1,
        text: 'Patch test: apply a small amount on inner arm and observe for 24 hours.',
      },
    ],
    meta: {
      xai_version: XAI_VERSION,
      generated_at: nowISO(),
    },
  };
}
