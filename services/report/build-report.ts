import { AssessmentHistoryItem, UserProfile } from '@/types/models';

export function buildReportPayload(item: AssessmentHistoryItem, profile: UserProfile | null) {
  return {
    generated_at: new Date().toISOString(),
    product_name: item.productName,
    assessment_id: item.assessment.assessmentId,
    suitability_score: item.assessment.score,
    confidence: item.assessment.confidence,
    flags: item.assessment.flags,
    reasons: item.assessment.reasons,
    precautions: item.assessment.precautions,
    alternatives: item.assessment.alternatives,
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
      ai_model_layer: 'deferred',
      xai_trace_engine: 'deferred',
    },
  };
}

export function buildReportJson(item: AssessmentHistoryItem, profile: UserProfile | null) {
  return JSON.stringify(buildReportPayload(item, profile), null, 2);
}
