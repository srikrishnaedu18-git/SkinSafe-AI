import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';

import { api } from '@/services/api';
import { clearPersistedState, loadPersistedState, savePersistedState } from '@/services/storage/local-store';
import {
  AssessmentHistoryItem,
  AssessmentResult,
  ProductResolved,
  SkinType,
  UserProfile,
  VerificationResult,
} from '@/types/models';

type BusyState = {
  savingProfile: boolean;
  resolvingProduct: boolean;
  verifyingProduct: boolean;
  runningAssessment: boolean;
  submittingFeedback: boolean;
};

type AppStateValue = {
  hydrated: boolean;
  profile: UserProfile | null;
  product: ProductResolved | null;
  verification: VerificationResult | null;
  assessment: AssessmentResult | null;
  history: AssessmentHistoryItem[];
  busy: BusyState;
  error: string | null;
  clearError: () => void;
  saveProfile: (input: {
    skinType: SkinType;
    allergies: string[];
    conditions: string[];
    preferences: string[];
  }) => Promise<void>;
  resolveProduct: (barcode: string, manualIngredients: string[]) => Promise<void>;
  verifyProduct: () => Promise<void>;
  runAssessment: () => Promise<void>;
  submitFeedback: (reaction: string, severity: 'low' | 'medium' | 'high', notes: string) => Promise<boolean>;
  clearHistory: () => void;
  resetAllData: () => Promise<void>;
};

const AppStateContext = createContext<AppStateValue | undefined>(undefined);

const defaultBusy: BusyState = {
  savingProfile: false,
  resolvingProduct: false,
  verifyingProduct: false,
  runningAssessment: false,
  submittingFeedback: false,
};

function normalizeList(value: string[]) {
  return value.map((item) => item.trim()).filter(Boolean);
}

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [product, setProduct] = useState<ProductResolved | null>(null);
  const [verification, setVerification] = useState<VerificationResult | null>(null);
  const [assessment, setAssessment] = useState<AssessmentResult | null>(null);
  const [history, setHistory] = useState<AssessmentHistoryItem[]>([]);
  const [busy, setBusy] = useState<BusyState>(defaultBusy);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const hydrate = async () => {
      const persisted = await loadPersistedState();
      if (!active) return;

      setProfile(persisted.profile);
      setProduct(persisted.product);
      setVerification(persisted.verification);
      setAssessment(persisted.assessment);
      setHistory(persisted.history);
      setHydrated(true);
    };

    void hydrate();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;

    void savePersistedState({
      profile,
      product,
      verification,
      assessment,
      history,
    });
  }, [hydrated, profile, product, verification, assessment, history]);

  const clearError = () => setError(null);

  const saveProfile: AppStateValue['saveProfile'] = async (input) => {
    setBusy((prev) => ({ ...prev, savingProfile: true }));
    setError(null);

    try {
      const payload: UserProfile = {
        userId: profile?.userId ?? `user-${Date.now()}`,
        skinType: input.skinType,
        allergies: normalizeList(input.allergies),
        conditions: normalizeList(input.conditions),
        preferences: normalizeList(input.preferences),
      };
      const saved = await api.upsertProfile(payload);
      setProfile(saved);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save profile.');
    } finally {
      setBusy((prev) => ({ ...prev, savingProfile: false }));
    }
  };

  const resolveProduct: AppStateValue['resolveProduct'] = async (barcode, manualIngredients) => {
    setBusy((prev) => ({ ...prev, resolvingProduct: true }));
    setError(null);

    try {
      const resolved = await api.resolveProduct(barcode);
      const withManual = {
        ...resolved,
        inciList: manualIngredients.length > 0 ? manualIngredients : resolved.inciList,
      };
      setProduct(withManual);
      setVerification(null);
      setAssessment(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not resolve product.');
    } finally {
      setBusy((prev) => ({ ...prev, resolvingProduct: false }));
    }
  };

  const verifyProduct = async () => {
    if (!product?.productId) {
      setError('Resolve a product first.');
      return;
    }

    setBusy((prev) => ({ ...prev, verifyingProduct: true }));
    setError(null);

    try {
      const result = await api.verifyProduct(product.productId);
      setVerification(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not verify product.');
    } finally {
      setBusy((prev) => ({ ...prev, verifyingProduct: false }));
    }
  };

  const runAssessment = async () => {
    if (!profile?.userId) {
      setError('Create profile before assessment.');
      return;
    }

    if (!product?.productId) {
      setError('Resolve product before assessment.');
      return;
    }

    if (!verification?.verified) {
      setError('Verification failed or pending.');
      return;
    }

    setBusy((prev) => ({ ...prev, runningAssessment: true }));
    setError(null);

    try {
      const result = await api.assess(profile.userId, product.productId, profile.skinType);
      setAssessment(result);
      setHistory((prev) => [
        {
          createdAt: new Date().toISOString(),
          productName: product.name,
          assessment: result,
        },
        ...prev,
      ]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Assessment failed.');
    } finally {
      setBusy((prev) => ({ ...prev, runningAssessment: false }));
    }
  };

  const submitFeedback: AppStateValue['submitFeedback'] = async (reaction, severity, notes) => {
    if (!assessment?.assessmentId) {
      setError('No assessment available for feedback.');
      return false;
    }

    setBusy((prev) => ({ ...prev, submittingFeedback: true }));
    setError(null);

    try {
      await api.submitFeedback(assessment.assessmentId, reaction, severity, notes);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not submit feedback.');
      return false;
    } finally {
      setBusy((prev) => ({ ...prev, submittingFeedback: false }));
    }
  };

  const clearHistory = () => {
    setHistory([]);
  };

  const resetAllData = async () => {
    setProfile(null);
    setProduct(null);
    setVerification(null);
    setAssessment(null);
    setHistory([]);
    setError(null);
    await clearPersistedState();
  };

  const value = useMemo(
    () => ({
      hydrated,
      profile,
      product,
      verification,
      assessment,
      history,
      busy,
      error,
      clearError,
      saveProfile,
      resolveProduct,
      verifyProduct,
      runAssessment,
      submitFeedback,
      clearHistory,
      resetAllData,
    }),
    [hydrated, profile, product, verification, assessment, history, busy, error]
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState() {
  const context = useContext(AppStateContext);
  if (!context) {
    throw new Error('useAppState must be used within AppStateProvider');
  }
  return context;
}
