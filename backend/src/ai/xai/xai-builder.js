import { XAI_VERSION, riskLevelFromSuitability, RISK_LEVELS } from './xai-schema.js';
import { runXaiRules } from './xai-rules-v1.js';
import { buildPrecautionsV1 } from './xai-precautions-v1.js';
import { buildAlternativeConstraints } from './xai-alternatives-v1.js';
import { findAlternatives } from './alternative-finder.js';
import { composeReasons, groupReasons } from './xai-composer-v1.js';

function nowISO() {
  return new Date().toISOString();
}

function headlineFromRiskLevel(riskLevel) {
  if (riskLevel === RISK_LEVELS.HIGH) return 'Higher risk for your profile';
  if (riskLevel === RISK_LEVELS.MEDIUM) return 'Moderate risk - review precautions';
  return 'Generally low risk - still patch test';
}

function rankReasons(reasons) {
  const sorted = [...reasons].sort((a, b) => {
    if (b.impact !== a.impact) return b.impact - a.impact;
    return String(a.item).localeCompare(String(b.item));
  });
  sorted.forEach((reason, index) => {
    reason.rank = index + 1;
  });
  return sorted;
}

function buildImpactLookup(modelSignal) {
  const map = {};
  const impacts = modelSignal?.feature_impacts;
  if (!Array.isArray(impacts)) return map;
  for (const item of impacts) {
    if (typeof item?.feature === 'string' && typeof item?.impact_on_risk === 'number') {
      map[item.feature] = item.impact_on_risk;
    }
  }
  return map;
}

function attachModelImpactToReasons(reasons, impactMap) {
  for (const reason of reasons) {
    const features = reason?.evidence?.features || [];
    let best = null;

    for (const feature of features) {
      const impact = impactMap[feature];
      if (typeof impact !== 'number') continue;
      const absImpact = Math.abs(impact);
      if (best === null || absImpact > best.abs) {
        best = { abs: absImpact, val: impact };
      }
    }

    if (best) {
      const scaled = Math.min(1, Math.max(0, best.abs * 2.5));
      reason.impact = scaled;
      reason.evidence.model_impact_on_risk = best.val;
    } else {
      reason.evidence.model_impact_on_risk = null;
    }
  }
}

export function buildXaiV1({ ai, product, user_profile }) {
  const riskLevel = riskLevelFromSuitability(ai.suitability_score);
  const { risk_flags, reasons, rules_fired } = runXaiRules({
    user_profile,
    product,
    features: ai._features_for_xai ?? {},
    attributions: ai._attrib_for_xai ?? {},
  });
  const impactMap = buildImpactLookup(ai._model_signal_for_xai);
  attachModelImpactToReasons(reasons, impactMap);
  const rankedReasonsRaw = rankReasons(reasons);
  const rankedReasons = composeReasons(rankedReasonsRaw, 5);
  const grouped = groupReasons(rankedReasons);
  const precautions = buildPrecautionsV1({
    risk_level: riskLevel,
    risk_flags,
    user_profile,
  });
  const alternativeConstraints = buildAlternativeConstraints({
    risk_flags,
    user_profile,
    product,
  });

  let alternatives = [];
  try {
    alternatives = findAlternatives({
      user_profile,
      base_product: product,
      constraints: alternativeConstraints,
    });
  } catch {
    alternatives = [];
  }

  return {
    summary: {
      risk_level: riskLevel,
      headline:
        riskLevel === RISK_LEVELS.HIGH
          ? 'Higher risk for your profile - review top reasons and precautions'
          : riskLevel === RISK_LEVELS.MEDIUM
            ? 'Moderate risk - consider precautions'
            : 'Generally low risk - still patch test',
    },
    risk_flags,
    reasons: rankedReasons,
    reason_groups: grouped,
    precautions,
    alternatives: {
      constraints: alternativeConstraints,
      results: alternatives,
    },
    meta: {
      xai_version: XAI_VERSION,
      generated_at: nowISO(),
      evidence: {
        rules_fired,
        model_signal: ai._model_signal_for_xai ?? null,
      },
    },
  };
}

export function buildXaiSkeleton({ ai }) {
  return {
    summary: {
      risk_level: riskLevelFromSuitability(ai.suitability_score),
      headline: headlineFromRiskLevel(riskLevelFromSuitability(ai.suitability_score)),
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
