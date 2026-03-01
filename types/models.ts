export type SkinType = 'oily' | 'dry' | 'combination' | 'sensitive' | 'normal';

export type UserProfile = {
  userId: string;
  skinType: SkinType;
  allergies: string[];
  conditions: string[];
  preferences: string[];
};

export type ProductResolved = {
  productId: string;
  brand: string;
  name: string;
  category: string;
  recordUri: string;
  inciList?: string[];
};

export type VerificationResult = {
  verified: boolean;
  issuerId: string;
  batchId: string;
  timestamp: string;
  proof: string;
};

export type AssessmentResult = {
  assessmentId: string;
  score: number;
  confidence: number;
  flags: string[];
  reasons: string[];
  precautions: string[];
  alternatives: string[];
};

export type AssessmentHistoryItem = {
  createdAt: string;
  productName: string;
  assessment: AssessmentResult;
};
