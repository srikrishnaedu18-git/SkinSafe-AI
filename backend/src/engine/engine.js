import { buildFeatures } from './features.js';
import { buildGuidance } from './guidance.js';
import { normalizeIngredients } from './normalize.js';
import { computeConfidence, scoreSuitability } from './model.js';
import { ingredientContributions, summaryText, topDrivers } from './explainability.js';
import { runRules } from './rules.js';
export function runCompatibilityEngine(context) {
    const ingredients = normalizeIngredients(context.product);
    const { traces, riskFlags } = runRules(context, ingredients);
    const features = buildFeatures(context, ingredients);
    const score = scoreSuitability(features, traces);
    const confidence = computeConfidence(features, traces);
    const contributions = ingredientContributions(ingredients, traces);
    const { negatives, positives } = topDrivers(contributions, traces);
    const safeRiskFlags = riskFlags.length
        ? riskFlags
        : [{ code: 'low_detected_risk', severity: 'low', ingredients: [] }];
    const safeNegatives = negatives.length
        ? negatives
        : [{ ingredient: 'No strong negative driver', reason: 'No risk rule strongly triggered', penalty: 0 }];
    const safePositives = positives.length
        ? positives
        : [{ ingredient: 'No strong positive driver', reason: 'No strong positive contribution detected', boost: 0 }];
    const safeTriggers = traces.length
        ? traces.map((t) => ({ ruleId: t.ruleId, description: t.description }))
        : [{ ruleId: 'R000_BASELINE', description: 'No explicit risk rules fired; baseline scoring applied.' }];
    return {
        suitabilityScore: score.suitabilityScore,
        confidence,
        riskFlags: safeRiskFlags,
        explanations: {
            summary: summaryText(score.suitabilityScore, safeNegatives, safePositives),
            topNegativeDrivers: safeNegatives,
            topPositiveDrivers: safePositives,
            triggeredRules: safeTriggers,
            ingredientContributions: contributions,
        },
        guidance: buildGuidance(context.userProfile, safeRiskFlags),
        alternatives: [],
    };
}
