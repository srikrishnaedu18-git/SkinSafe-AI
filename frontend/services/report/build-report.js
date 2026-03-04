export function buildReportPayload(item, profile) {
    return {
        generated_at: new Date().toISOString(),
        product_name: item.productName,
        assessment_id: item.assessment.assessmentId,
        suitability_score: item.assessment.suitabilityScore,
        confidence: item.assessment.confidence,
        risk_flags: item.assessment.riskFlags,
        explanations: item.assessment.explanations,
        guidance: item.assessment.guidance,
        alternatives: item.assessment.alternatives,
        xai: item.assessment.xai ?? null,
        user_profile: profile
            ? {
                skin_type: profile.skinType,
                allergies: profile.allergies,
                conditions: profile.conditions,
                preferences: profile.preferences,
            }
            : null,
        deferred_modules: {
            blockchain_verification: 'deferred',
        },
    };
}
export function buildReportJson(item, profile) {
    return JSON.stringify(buildReportPayload(item, profile), null, 2);
}
