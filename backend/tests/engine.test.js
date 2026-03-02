import test from 'node:test';
import assert from 'node:assert/strict';
import { runCompatibilityEngine } from '../src/engine/engine.js';
const baseUser = {
    skinType: 'normal',
    allergies: [],
    sensitivities: [],
    concerns: [],
    activeRoutine: [],
};
function run(userProfile, product) {
    return runCompatibilityEngine({
        userProfile,
        product,
    });
}
test('fragrance allergy + parfum triggers high allergen risk', () => {
    const output = run({
        ...baseUser,
        skinType: 'sensitive',
        allergies: ['fragrance'],
        sensitivities: ['fragrance'],
        fragrancePreference: 'fragrance-free',
    }, {
        productId: 'T1',
        name: 'Fragrance Product',
        category: 'Cleanser',
        ingredients: ['Water', 'Parfum', 'Glycerin'],
    });
    assert.ok(output.riskFlags.some((f) => f.code === 'allergen_risk' && f.severity === 'high'));
    assert.ok(output.explanations.triggeredRules.some((r) => r.ruleId === 'R001_ALLERGY_MATCH'));
});
test('acne-prone + comedogenic oils raises comedogenic risk', () => {
    const output = run({
        ...baseUser,
        skinType: 'oily',
        acneProne: true,
    }, {
        productId: 'T2',
        name: 'Heavy Cream',
        category: 'Cream',
        ingredients: ['Coconut Oil', 'Isopropyl Myristate', 'Tocopherol'],
    });
    assert.ok(output.riskFlags.some((f) => f.code === 'comedogenic_risk'));
    assert.ok(output.suitabilityScore < 80);
});
test('sensitive skin + strong actives triggers irritant/active conflict risk', () => {
    const output = run({
        ...baseUser,
        skinType: 'sensitive',
        activeRoutine: ['benzoyl peroxide'],
    }, {
        productId: 'T3',
        name: 'Active Serum',
        category: 'Serum',
        ingredients: ['Retinol', 'Glycolic Acid', 'Niacinamide'],
    });
    assert.ok(output.riskFlags.some((f) => f.code === 'irritant_risk'));
    assert.ok(output.riskFlags.some((f) => f.code === 'active_conflict_risk'));
});
test('missing concentration data reduces confidence', () => {
    const output = run(baseUser, {
        productId: 'T4',
        name: 'No Concentration Product',
        category: 'Moisturizer',
        concentrationsAvailable: false,
        ingredients: ['Glycerin', 'Ceramides', 'Panthenol'],
    });
    assert.ok(output.confidence.value < 0.85);
    assert.match(output.confidence.reason, /missing concentration data/);
});
test('unknown ingredient fallback does not crash and returns output', () => {
    const output = run(baseUser, {
        productId: 'T5',
        name: 'Unknown Mix',
        category: 'Toner',
        ingredients: ['Mystery Compound', 'Water'],
    });
    assert.equal(typeof output.suitabilityScore, 'number');
    assert.ok(Array.isArray(output.explanations.ingredientContributions));
});
