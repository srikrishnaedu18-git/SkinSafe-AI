export function buildReportPayload(item, profile) {
  const productIngredients = item?.productSnapshot?.ingredients ?? [];
  const productCategory = item?.productSnapshot?.category ?? null;
  const effectiveProfile = item?.userProfileSnapshot ?? profile ?? null;

  return {
    generated_at: new Date().toISOString(),
    product: {
      name: item.productName,
      category: productCategory,
      ingredients: productIngredients,
    },
    user_profile: effectiveProfile
      ? {
          skin_type: effectiveProfile.skinType,
          allergies: effectiveProfile.allergies,
          conditions: effectiveProfile.conditions,
          preferences: effectiveProfile.preferences,
        }
      : null,
    assessment_id: item.assessment.assessmentId,
    suitability_score: item.assessment.suitabilityScore,
    confidence: item.assessment.confidence,
    risk_flags: item.assessment.riskFlags,
    explanations: item.assessment.explanations,
    guidance: item.assessment.guidance,
    alternatives: item.assessment.alternatives,
    xai: item.assessment.xai ?? null,
  };
}
