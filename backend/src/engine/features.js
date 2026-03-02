import { kb } from './kb.js';
export function buildFeatures(context, ingredients) {
    const known = ingredients.filter((i) => Boolean(kb.ingredients[i.canonicalName]));
    const irritants = known.map((i) => kb.ingredients[i.canonicalName].irritant_level);
    const comedogenic = known.map((i) => kb.ingredients[i.canonicalName].comedogenic);
    const positivesScore = known.reduce((sum, i) => {
        const boost = kb.positive_ingredients[i.canonicalName] ?? 0;
        return sum + boost;
    }, 0);
    const concentrationMissing = ingredients.filter((i) => typeof i.concentration !== 'number').length;
    return {
        ingredientCount: ingredients.length,
        knownIngredientCount: known.length,
        avgIrritant: irritants.length ? irritants.reduce((a, b) => a + b, 0) / irritants.length : 0,
        maxComedogenic: comedogenic.length ? Math.max(...comedogenic) : 0,
        hasPregnancyRiskIngredient: known.some((i) => kb.ingredients[i.canonicalName].pregnancy_risk),
        positivesScore,
        missingConcentrationRate: context.product.concentrationsAvailable === false ? 1 : concentrationMissing / Math.max(1, ingredients.length),
    };
}
