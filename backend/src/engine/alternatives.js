import { runCompatibilityEngine } from './engine.js';
export function suggestAlternatives(userProfile, currentProduct, catalog) {
    const currentCategory = currentProduct.category.toLowerCase();
    const candidates = catalog.filter((p) => p.category.toLowerCase() === currentCategory && p.productId !== currentProduct.productId);
    const ranked = candidates
        .map((candidate) => {
        const out = runCompatibilityEngine({
            userProfile,
            product: {
                productId: candidate.productId,
                name: candidate.name,
                category: candidate.category,
                ingredients: candidate.ingredients,
            },
        });
        return {
            productId: candidate.productId,
            name: candidate.name,
            score: out.suitabilityScore,
        };
    })
        .sort((a, b) => b.score - a.score)
        .slice(0, 3)
        .map((x) => ({
        productId: x.productId,
        name: x.name,
        whyBetter: `Higher suitability score (${x.score}) in same category with lower predicted risk profile.`,
    }));
    return ranked;
}
