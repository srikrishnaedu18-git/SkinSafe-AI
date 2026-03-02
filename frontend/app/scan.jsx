import { router } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AppButton } from '../components/ui/app-button';
import { AppCard } from '../components/ui/app-card';
import { AppScreen } from '../components/ui/app-screen';
import { Palette, Type } from '../constants/design';
import { normalizeQrId } from '../services/api';
export default function ScanScreen() {
    const [permission, requestPermission] = useCameraPermissions();
    const [scanned, setScanned] = useState(false);
    const [scanMessage, setScanMessage] = useState('');
    if (!permission) {
        return (<AppScreen>
        <AppCard>
          <Text style={styles.title}>Camera Permission</Text>
          <Text style={styles.body}>Loading camera permission state...</Text>
        </AppCard>
      </AppScreen>);
    }
    if (!permission.granted) {
        return (<AppScreen>
        <AppCard tone="accent">
          <Text style={styles.title}>Camera Permission Needed</Text>
          <Text style={styles.body}>Allow camera access to scan product QR code.</Text>
          <AppButton label="Grant Permission" onPress={requestPermission}/>
          <AppButton label="Back" variant="secondary" onPress={() => router.back()}/>
        </AppCard>
      </AppScreen>);
    }
    return (<View style={styles.container}>
      <CameraView style={StyleSheet.absoluteFill} facing="back" barcodeScannerSettings={{
            barcodeTypes: ['qr'],
        }} onBarcodeScanned={scanned
            ? undefined
            : ({ data }) => {
                const normalizedProductId = normalizeQrId(data);
                const isProductQr = /^PROD\d{3}_BATCH\d{2}$/.test(normalizedProductId);
                if (!isProductQr) {
                    setScanMessage('Not a product QR. Scan one with PROD###_BATCH##.');
                    return;
                }
                setScanned(true);
                setScanMessage('');
                router.replace({
                    pathname: '/(tabs)/product',
                    params: {
                        scanned: data,
                        product_id: normalizedProductId,
                    },
                });
            }}/>

      <View style={styles.overlay}>
        <Text style={styles.caption}>Align QR inside frame</Text>
        {scanMessage ? <Text style={styles.warning}>{scanMessage}</Text> : null}
        <View style={styles.scanBox}>
          <View style={[styles.corner, styles.topLeft]}/>
          <View style={[styles.corner, styles.topRight]}/>
          <View style={[styles.corner, styles.bottomLeft]}/>
          <View style={[styles.corner, styles.bottomRight]}/>
        </View>
      </View>

      <View style={styles.footer}>
        <AppButton label="Cancel" variant="secondary" onPress={() => router.back()}/>
      </View>
    </View>);
}
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000000',
    },
    overlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 16,
    },
    scanBox: {
        width: 260,
        height: 260,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.65)',
        borderRadius: 18,
        backgroundColor: 'transparent',
    },
    corner: {
        position: 'absolute',
        width: 28,
        height: 28,
        borderColor: '#FFFFFF',
    },
    topLeft: {
        top: 6,
        left: 6,
        borderTopWidth: 3,
        borderLeftWidth: 3,
        borderTopLeftRadius: 10,
    },
    topRight: {
        top: 6,
        right: 6,
        borderTopWidth: 3,
        borderRightWidth: 3,
        borderTopRightRadius: 10,
    },
    bottomLeft: {
        bottom: 6,
        left: 6,
        borderBottomWidth: 3,
        borderLeftWidth: 3,
        borderBottomLeftRadius: 10,
    },
    bottomRight: {
        bottom: 6,
        right: 6,
        borderBottomWidth: 3,
        borderRightWidth: 3,
        borderBottomRightRadius: 10,
    },
    caption: {
        color: '#FFFFFF',
        fontSize: Type.body,
        fontWeight: '700',
        letterSpacing: 0.3,
        textShadowColor: 'rgba(0,0,0,0.5)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 4,
    },
    warning: {
        color: '#FECACA',
        backgroundColor: 'rgba(127,29,29,0.72)',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
        fontSize: 13,
        maxWidth: 300,
        textAlign: 'center',
    },
    footer: {
        padding: 16,
        backgroundColor: 'rgba(15,23,42,0.7)',
    },
    title: {
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
