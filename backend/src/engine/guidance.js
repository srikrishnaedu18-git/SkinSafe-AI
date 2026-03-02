export function buildGuidance(profile, flags) {
    const patchTest = [
        'Apply a small amount on inner forearm or behind ear.',
        'Wait 24 hours and watch for redness, itching, or burning.',
        'If no reaction, apply once on a small facial zone before full use.',
    ];
    const usage = ['Start with once-daily usage for first 3-5 days.', 'Increase frequency only if well tolerated.'];
    const avoidIf = [];
    if (profile.skinType === 'sensitive') {
        usage.push('Use a bland moisturizer after application to reduce irritation.');
    }
    if (flags.some((f) => f.code === 'active_conflict_risk')) {
        avoidIf.push('Avoid layering with strong actives in same routine window.');
    }
    if (flags.some((f) => f.code === 'fragrance_sensitivity_risk')) {
        avoidIf.push('Avoid if you are fragrance-sensitive or recently barrier-compromised.');
    }
    if (flags.some((f) => f.code === 'pregnancy_caution')) {
        avoidIf.push('Avoid during pregnancy/breastfeeding unless approved by clinician.');
    }
    if (avoidIf.length === 0) {
        avoidIf.push('Avoid if any persistent irritation appears after patch test.');
    }
    return { patchTest, usage, avoidIf };
}
