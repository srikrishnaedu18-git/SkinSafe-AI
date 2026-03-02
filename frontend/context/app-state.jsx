import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../services/api';
import { clearPersistedState, loadPersistedState, savePersistedState } from '../services/storage/local-store';
const AppStateContext = createContext(undefined);
const defaultBusy = {
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
export function AppStateProvider({ children }) {
    const [hydrated, setHydrated] = useState(false);
    const [profile, setProfile] = useState(null);
    const [product, setProduct] = useState(null);
    const [verification, setVerification] = useState(null);
    const [assessment, setAssessment] = useState(null);
    const [history, setHistory] = useState([]);
    const [busy, setBusy] = useState(defaultBusy);
    const [error, setError] = useState(null);
    useEffect(() => {
        let active = true;
        const hydrate = async () => {
            const persisted = await loadPersistedState();
            if (!active)
                return;
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
        if (!hydrated)
            return;
        void savePersistedState({
            profile,
            product,
            verification,
            assessment,
            history,
        });
    }, [hydrated, profile, product, verification, assessment, history]);
    const clearError = () => setError(null);
    const saveProfile = async (input) => {
        setBusy((prev) => ({ ...prev, savingProfile: true }));
        setError(null);
        try {
            const payload = {
                userId: profile?.userId ?? `user-${Date.now()}`,
                skinType: input.skinType,
                allergies: normalizeList(input.allergies),
                conditions: normalizeList(input.conditions),
                preferences: normalizeList(input.preferences),
            };
            const saved = await api.upsertProfile(payload);
            setProfile(saved);
        }
        catch (e) {
            setError(e instanceof Error ? e.message : 'Could not save profile.');
        }
        finally {
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
        }
        catch (e) {
            setError(e instanceof Error ? e.message : 'Could not resolve product.');
        }
        finally {
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
        }
        catch (e) {
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
        }
        finally {
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
            const profileForAssessment = profile ?? buildDefaultProfile();
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
        }
        catch (e) {
            setError(e instanceof Error ? e.message : 'Assessment failed.');
        }
        finally {
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
        }
        catch (e) {
            setError(e instanceof Error ? e.message : 'Could not submit feedback.');
            return false;
        }
        finally {
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
    const value = useMemo(() => ({
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
    }), [hydrated, profile, product, verification, assessment, history, busy, error]);
    return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}
export function useAppState() {
    const context = useContext(AppStateContext);
    if (!context) {
        throw new Error('useAppState must be used within AppStateProvider');
    }
    return context;
}
