import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api, setAuthToken } from '../services/api';
import { clearPersistedState, loadPersistedState, savePersistedState } from '../services/storage/local-store';

const AppStateContext = createContext(undefined);

const defaultBusy = {
  registering: false,
  loggingIn: false,
  savingProfile: false,
  resolvingProduct: false,
  verifyingProduct: false,
  runningAssessment: false,
  submittingFeedback: false,
};

function normalizeList(value) {
  return value.map((item) => item.trim()).filter(Boolean);
}

function buildDefaultProfile(existingUserId) {
  return {
    userId: existingUserId ?? `user-${Date.now()}`,
    skinType: 'normal',
    allergies: [],
    conditions: [],
    preferences: [],
  };
}

function mapAuthError(message, fallback) {
  const text = String(message ?? '').toLowerCase();

  if (text.includes('username already exists')) {
    return 'This username is already taken. Try another one.';
  }
  if (text.includes('invalid username or password')) {
    return 'Invalid username or password.';
  }
  if (text.includes('username must be')) {
    return 'Username must be 3-30 chars (letters, numbers, dot, underscore, hyphen).';
  }
  if (text.includes('password must be at least 6')) {
    return 'Password must be at least 6 characters.';
  }

  return fallback;
}

export function AppStateProvider({ children }) {
  const [hydrated, setHydrated] = useState(false);
  const [auth, setAuth] = useState(null);
  const [profile, setProfile] = useState(null);
  const [product, setProduct] = useState(null);
  const [verification, setVerification] = useState(null);
  const [assessment, setAssessment] = useState(null);
  const [history, setHistory] = useState([]);
  const [busy, setBusy] = useState(defaultBusy);
  const [error, setError] = useState(null);
  const [authMessage, setAuthMessage] = useState(null);

  useEffect(() => {
    let active = true;

    const hydrate = async () => {
      const persisted = await loadPersistedState();
      if (!active) return;

      setAuth(persisted.auth);
      setAuthToken(persisted.auth?.token ?? null);
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
      auth,
      profile,
      product,
      verification,
      assessment,
      history,
    });
  }, [hydrated, auth, profile, product, verification, assessment, history]);

  const clearError = () => setError(null);
  const clearAuthMessage = () => setAuthMessage(null);

  const register = async ({ username, password }) => {
    setBusy((prev) => ({ ...prev, registering: true }));
    setError(null);
    setAuthMessage(null);

    try {
      if (!username?.trim() || !password) {
        setAuthMessage('Enter both username and password.');
        return false;
      }

      const response = await api.register({ username, password });
      const nextAuth = {
        token: response.token,
        userId: response.user.id,
        username: response.user.username,
        expiresAt: response.expiresAt,
      };
      setAuth(nextAuth);
      setAuthToken(nextAuth.token);
      setAuthMessage('Success: account created and logged in.');

      if (profile?.userId && profile.userId !== nextAuth.userId) {
        setProfile(null);
      }

      return true;
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Could not register.';
      setAuthMessage(mapAuthError(message, 'Could not register right now.'));
      return false;
    } finally {
      setBusy((prev) => ({ ...prev, registering: false }));
    }
  };

  const login = async ({ username, password }) => {
    setBusy((prev) => ({ ...prev, loggingIn: true }));
    setError(null);
    setAuthMessage(null);

    try {
      if (!username?.trim() || !password) {
        setAuthMessage('Enter both username and password.');
        return false;
      }

      const response = await api.login({ username, password });
      const nextAuth = {
        token: response.token,
        userId: response.user.id,
        username: response.user.username,
        expiresAt: response.expiresAt,
      };
      setAuth(nextAuth);
      setAuthToken(nextAuth.token);
      setAuthMessage('Success: logged in.');

      if (profile?.userId && profile.userId !== nextAuth.userId) {
        setProfile(null);
      }

      return true;
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Could not login.';
      setAuthMessage(mapAuthError(message, 'Could not login right now.'));
      return false;
    } finally {
      setBusy((prev) => ({ ...prev, loggingIn: false }));
    }
  };

  const logout = async () => {
    setError(null);
    setAuthMessage('Logged out.');

    try {
      await api.logout();
    } catch {
      // client-side logout should proceed even if server call fails
    }

    setAuthToken(null);
    setAuth(null);
    setProfile(null);
    setProduct(null);
    setVerification(null);
    setAssessment(null);
    setHistory([]);
    await clearPersistedState();
  };

  const saveProfile = async (input) => {
    if (!auth?.token || !auth?.userId) {
      setError('Please login first.');
      return;
    }

    setBusy((prev) => ({ ...prev, savingProfile: true }));
    setError(null);

    try {
      const payload = {
        skinType: input.skinType,
        allergies: normalizeList(input.allergies),
        conditions: normalizeList(input.conditions),
        preferences: normalizeList(input.preferences),
      };

      const saved = await api.upsertProfile(payload);
      setProfile({
        userId: saved.userId ?? auth.userId,
        skinType: saved.skinType,
        allergies: saved.allergies ?? [],
        conditions: saved.conditions ?? [],
        preferences: saved.preferences ?? [],
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save profile.');
    } finally {
      setBusy((prev) => ({ ...prev, savingProfile: false }));
    }
  };

  const resolveProduct = async (barcode, manualIngredients) => {
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
      setVerification({
        verified: false,
        status: 'verification_error',
        reason: e instanceof Error ? e.message : 'Could not verify product.',
        issuerId: 'unavailable',
        batchId: product.productId,
        timestamp: new Date().toISOString(),
        proof: 'none',
        localHash: null,
        chainHash: null,
      });
      setError(e instanceof Error ? e.message : 'Could not verify product.');
    } finally {
      setBusy((prev) => ({ ...prev, verifyingProduct: false }));
    }
  };

  const runAssessment = async () => {
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
      const profileForAssessment = profile ?? buildDefaultProfile(auth?.userId);
      if (!profile) {
        setProfile(profileForAssessment);
      }

      const result = await api.assess(profileForAssessment, product);
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

  const submitFeedback = async (reaction, severity, notes) => {
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
    setAuthToken(null);
    setAuth(null);
    setProfile(null);
    setProduct(null);
    setVerification(null);
    setAssessment(null);
    setHistory([]);
    setError(null);
    setAuthMessage(null);
    await clearPersistedState();
  };

  const value = useMemo(
    () => ({
      hydrated,
      auth,
      profile,
      product,
      verification,
      assessment,
      history,
      busy,
      error,
      authMessage,
      clearError,
      clearAuthMessage,
      register,
      login,
      logout,
      saveProfile,
      resolveProduct,
      verifyProduct,
      runAssessment,
      submitFeedback,
      clearHistory,
      resetAllData,
    }),
    [hydrated, auth, profile, product, verification, assessment, history, busy, error, authMessage]
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
