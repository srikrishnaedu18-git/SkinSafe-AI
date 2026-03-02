import { syntheticProducts } from '../../data/synthetic-products';
import { ingredientKb, normalizeIngredientName } from './ingredient-kb';
function listToSet(values) {
    return new Set(values.map((item) => item.trim().toLowerCase()).filter(Boolean));
}
function computeIngredientImpact(ingredient, profile) {
    const key = normalizeIngredientName(ingredient);
    const risk = ingredientKb[key];
    const allergies = listToSet(profile.allergies);
    const conditions = listToSet(profile.conditions);
    const preferences = listToSet(profile.preferences);
    let impact = risk?.baseRisk ?? 0;
    const reasons = [];
    if (allergies.has(key)) {
        impact += 35;
        reasons.push(`matches your declared allergy (${ingredient})`);
    }
    if (profile.skinType === 'sensitive' && (risk?.tags.includes('irritant_potential') || risk?.tags.includes('active'))) {
        impact += 6;
        reasons.push('sensitive skin profile increases irritation concern');
    }
    if (profile.skinType === 'dry' && (risk?.tags.includes('drying') || risk?.tags.includes('astringent'))) {
        impact += 5;
        reasons.push('dry skin profile may react to drying/astringent ingredients');
    }
    if (profile.skinType === 'oily' && risk?.ingredient.toLowerCase() === 'shea butter') {
        impact += 3;
        reasons.push('oily skin may feel heavy with rich emollients');
    }
    if (conditions.has('acne-prone') && (risk?.tags.includes('acne_support') || risk?.tags.includes('barrier_support'))) {
        impact -= 3;
        reasons.push('ingredient aligns with acne-prone support goals');
    }
    if (preferences.has('fragrance-free') && risk?.tags.includes('fragrance_like')) {
        impact += 8;
        reasons.push('conflicts with fragrance-free preference');
    }
    if (preferences.has('low-comedogenic') && risk?.ingredient.toLowerCase() === 'shea butter') {
        impact += 4;
        reasons.push('may conflict with low-comedogenic preference');
    }
    const reason = reasons.length > 0 ? reasons.join('; ') : risk?.notes ?? 'neutral impact in current profile';
    return { ingredient, impact, reason, tags: risk?.tags ?? [] };
}
function computeAlternatives(current, profile) {
    const sameCategory = syntheticProducts.filter((item) => item.type.toLowerCase() === current.category.toLowerCase() && item.qr_id !== current.productId);
    return sameCategory
        .map((item) => {
        const impacts = item.ingredients.map((ing) => computeIngredientImpact(ing, profile).impact);
        const avgRisk = impacts.length > 0 ? impacts.reduce((a, b) => a + b, 0) / impacts.length : 0;
        return {
            productId: item.qr_id,
            name: item.product_name,
            avgRisk,
        };
    })
        .sort((a, b) => a.avgRisk - b.avgRisk)
        .slice(0, 3)
        .map((item) => ({
        productId: item.productId,
        name: item.name,
        whyBetter: `Lower predicted risk in same category (risk index ${item.avgRisk.toFixed(1)}).`,
    }));
}
function confidenceFromData(product) {
    let confidence = 0.62;
    const reasons = [];
    if ((product.inciList?.length ?? 0) >= 3)
        confidence += 0.1;
    if (product.batchNumber)
        confidence += 0.05;
    if (product.origin)
        confidence += 0.03;
    if (product.expiryDate)
        confidence += 0.03;
    if (!product.inciList || product.inciList.length === 0)
        reasons.push('missing ingredient list');
    if (!product.batchNumber)
        reasons.push('missing batch metadata');
    return {
        value: Math.min(0.95, Number(confidence.toFixed(2))),
        reason: reasons.length > 0 ? reasons.join('; ') : 'sufficient product metadata available',
    };
}
export function assessCompatibility(profile, product) {
    const ingredients = product.inciList ?? [];
    const contributions = ingredients.map((ingredient) => computeIngredientImpact(ingredient, profile));
    const totalImpact = contributions.reduce((sum, item) => sum + item.impact, 0);
    const penaltyFromExpiry = product.isExpired ? 30 : 0;
    const rawScore = 100 - totalImpact - penaltyFromExpiry;
    const suitabilityScore = Math.max(0, Math.min(100, Math.round(rawScore)));
    const riskFlags = [];
    if (product.isExpired) {
        riskFlags.push({
            code: 'expired_product_risk',
            severity: 'high',
            ingredients: [],
        });
    }
    contributions
        .filter((item) => item.impact >= 8)
        .forEach((item) => {
        riskFlags.push({
            code: 'ingredient_sensitivity_risk',
            severity: item.impact >= 14 ? 'high' : 'med',
            ingredients: [item.ingredient],
        });
    });
    if (riskFlags.length === 0) {
        riskFlags.push({ code: 'low_detected_risk', severity: 'low', ingredients: [] });
    }
    const sorted = [...contributions].sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact));
    const topNegativeDrivers = sorted
        .filter((item) => item.impact > 0)
        .slice(0, 5)
        .map((item) => ({
        ingredient: item.ingredient,
        reason: item.reason,
        penalty: Number(item.impact.toFixed(2)),
    }));
    const topPositiveDrivers = sorted
        .filter((item) => item.impact < 0)
        .slice(0, 3)
        .map((item) => ({
        ingredient: item.ingredient,
        reason: item.reason,
        boost: Number(Math.abs(item.impact).toFixed(2)),
    }));
    const ingredientContributions = contributions.map((item) => ({
        ingredient: item.ingredient,
        scoreImpact: Number((-item.impact).toFixed(2)),
        tags: item.tags,
    }));
    const summary = `Suitability ${suitabilityScore}/100. Top risks: ${topNegativeDrivers
        .map((d) => d.ingredient)
        .join(', ') || 'none'}. Top supports: ${topPositiveDrivers.map((d) => d.ingredient).join(', ') || 'none'}.`;
    const triggeredRules = topNegativeDrivers.map((item, index) => ({
        ruleId: `LOCAL_RULE_${index + 1}`,
        description: `${item.ingredient}: ${item.reason}`,
    }));
    return {
        assessmentId: `asm-${product.productId}-${Date.now()}`,
        suitabilityScore,
        confidence: confidenceFromData(product),
        riskFlags,
        explanations: {
            summary,
            topNegativeDrivers,
            topPositiveDrivers,
            triggeredRules,
            ingredientContributions,
        },
        guidance: {
            patchTest: [
                'Apply to inner forearm or behind ear.',
                'Wait 24 hours and monitor redness/itching.',
                'If clear, test on a small facial area before full use.',
            ],
            usage: [
                'Start once daily for first 3-5 days.',
                'Increase frequency only if no irritation appears.',
            ],
            avoidIf: [
                'Avoid if persistent irritation appears after patch test.',
                ...(profile.skinType === 'sensitive' ? ['Avoid layering with multiple new actives on same day.'] : []),
            ],
        },
        alternatives: computeAlternatives(product, profile),
    };
}
