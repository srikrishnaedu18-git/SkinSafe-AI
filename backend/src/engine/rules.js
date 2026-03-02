import { kb } from './kb.js';
import { normalizeString } from './normalize.js';
function setOf(values) {
    return new Set((values ?? []).map((v) => normalizeString(v)).filter(Boolean));
}
function addFlag(flags, next) {
    const found = flags.find((f) => f.code === next.code && f.severity === next.severity);
    if (!found) {
        flags.push(next);
        return;
    }
    for (const ing of next.ingredients) {
        if (!found.ingredients.includes(ing))
            found.ingredients.push(ing);
    }
}
export function runRules(context, ingredients) {
    const traces = [];
    const riskFlags = [];
    const allergies = setOf(context.userProfile.allergies);
    const sensitivities = setOf(context.userProfile.sensitivities);
    const activeRoutine = setOf(context.userProfile.activeRoutine);
    const skinType = context.userProfile.skinType;
    for (const ing of ingredients) {
        const kbEntry = kb.ingredients[ing.canonicalName];
        if (!kbEntry)
            continue;
        if (allergies.has(ing.canonicalName)) {
            traces.push({
                ruleId: 'R001_ALLERGY_MATCH',
                description: 'Declared allergy matched ingredient.',
                ingredients: [ing.inputName],
                penaltyPoints: kb.weights.allergyPenalty,
                userFields: ['allergies'],
                riskCode: 'allergen_risk',
                severity: 'high',
            });
            addFlag(riskFlags, {
                code: 'allergen_risk',
                severity: 'high',
                ingredients: [ing.inputName],
            });
        }
        if (skinType === 'sensitive' && kbEntry.irritant_level >= 2) {
            const penalty = kb.weights.irritantSensitivePenalty + kbEntry.irritant_level;
            traces.push({
                ruleId: 'R002_SENSITIVE_IRRITANT',
                description: 'Sensitive skin + medium/high irritant ingredient.',
                ingredients: [ing.inputName],
                penaltyPoints: penalty,
                userFields: ['skinType'],
                riskCode: 'irritant_risk',
                severity: kbEntry.irritant_level === 3 ? 'high' : 'med',
            });
            addFlag(riskFlags, {
                code: 'irritant_risk',
                severity: kbEntry.irritant_level === 3 ? 'high' : 'med',
                ingredients: [ing.inputName],
            });
        }
        if (context.userProfile.acneProne && kbEntry.comedogenic >= 3) {
            const penalty = kb.weights.comedogenicAcnePenalty + kbEntry.comedogenic;
            traces.push({
                ruleId: 'R003_ACNE_COMEDOGENIC',
                description: 'Acne-prone profile + high comedogenic ingredient.',
                ingredients: [ing.inputName],
                penaltyPoints: penalty,
                userFields: ['acneProne'],
                riskCode: 'comedogenic_risk',
                severity: kbEntry.comedogenic >= 4 ? 'high' : 'med',
            });
            addFlag(riskFlags, {
                code: 'comedogenic_risk',
                severity: kbEntry.comedogenic >= 4 ? 'high' : 'med',
                ingredients: [ing.inputName],
            });
        }
        const hasFragranceSensitivity = sensitivities.has('fragrance') || context.userProfile.fragrancePreference === 'fragrance-free';
        if (hasFragranceSensitivity && kbEntry.allergen_tags.includes('fragrance')) {
            traces.push({
                ruleId: 'R004_FRAGRANCE_SENSITIVITY',
                description: 'Fragrance sensitivity or fragrance-free preference conflict.',
                ingredients: [ing.inputName],
                penaltyPoints: kb.weights.sensitivityTagPenalty + 4,
                userFields: ['sensitivities', 'fragrancePreference'],
                riskCode: 'fragrance_sensitivity_risk',
                severity: 'high',
            });
            addFlag(riskFlags, {
                code: 'fragrance_sensitivity_risk',
                severity: 'high',
                ingredients: [ing.inputName],
            });
        }
        if ((context.userProfile.pregnancy || context.userProfile.breastfeeding) && kbEntry.pregnancy_risk) {
            traces.push({
                ruleId: 'R005_PREGNANCY_CAUTION',
                description: 'Pregnancy/breastfeeding caution ingredient present.',
                ingredients: [ing.inputName],
                penaltyPoints: kb.weights.pregnancyPenalty,
                userFields: ['pregnancy', 'breastfeeding'],
                riskCode: 'pregnancy_caution',
                severity: 'high',
            });
            addFlag(riskFlags, {
                code: 'pregnancy_caution',
                severity: 'high',
                ingredients: [ing.inputName],
            });
        }
        const conflicts = kbEntry.interacts_with.filter((c) => activeRoutine.has(normalizeString(c)));
        if (conflicts.length > 0) {
            traces.push({
                ruleId: 'R006_ACTIVE_CONFLICT',
                description: `Potential interaction with active routine: ${conflicts.join(', ')}`,
                ingredients: [ing.inputName],
                penaltyPoints: kb.weights.activeConflictPenalty,
                userFields: ['activeRoutine'],
                riskCode: 'active_conflict_risk',
                severity: 'med',
            });
            addFlag(riskFlags, {
                code: 'active_conflict_risk',
                severity: 'med',
                ingredients: [ing.inputName],
            });
        }
    }
    return { traces, riskFlags };
}
