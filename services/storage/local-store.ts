import AsyncStorage from '@react-native-async-storage/async-storage';

import { AssessmentHistoryItem, AssessmentResult, ProductResolved, UserProfile, VerificationResult } from '@/types/models';

type PersistedState = {
  profile: UserProfile | null;
  product: ProductResolved | null;
  verification: VerificationResult | null;
  assessment: AssessmentResult | null;
  history: AssessmentHistoryItem[];
};

const STORAGE_KEY = 'bc_patent_app_state_v1';

const defaultState: PersistedState = {
  profile: null,
  product: null,
  verification: null,
  assessment: null,
  history: [],
};

export async function loadPersistedState(): Promise<PersistedState> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState;

    const parsed = JSON.parse(raw) as PersistedState;

    return {
      profile: parsed.profile ?? null,
      product: parsed.product ?? null,
      verification: parsed.verification ?? null,
      assessment: parsed.assessment ?? null,
      history: parsed.history ?? [],
    };
  } catch {
    return defaultState;
  }
}

export async function savePersistedState(state: PersistedState): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Best-effort persistence; runtime flow should continue even if storage fails.
  }
}

export async function clearPersistedState(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch {
    // noop
  }
}
