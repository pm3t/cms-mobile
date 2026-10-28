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
  const [manualInput, setManualInput] = useState('');
  const [error, setError] = useState('');

  const handleApply = () => {
    if (!manualInput.trim()) return;
    const parsed = parseChurchId(manualInput);
    if (parsed) {
      onScanned(parsed);
      setManualInput('');
      setError('');
    } else {
      setError('Format URL atau kode gereja tidak valid.');
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.titleContainer}>
              <View style={styles.iconBadge}>
                <Ionicons name="qr-code-outline" size={20} color={HolyGraceColors.goldPrimary} />
              </View>
              <View>
                <Text style={styles.title}>Hubungkan Gereja</Text>
                <Text style={styles.subtitle}>Tempel link atau kode QR gereja Anda</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <Ionicons name="close" size={20} color={HolyGraceColors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Body */}
          <View style={styles.body}>
            <View style={styles.infoBox}>
              <Ionicons name="information-circle-outline" size={18} color={HolyGraceColors.goldPrimary} />
              <Text style={styles.infoText}>
                Di browser web, Anda dapat menempelkan URL gereja dari QR Code atau tautan warta jemaat.
              </Text>
            </View>

            {error ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle-outline" size={16} color={HolyGraceColors.dangerText} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <Text style={styles.inputLabel}>URL / Link / Kode Gereja:</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.textInput}
                placeholder="Contoh: https://app.eklesia.id?ChurchId=gpdi-vmm"
                placeholderTextColor={HolyGraceColors.textMuted}
                value={manualInput}
                onChangeText={(text) => {
                  setManualInput(text);
                  setError('');
                }}
                autoCapitalize="none"
                autoFocus
              />
            </View>

            {/* Quick Suggestions for Convenience */}
            <View style={styles.quickTags}>
              <Text style={styles.quickTagsLabel}>Contoh cepat:</Text>
              <TouchableOpacity
                style={styles.tag}
                onPress={() => setManualInput('gpdi-vmm')}
              >
                <Text style={styles.tagText}>gpdi-vmm</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity onPress={onClose} style={styles.cancelBtn} activeOpacity={0.7}>
              <Text style={styles.cancelBtnText}>Batal</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleApply} style={styles.submitBtn} activeOpacity={0.8}>
              <Text style={styles.submitBtnText}>Terapkan</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: HolyGraceColors.borderLight,
    backgroundColor: '#FAFAFA',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBadge: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: HolyGraceColors.goldLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
    color: HolyGraceColors.textPrimary,
  },
  subtitle: {
    fontSize: 11,
    color: HolyGraceColors.textMuted,
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 8,
  },
  body: {
    padding: 20,
  },
  infoBox: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: HolyGraceColors.goldLight,
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    alignItems: 'flex-start',
  },
  infoText: {
    flex: 1,
    fontSize: 11.5,
    lineHeight: 16,
    color: HolyGraceColors.navySecondary,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: HolyGraceColors.dangerLight,
    padding: 10,
    borderRadius: 10,
    marginBottom: 12,
  },
  errorText: {
    fontSize: 11,
    color: HolyGraceColors.dangerText,
    fontWeight: '600',
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    color: HolyGraceColors.textSecondary,
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  inputRow: {
    backgroundColor: HolyGraceColors.surfaceSubtle,
    borderWidth: 1,
    borderColor: HolyGraceColors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  textInput: {
    fontSize: 13,
    color: HolyGraceColors.textPrimary,
    paddingVertical: 8,
  },
  quickTags: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
  },
  quickTagsLabel: {
    fontSize: 11,
    color: HolyGraceColors.textMuted,
  },
  tag: {
    backgroundColor: HolyGraceColors.borderLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  tagText: {
    fontSize: 10.5,
    fontWeight: '600',
    color: HolyGraceColors.navySecondary,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: HolyGraceColors.borderLight,
    backgroundColor: '#FAFAFA',
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: HolyGraceColors.textMuted,
  },
  submitBtn: {
    backgroundColor: HolyGraceColors.goldPrimary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  submitBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});

