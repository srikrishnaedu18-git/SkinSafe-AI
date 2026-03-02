import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { AppButton } from '../../components/ui/app-button';
import { AppCard } from '../../components/ui/app-card';
import { FadeIn } from '../../components/ui/fade-in';
import { AppInput } from '../../components/ui/app-input';
import { AppScreen } from '../../components/ui/app-screen';
import { ErrorBanner } from '../../components/ui/error-banner';
import { ScreenHeader } from '../../components/ui/screen-header';
import { StatusChip } from '../../components/ui/status-chip';
import { runtimeConfig } from '../../constants/runtime-config';
import { Palette, Type } from '../../constants/design';
import { useAppState } from '../../context/app-state';
function toList(value) {
    return value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
}
export default function ProductScreen() {
    const params = useLocalSearchParams();
    const { hydrated, product, verification, busy, error, clearError, resolveProduct, verifyProduct } = useAppState();
    const [qrId, setQrId] = useState('PROD001_BATCH01');
    const [manualIngredients, setManualIngredients] = useState('Aloe Vera, Glycerin, Niacinamide');
    useEffect(() => {
        const scannedProductId = typeof params.product_id === 'string' ? params.product_id.trim() : '';
        if (scannedProductId.length > 0) {
            setQrId(scannedProductId);
            return;
        }
        if (typeof params.scanned === 'string' && params.scanned.trim().length > 0) {
            setQrId(params.scanned.trim());
        }
    }, [params.product_id, params.scanned]);
    const canRunAssessment = Boolean(product && verification?.verified);
    const onResolve = async () => {
        await resolveProduct(qrId.trim(), toList(manualIngredients));
    };
    const onVerify = async () => {
        await verifyProduct();
    };
    if (!hydrated) {
        return (<AppScreen>
        <AppCard>
          <StatusChip label="Loading" tone="neutral"/>
          <Text style={styles.body}>Restoring product workflow state...</Text>
        </AppCard>
      </AppScreen>);
    }
    return (<AppScreen>
      <FadeIn>
        <ScreenHeader title="Product Input" subtitle="Scan QR code or enter QR ID to resolve and verify product records."/>
      </FadeIn>

      <FadeIn delay={40}>
        <StatusChip label={runtimeConfig.useMockApi ? 'Mode: API + Mock Fallback' : 'Mode: Live API Only'} tone={runtimeConfig.useMockApi ? 'warning' : 'success'}/>
      </FadeIn>

      {error ? (<FadeIn delay={80}>
          <ErrorBanner message={error}/>
        </FadeIn>) : null}

      <FadeIn delay={100}>
        <AppCard tone="accent">
          <Text style={styles.sectionTitle}>Resolve Product</Text>
          <AppButton label="Open QR Scanner" variant="secondary" onPress={() => router.push('/scan')}/>
          <AppInput label="QR ID" value={qrId} onChangeText={(value) => {
            if (error)
                clearError();
            setQrId(value);
        }} placeholder="PROD001_BATCH01"/>
          <AppInput label="Manual INCI List (comma separated)" value={manualIngredients} onChangeText={setManualIngredients} placeholder="Aloe Vera, Glycerin, Niacinamide" multiline/>
          <AppButton label={busy.resolvingProduct ? 'Resolving...' : 'Resolve Product'} onPress={onResolve} disabled={busy.resolvingProduct}/>
        </AppCard>
      </FadeIn>

      {product ? (<FadeIn delay={140}>
          <AppCard>
            <StatusChip label="Product Resolved" tone="neutral"/>
            <Text style={styles.body}>QR ID: {product.qrId ?? product.productId}</Text>
            <Text style={styles.body}>Brand: {product.brand}</Text>
            <Text style={styles.body}>Name: {product.name}</Text>
            <Text style={styles.body}>Category: {product.category}</Text>
            <Text style={styles.body}>Batch: {product.batchNumber ?? 'N/A'}</Text>
            <Text style={styles.body}>Origin: {product.origin ?? 'N/A'}</Text>
            <Text style={styles.body}>MFG: {product.manufacturedDate ?? 'N/A'}</Text>
            <Text style={styles.body}>EXP: {product.expiryDate ?? 'N/A'}</Text>
            <Text style={styles.body}>Expired: {product.isExpired ? 'Yes' : 'No'}</Text>
            <Text style={styles.body}>INCI: {(product.inciList ?? []).join(', ') || 'N/A'}</Text>
            <AppButton label={busy.verifyingProduct ? 'Verifying...' : 'Verify Record'} onPress={onVerify} disabled={busy.verifyingProduct}/>
          </AppCard>
        </FadeIn>) : null}

      {verification ? (<FadeIn delay={180}>
          <AppCard>
            <StatusChip label={verification.verified ? 'Verified' : 'Unverified'} tone={verification.verified ? 'success' : 'danger'}/>
            <Text style={styles.body}>Status: {verification.status ?? 'unknown'}</Text>
            <Text style={styles.body}>Reason: {verification.reason ?? 'N/A'}</Text>
            <Text style={styles.body}>Issuer: {verification.issuerId}</Text>
            <Text style={styles.body}>Batch: {verification.batchId}</Text>
            <Text style={styles.body}>Timestamp: {new Date(verification.timestamp).toLocaleString()}</Text>
            <Text style={styles.body}>Proof: {verification.proof}</Text>
            <Text style={styles.body}>Local Hash: {verification.localHash ?? 'N/A'}</Text>
            <Text style={styles.body}>Chain Hash: {verification.chainHash ?? 'N/A'}</Text>
            <AppButton label="Go To Assessment" onPress={() => router.push('/(tabs)/assessment')} variant={canRunAssessment ? 'primary' : 'secondary'} disabled={!canRunAssessment}/>
          </AppCard>
        </FadeIn>) : null}
    </AppScreen>);
}
const styles = StyleSheet.create({
    sectionTitle: {
        fontSize: Type.heading,
        fontWeight: '700',
        color: Palette.textPrimary,
    },
    body: {
        fontSize: Type.body,
        color: Palette.textSecondary,
        lineHeight: 22,
    },
});
