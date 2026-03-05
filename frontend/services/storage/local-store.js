import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'bc_patent_app_state_v1';

const defaultState = {
  auth: null,
  profile: null,
  product: null,
  verification: null,
  assessment: null,
  history: [],
};

export async function loadPersistedState() {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState;

    const parsed = JSON.parse(raw);
    return {
      auth: parsed.auth ?? null,
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

export async function savePersistedState(state) {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Best-effort persistence; runtime flow should continue even if storage fails.
  }
}

export async function clearPersistedState() {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch {
    // noop
  }
}
