import { router } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AppButton } from '@/components/ui/app-button';
import { AppCard } from '@/components/ui/app-card';
import { AppScreen } from '@/components/ui/app-screen';
import { Palette, Type } from '@/constants/design';

export default function ScanScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  if (!permission) {
    return (
      <AppScreen>
        <AppCard>
          <Text style={styles.title}>Camera Permission</Text>
          <Text style={styles.body}>Loading camera permission state...</Text>
        </AppCard>
      </AppScreen>
    );
  }

  if (!permission.granted) {
    return (
      <AppScreen>
        <AppCard tone="accent">
          <Text style={styles.title}>Camera Permission Needed</Text>
          <Text style={styles.body}>Allow camera access to scan barcode or QR code.</Text>
          <AppButton label="Grant Permission" onPress={requestPermission} />
          <AppButton label="Back" variant="secondary" onPress={() => router.back()} />
        </AppCard>
      </AppScreen>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{
          barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'qr', 'code128'],
        }}
        onBarcodeScanned={
          scanned
            ? undefined
            : ({ data }) => {
                setScanned(true);
                router.replace({ pathname: '/(tabs)/product', params: { scanned: data } });
              }
        }
      />

      <View style={styles.overlay}>
        <Text style={styles.caption}>Align code inside frame</Text>
        <View style={styles.scanBox}>
          <View style={[styles.corner, styles.topLeft]} />
          <View style={[styles.corner, styles.topRight]} />
          <View style={[styles.corner, styles.bottomLeft]} />
          <View style={[styles.corner, styles.bottomRight]} />
        </View>
      </View>

      <View style={styles.footer}>
        <AppButton label="Cancel" variant="secondary" onPress={() => router.back()} />
      </View>
    </View>
  );
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
    height: 190,
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
