import { kb } from './kb.js';
export function normalizeString(value) {
    return value
        .toLowerCase()
        .replace(/[()\[\],.;:_\-/]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}
function canonicalize(raw) {
    const normalized = normalizeString(raw);
    if (kb.synonyms[normalized]) {
        return { canonical: kb.synonyms[normalized], matched: true };
    }
    if (kb.ingredients[normalized]) {
        return { canonical: normalized, matched: true };
    }
    // Safe partial matching only when canonical token appears as whole words.
    for (const [alias, canonical] of Object.entries(kb.synonyms)) {
        const pattern = new RegExp(`(^| )${alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}( |$)`);
        if (pattern.test(normalized)) {
            return { canonical, matched: true };
        }
    }
    for (const name of Object.keys(kb.ingredients)) {
        const pattern = new RegExp(`(^| )${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}( |$)`);
        if (pattern.test(normalized)) {
            return { canonical: name, matched: true };
        }
    }
    return { canonical: normalized, matched: false };
}
export function normalizeIngredients(product) {
    return product.ingredients.map((item) => {
        const asObj = typeof item === 'string' ? { name: item } : item;
        const normalizedName = normalizeString(asObj.name);
        const mapped = canonicalize(asObj.name);
        return {
            inputName: asObj.name,
            normalizedName,
            canonicalName: mapped.canonical,
            concentration: asObj.concentration,
            matched: mapped.matched,
        };
    });
}
