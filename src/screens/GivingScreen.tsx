import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { client } from '../api/client';
import { HolyGraceColors, Shadows } from '../theme/colors';

const GIVING_CATEGORIES = [
  { id: 'Tithe', label: 'Perpuluhan', icon: 'gift-outline' as const },
  { id: 'Offering', label: 'Persembahan', icon: 'heart-outline' as const },
  { id: 'Diaconia', label: 'Diakonia', icon: 'hand-left-outline' as const },
  { id: 'Mission', label: 'Misi & PI', icon: 'globe-outline' as const },
  { id: 'Building', label: 'Pembangunan', icon: 'business-outline' as const },
];

const NOMINAL_PRESETS = [
  { label: '50 Ribu', value: '50000' },
  { label: '100 Ribu', value: '100000' },
  { label: '250 Ribu', value: '250000' },
  { label: '500 Ribu', value: '500000' },
  { label: '1 Juta', value: '1000000' },
];

export default function GivingScreen() {
  const [selectedCategory, setSelectedCategory] = useState('Offering');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      return Alert.alert('Izin Ditolak', 'Aplikasi memerlukan akses galeri untuk mengunggah bukti transfer.');
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  const handleGive = async () => {
    const cleanAmount = amount.replace(/[^0-9]/g, '');
    if (!cleanAmount || isNaN(Number(cleanAmount)) || Number(cleanAmount) <= 0) {
      return Alert.alert('Peringatan', 'Silakan masukkan jumlah nominal yang valid');
    }

    setLoading(true);
    try {
      let proofUrl = null;

      // 1. Upload receipt if exists
      if (image) {
        const formData = new FormData();
        const filename = image.split('/').pop() || 'receipt.jpg';

        if (Platform.OS === 'web') {
          const response = await fetch(image);
          const blob = await response.blob();
          formData.append('file', blob, filename);
        } else {
          const match = /\.(\w+)$/.exec(filename);
          const type = match ? `image/${match[1]}` : `image/jpeg`;
          formData.append('file', {
            uri: image,
            name: filename,
            type,
          } as any);
        }

        const uploadRes = await client.post('/giving/upload', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
        proofUrl = uploadRes.data.imageUrl;
      }

      // Combine category with description
      const fullDescription = description.trim()
        ? `[${selectedCategory}] ${description.trim()}`
        : `[${selectedCategory}]`;

      // 2. Submit transaction
      await client.post('/giving', {
        amount: Number(cleanAmount),
        description: fullDescription,
        proofUrl,
      });

      Alert.alert(
        'Puji Tuhan',
        'Persembahan Anda telah berhasil dicatat. Terima kasih atas taburan benih kasih untuk pekerjaan Tuhan.'
      );
      setAmount('');
      setDescription('');
      setImage(null);
    } catch (err: any) {
      Alert.alert('Gagal', err.response?.data?.error || err.message || 'Gagal mengirimkan persembahan');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrencyDisplay = (numStr: string) => {
    const digits = numStr.replace(/[^0-9]/g, '');
    if (!digits) return '';
    return new Intl.NumberFormat('id-ID').format(Number(digits));
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Title Header */}
      <View style={styles.headerBox}>
        <View style={styles.headerIconCircle}>
          <Ionicons name="heart" size={24} color={HolyGraceColors.goldPrimary} />
        </View>
        <Text style={styles.headerTitle}>Persembahan & Ucapan Syukur</Text>
        <Text style={styles.headerSubtitle}>
          Taburlah dengan sukacita bagi kemuliaan kerajaan Allah.
        </Text>
      </View>

      {/* Official Church Bank Account Card */}
      <View style={styles.bankCard}>
        <View style={styles.bankCardHeader}>
          <View style={styles.bankLogoBadge}>
            <Ionicons name="shield-checkmark" size={16} color={HolyGraceColors.goldAccent} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.bankNameText}>Rekening Resmi Gereja</Text>
            <Text style={styles.bankSubText}>BCA • Bank Central Asia</Text>
          </View>
        </View>

        <View style={styles.accNumberRow}>
          <Text style={styles.accNumberText}>880 123 4567</Text>
        </View>
        <Text style={styles.accHolderText}>a.n. GEREJA EKLESIA INDONESIA</Text>
      </View>

      {/* Main Form Card */}
      <View style={styles.card}>
        {/* Category Selector */}
        <Text style={styles.label}>Pilih Jenis Persembahan</Text>
        <View style={styles.categoryRow}>
          {GIVING_CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <TouchableOpacity
                key={cat.id}
                style={[styles.categoryChip, isSelected && styles.categoryChipSelected]}
                onPress={() => setSelectedCategory(cat.id)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={cat.icon}
                  size={15}
                  color={isSelected ? HolyGraceColors.navyPrimary : HolyGraceColors.textSecondary}
                />
                <Text style={[styles.categoryChipText, isSelected && styles.categoryChipTextSelected]}>
                  {cat.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Amount Input */}
        <Text style={[styles.label, { marginTop: 18 }]}>Nominal Persembahan (Rp)</Text>
        <View style={styles.amountInputRow}>
          <Text style={styles.currencyPrefix}>Rp</Text>
          <TextInput
            style={styles.amountInput}
            placeholder="0"
            placeholderTextColor={HolyGraceColors.textMuted}
            value={formatCurrencyDisplay(amount)}
            onChangeText={(val) => setAmount(val.replace(/[^0-9]/g, ''))}
            keyboardType="numeric"
          />
        </View>

        {/* Nominal Presets */}
        <View style={styles.presetRow}>
          {NOMINAL_PRESETS.map((preset) => (
            <TouchableOpacity
              key={preset.value}
              style={[
                styles.presetChip,
                amount === preset.value && styles.presetChipSelected,
              ]}
              onPress={() => setAmount(preset.value)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.presetChipText,
                  amount === preset.value && styles.presetChipTextSelected,
                ]}
              >
                {preset.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Optional Notes */}
        <Text style={[styles.label, { marginTop: 18 }]}>Catatan / Pokok Ucapan Syukur (Opsional)</Text>
        <TextInput
          style={styles.inputNotes}
          placeholder="Tuliskan pokok ucapan syukur atau keterangan..."
          placeholderTextColor={HolyGraceColors.textMuted}
          value={description}
          onChangeText={setDescription}
          multiline
        />

        {/* Proof of Transfer Upload */}
        <Text style={[styles.label, { marginTop: 18 }]}>Bukti Transfer (Struk / Screenshot)</Text>
        {image ? (
          <View style={styles.previewContainer}>
            <Image source={{ uri: image }} style={styles.previewImage} resizeMode="cover" />
            <TouchableOpacity style={styles.removeImageBtn} onPress={() => setImage(null)}>
              <Ionicons name="trash-outline" size={14} color="#fff" />
              <Text style={styles.removeImageBtnText}>Hapus Gambar</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.uploadBox} onPress={pickImage} activeOpacity={0.7}>
            <View style={styles.uploadIconCircle}>
              <Ionicons name="camera-outline" size={24} color={HolyGraceColors.navySecondary} />
            </View>
            <Text style={styles.uploadBoxTitle}>Unggah Bukti Transfer</Text>
            <Text style={styles.uploadBoxSubtitle}>Format JPG, PNG (Maks 5MB)</Text>
          </TouchableOpacity>
        )}

        {/* Submit Button */}
        <TouchableOpacity
          style={styles.submitBtn}
          onPress={handleGive}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <View style={styles.submitBtnContent}>
              <Ionicons name="heart-circle" size={20} color="#fff" />
              <Text style={styles.submitBtnText}>Kirim Persembahan</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: HolyGraceColors.background,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },

  // Header Box
  headerBox: {
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 8,
  },
  headerIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: HolyGraceColors.goldLight,
    borderWidth: 1,
    borderColor: HolyGraceColors.goldBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: HolyGraceColors.navyPrimary,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 12.5,
    color: HolyGraceColors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    paddingHorizontal: 20,
  },

  // Bank Card
  bankCard: {
    backgroundColor: HolyGraceColors.navyDark,
    borderRadius: 20,
    padding: 18,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(217, 119, 6, 0.3)',
    ...Shadows.md,
  },
  bankCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  bankLogoBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(217, 119, 6, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bankNameText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  bankSubText: {
    fontSize: 11,
    color: HolyGraceColors.goldAccent,
    fontWeight: '600',
  },
  accNumberRow: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 8,
  },
  accNumberText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 2,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  accHolderText: {
    fontSize: 11,
    color: '#CBD5E1',
    fontWeight: '600',
    letterSpacing: 0.5,
  },

  // Form Card
  card: {
    backgroundColor: HolyGraceColors.surface,
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: HolyGraceColors.border,
    ...Shadows.card,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: HolyGraceColors.textPrimary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },

  // Category Selector
  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: HolyGraceColors.surfaceSubtle,
    borderWidth: 1,
    borderColor: HolyGraceColors.border,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as const } : {}),
  },
  categoryChipSelected: {
    backgroundColor: HolyGraceColors.goldLight,
    borderColor: HolyGraceColors.goldBorder,
  },
  categoryChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: HolyGraceColors.textSecondary,
  },
  categoryChipTextSelected: {
    color: HolyGraceColors.goldDark,
    fontWeight: '700',
  },

  // Amount Input
  amountInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: HolyGraceColors.surfaceSubtle,
    borderWidth: 1.5,
    borderColor: HolyGraceColors.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    marginBottom: 10,
  },
  currencyPrefix: {
    fontSize: 18,
    fontWeight: '800',
    color: HolyGraceColors.navySecondary,
    marginRight: 6,
  },
  amountInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 20,
    fontWeight: '800',
    color: HolyGraceColors.textPrimary,
  },

  // Presets
  presetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 4,
  },
  presetChip: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: HolyGraceColors.surfaceSubtle,
    borderWidth: 1,
    borderColor: HolyGraceColors.borderLight,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as const } : {}),
  },
  presetChipSelected: {
    backgroundColor: HolyGraceColors.blueLight,
    borderColor: HolyGraceColors.blueBorder,
  },
  presetChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: HolyGraceColors.textSecondary,
  },
  presetChipTextSelected: {
    color: HolyGraceColors.navySecondary,
    fontWeight: '700',
  },

  // Notes
  inputNotes: {
    backgroundColor: HolyGraceColors.surfaceSubtle,
    borderWidth: 1,
    borderColor: HolyGraceColors.border,
    borderRadius: 12,
    padding: 12,
    fontSize: 13,
    color: HolyGraceColors.textPrimary,
    minHeight: 60,
    textAlignVertical: 'top',
  },

  // Upload Area
  uploadBox: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: HolyGraceColors.blueBorder,
    borderRadius: 14,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: HolyGraceColors.blueLight,
    marginBottom: 20,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as const } : {}),
  },
  uploadIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    ...Shadows.sm,
  },
  uploadBoxTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: HolyGraceColors.navySecondary,
  },
  uploadBoxSubtitle: {
    fontSize: 11,
    color: HolyGraceColors.textMuted,
    marginTop: 2,
  },
  previewContainer: {
    marginBottom: 20,
  },
  previewImage: {
    width: '100%',
    height: 180,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: HolyGraceColors.border,
  },
  removeImageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: HolyGraceColors.danger,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    alignSelf: 'center',
    marginTop: 8,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as const } : {}),
  },
  removeImageBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },

  // Submit Button
  submitBtn: {
    backgroundColor: HolyGraceColors.navySecondary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.md,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as const } : {}),
  },
  submitBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
});
