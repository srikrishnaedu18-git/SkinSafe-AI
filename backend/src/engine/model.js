import { kb } from './kb.js';
export function scoreSuitability(features, traces) {
    const rulesPenalty = traces.reduce((sum, t) => sum + t.penaltyPoints, 0);
    const featurePenalty = features.avgIrritant * 2 +
        features.maxComedogenic * 1.8 +
        (features.hasPregnancyRiskIngredient ? 3 : 0) +
        features.missingConcentrationRate * 5;
    const positiveBoost = features.positivesScore * kb.weights.positiveBoostScale;
    const raw = kb.weights.baseScore - rulesPenalty - featurePenalty + positiveBoost;
    const suitabilityScore = Math.max(0, Math.min(100, Math.round(raw)));
    return {
        suitabilityScore,
        rawPenalty: rulesPenalty + featurePenalty,
        positiveBoost,
    };
}
export function computeConfidence(features, traces) {
    let value = 0.85;
    const reasons = [];
    if (features.missingConcentrationRate > 0.4) {
        value -= 0.18;
        reasons.push('missing concentration data');
    }
    if (features.knownIngredientCount < Math.ceil(features.ingredientCount * 0.6)) {
        value -= 0.14;
        reasons.push('limited knowledge-base coverage for ingredients');
    }
    if (traces.length === 0) {
        value -= 0.06;
        reasons.push('few rule matches reduce certainty');
    }
    const bounded = Math.max(0.35, Math.min(0.99, Number(value.toFixed(2))));
    return {
        value: bounded,
        reason: reasons.length ? reasons.join('; ') : 'sufficient profile and ingredient coverage',
    };
}
