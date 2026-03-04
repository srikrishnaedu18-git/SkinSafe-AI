export const XAI_VERSION = 'xai-v1';

export const RISK_LEVELS = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
};

export function riskLevelFromSuitability(suitabilityScore) {
  const score = Number(suitabilityScore);
  const risk = 1 - score / 100;

  if (risk < 0.35) return RISK_LEVELS.LOW;
  if (risk <= 0.65) return RISK_LEVELS.MEDIUM;
  return RISK_LEVELS.HIGH;
}
