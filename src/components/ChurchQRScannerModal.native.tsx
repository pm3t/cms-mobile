import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { parseChurchId } from '../api/client';
import { HolyGraceColors } from '../theme/colors';

export interface ChurchQRScannerModalProps {
  visible: boolean;
  onClose: () => void;
  onScanned: (churchId: string) => void;
}

export default function ChurchQRScannerModal({
  visible,
  onClose,
  onScanned,
}: ChurchQRScannerModalProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [manualInput, setManualInput] = useState('');
  const [error, setError] = useState('');

  const handleBarcodeScanned = ({ data }: { data: string }) => {
    if (!data || scanned) return;
    setScanned(true);
    const parsed = parseChurchId(data);
    if (parsed) {
      onScanned(parsed);
      setError('');
    } else {
      setError('Format QR Code tidak valid.');
    }
    setTimeout(() => setScanned(false), 1500);
  };

  const handleApplyManual = () => {
    if (!manualInput.trim()) return;
    const parsed = parseChurchId(manualInput);
    if (parsed) {
      onScanned(parsed);
      setManualInput('');
      setError('');
    } else {
      setError('URL atau kode gereja tidak valid.');
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <View style={styles.scannerContainer}>
        {/* Top Header */}
        <View style={styles.scannerHeader}>
          <TouchableOpacity onPress={onClose} style={styles.scannerCloseButton} activeOpacity={0.7}>
            <Ionicons name="close" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.scannerTitleContainer}>
            <Text style={styles.scannerTitle}>Scan QR Code Gereja</Text>
            <Text style={styles.scannerSubtitle}>
              Arahkan kamera ke QR Code di banner atau warta gereja
            </Text>
          </View>
        </View>

        {/* Camera Viewport */}
        <View style={styles.scannerCameraContainer}>
          {permission?.granted ? (
            <CameraView
              style={StyleSheet.absoluteFillObject}
              barcodeScannerSettings={{
                barcodeTypes: ['qr'],
              }}
              onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
            />
          ) : (
            <View style={styles.noCameraFallback}>
              <Ionicons name="qr-code-outline" size={52} color={HolyGraceColors.goldAccent} />
              <Text style={styles.noCameraTitle}>Izin Kamera Diperlukan</Text>
              <Text style={styles.noCameraDesc}>
                Izinkan akses kamera untuk memindai QR code gereja secara otomatis.
              </Text>
              <TouchableOpacity
                style={styles.permissionButton}
                onPress={requestPermission}
                activeOpacity={0.8}
              >
                <Ionicons name="shield-checkmark-outline" size={16} color="#FFFFFF" />
                <Text style={styles.permissionButtonText}>Izinkan Kamera</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Target Reticle */}
          <View style={styles.reticleOverlay} pointerEvents="none">
            <View style={styles.reticleBox}>
              <View style={[styles.corner, styles.topLeft]} />
              <View style={[styles.corner, styles.topRight]} />
              <View style={[styles.corner, styles.bottomLeft]} />
              <View style={[styles.corner, styles.bottomRight]} />
            </View>
          </View>
        </View>

        {/* Footer / Manual Input */}
        <View style={styles.scannerFooter}>
          {error ? (
            <Text style={styles.errorText}>{error}</Text>
          ) : null}
          <Text style={styles.scannerFooterLabel}>
            Atau tempel Link / URL / Kode QR Gereja:
          </Text>
          <View style={styles.manualInputRow}>
            <TextInput
              style={styles.manualTextInput}
              placeholder="Contoh: https://app.eklesia.id?ChurchId=gpdi-vmm"
              placeholderTextColor="#94A3B8"
              value={manualInput}
              onChangeText={(text) => {
                setManualInput(text);
                setError('');
              }}
              autoCapitalize="none"
            />
            <TouchableOpacity
              style={styles.manualApplyButton}
              onPress={handleApplyManual}
              activeOpacity={0.8}
            >
              <Text style={styles.manualApplyButtonText}>Terapkan</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scannerContainer: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  scannerHeader: {
    paddingTop: Platform.OS === 'ios' ? 56 : 32,
    paddingBottom: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#1E293B',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  scannerCloseButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scannerTitleContainer: {
    flex: 1,
  },
  scannerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  scannerSubtitle: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  scannerCameraContainer: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#020617',
    alignItems: 'center',
    justifyContent: 'center',
  },
  noCameraFallback: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    maxWidth: 320,
  },
  noCameraTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 14,
    textAlign: 'center',
  },
  noCameraDesc: {
    fontSize: 12.5,
    color: '#94A3B8',
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 18,
  },
  permissionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: HolyGraceColors.goldPrimary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 16,
  },
  permissionButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  reticleOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reticleBox: {
    width: 240,
    height: 240,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderColor: HolyGraceColors.goldPrimary,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 14,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 14,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 14,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 14,
  },
  scannerFooter: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 36 : 20,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  errorText: {
    color: '#F87171',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },
  scannerFooterLabel: {
    fontSize: 12,
    color: '#CBD5E1',
    fontWeight: '600',
    marginBottom: 8,
  },
  manualInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  manualTextInput: {
    flex: 1,
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#FFFFFF',
    fontSize: 13,
  },
  manualApplyButton: {
    backgroundColor: HolyGraceColors.goldPrimary,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  manualApplyButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
});

