import { kb } from './kb.js';
export function ingredientContributions(ingredients, traces) {
    return ingredients.map((ing) => {
        const ruleImpact = traces
            .filter((t) => t.ingredients.some((x) => x.toLowerCase() === ing.inputName.toLowerCase()))
            .reduce((sum, t) => sum - t.penaltyPoints, 0);
        const positive = kb.positive_ingredients[ing.canonicalName] ?? 0;
        const scoreImpact = Number((ruleImpact + positive * 0.8).toFixed(2));
        const tags = kb.ingredients[ing.canonicalName]?.allergen_tags ?? [];
        return {
            ingredient: ing.inputName,
            scoreImpact,
            tags,
        };
    });
}
export function topDrivers(contributions, traces) {
    const negatives = contributions
        .filter((c) => c.scoreImpact < 0)
        .sort((a, b) => a.scoreImpact - b.scoreImpact)
        .slice(0, 5)
        .map((c) => {
        const reason = traces.find((t) => t.ingredients.some((i) => i.toLowerCase() === c.ingredient.toLowerCase()));
        return {
            ingredient: c.ingredient,
            reason: reason?.description ?? 'rule-based risk signal',
            penalty: Math.abs(Number(c.scoreImpact.toFixed(2))),
        };
    });
    const positives = contributions
        .filter((c) => c.scoreImpact > 0)
        .sort((a, b) => b.scoreImpact - a.scoreImpact)
        .slice(0, 3)
        .map((c) => ({
        ingredient: c.ingredient,
        reason: 'supportive ingredient profile',
        boost: Number(c.scoreImpact.toFixed(2)),
    }));
    return { negatives, positives };
}
export function summaryText(score, negatives, positives) {
    const riskPart = negatives.length
        ? `Primary risk drivers are ${negatives.map((n) => n.ingredient).join(', ')}.`
        : 'No major risk drivers were detected.';
    const supportPart = positives.length
        ? `Supporting ingredients include ${positives.map((p) => p.ingredient).join(', ')}.`
        : 'No strong supportive drivers were detected.';
    return `Suitability score is ${score}/100. ${riskPart} ${supportPart}`;
}
