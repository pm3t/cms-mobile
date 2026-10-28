import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Modal,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { client, DEFAULT_TENANT_ID, getInitialTenantId, parseChurchId } from '../api/client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { HolyGraceColors, Shadows } from '../theme/colors';

export default function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const [mode, setMode] = useState<'LOGIN' | 'REGISTER' | 'FORGOT' | 'RESET'>('LOGIN');
  const [tenantId, setTenantId] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Scanner state
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [manualInput, setManualInput] = useState('');

  // Load remembered church on mount
  useEffect(() => {
    const loadSavedChurch = async () => {
      try {
        // Priority 1: If opened with URL parameter (e.g. ?ChurchId=gpdi-vmm)
        const fromUrl = getInitialTenantId();
        if (fromUrl && fromUrl.trim()) {
          const parsed = fromUrl.trim().toLowerCase();
          setTenantId(parsed);
          await AsyncStorage.setItem('mobile_tenant_id', parsed);
          return;
        }

        // Priority 2: Load remembered church from previous login / PWA install
        const saved = await AsyncStorage.getItem('mobile_tenant_id');
        if (saved && saved.trim()) {
          setTenantId(saved.trim());
        }
      } catch {}
    };
    loadSavedChurch();
  }, []);

  // Register Fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');

  // Reset Fields
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const openScanner = async () => {
    setError('');
    if (Platform.OS !== 'web' && !permission?.granted) {
      await requestPermission();
    }
    setScanned(false);
    setIsScannerOpen(true);
  };

  const handleBarcodeScanned = async ({ data }: { data: string }) => {
    if (!data || scanned) return;
    setScanned(true);
    const parsed = parseChurchId(data);
    if (parsed) {
      setTenantId(parsed);
      await AsyncStorage.setItem('mobile_tenant_id', parsed);
      setIsScannerOpen(false);
      setSuccess(`Kode gereja "${parsed}" berhasil terhubung!`);
      setTimeout(() => setSuccess(''), 4000);
    } else {
      setError('Format QR Code tidak dikenali sebagai kode gereja.');
    }
    setTimeout(() => setScanned(false), 1500);
  };

  const handleApplyManualInput = async () => {
    if (!manualInput.trim()) return;
    const parsed = parseChurchId(manualInput);
    if (parsed) {
      setTenantId(parsed);
      await AsyncStorage.setItem('mobile_tenant_id', parsed);
      setIsScannerOpen(false);
      setManualInput('');
      setSuccess(`Kode gereja "${parsed}" berhasil terhubung!`);
      setTimeout(() => setSuccess(''), 4000);
    } else {
      setError('Kode atau URL gereja tidak valid.');
    }
  };

  const handleLoginOrRegister = async () => {
    if (!tenantId) {
      setError('Church ID (Tenant ID) wajib diisi');
      return;
    }
    if (!email || !password) {
      setError('Email dan password wajib diisi');
      return;
    }
    if (mode === 'REGISTER' && !firstName) {
      setError('Nama Depan wajib diisi');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');
    try {
      await AsyncStorage.setItem('mobile_tenant_id', tenantId);

      if (mode === 'REGISTER') {
        const res = await client.post('/auth/register', {
          email,
          password,
          firstName,
          lastName: lastName || undefined,
          phone: phone || undefined,
        });
        await AsyncStorage.setItem('mobile_token', res.data.token);
        if (res.data.isClaimed) {
          alert('Selamat datang! Akun Anda berhasil terhubung langsung dengan data keanggotaan gereja.');
        }
        onLogin();
      } else {
        const res = await client.post('/auth/login', { email, password });
        await AsyncStorage.setItem('mobile_token', res.data.token);
        onLogin();
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!tenantId) {
      setError('Church ID (Tenant ID) wajib diisi');
      return;
    }
    if (!email) {
      setError('Email wajib diisi');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');
    try {
      await AsyncStorage.setItem('mobile_tenant_id', tenantId);
      const res = await client.post('/auth/forgot-password', { email });
      setSuccess(res.data.message || 'Kode OTP telah dikirim ke email Anda.');
      setMode('RESET');
    } catch (err: any) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!email || !otp || !newPassword) {
      setError('Semua kolom wajib diisi');
      return;
    }
    if (newPassword.length < 6) {
      setError('Password minimal 6 karakter');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const res = await client.post('/auth/reset-password', {
        email,
        otp,
        newPassword,
      });
      alert(res.data.message || 'Password berhasil direset!');
      setSuccess('');
      setMode('LOGIN');
      setPassword('');
      setOtp('');
      setNewPassword('');
    } catch (err: any) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  const changeMode = (newMode: typeof mode) => {
    setMode(newMode);
    setError('');
    setSuccess('');
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Brand Header */}
      <View style={styles.brandHeader}>
        <View style={styles.emblemBadge}>
          <Ionicons name="sparkles" size={26} color={HolyGraceColors.goldPrimary} />
        </View>
        <Text style={styles.brandTitle}>Eklesia Jemaat</Text>
        <Text style={styles.brandSubtitle}>
          Portal Layanan & Komunitas Iman Jemaat
        </Text>
      </View>

      {/* Main Form Box */}
      <View style={styles.formCard}>
        {/* Mode Switcher Tabs */}
        {(mode === 'LOGIN' || mode === 'REGISTER') && (
          <View style={styles.modeTabs}>
            <TouchableOpacity
              style={[styles.modeTab, mode === 'LOGIN' && styles.modeTabActive]}
              onPress={() => changeMode('LOGIN')}
              activeOpacity={0.7}
            >
              <Text style={[styles.modeTabText, mode === 'LOGIN' && styles.modeTabTextActive]}>
                Masuk
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modeTab, mode === 'REGISTER' && styles.modeTabActive]}
              onPress={() => changeMode('REGISTER')}
              activeOpacity={0.7}
            >
              <Text style={[styles.modeTabText, mode === 'REGISTER' && styles.modeTabTextActive]}>
                Daftar / Klaim
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Instructions */}
        {mode === 'FORGOT' && (
          <View style={styles.instructionBox}>
            <Ionicons name="mail-outline" size={18} color={HolyGraceColors.navySecondary} />
            <Text style={styles.instructionText}>
              Masukkan email terdaftar untuk menerima 6 digit kode OTP reset password.
            </Text>
          </View>
        )}
        {mode === 'REGISTER' && (
          <View style={styles.instructionBox}>
            <Ionicons name="sparkles" size={18} color={HolyGraceColors.goldPrimary} />
            <Text style={styles.instructionText}>
              Sudah terdata di gereja? Masukkan No. HP atau Email yang didaftarkan di gereja agar profil keanggotaan Anda otomatis terhubung tanpa membuat data ganda.
            </Text>
          </View>
        )}
        {mode === 'RESET' && (
          <View style={styles.instructionBox}>
            <Ionicons name="key-outline" size={18} color={HolyGraceColors.navySecondary} />
            <Text style={styles.instructionText}>
              Masukkan kode OTP yang telah dikirim ke email Anda beserta password baru.
            </Text>
          </View>
        )}

        {/* Error / Success Alert Banners */}
        {error ? (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle" size={16} color={HolyGraceColors.dangerText} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {success ? (
          <View style={styles.successBanner}>
            <Ionicons name="checkmark-circle" size={16} color={HolyGraceColors.successText} />
            <Text style={styles.successText}>{success}</Text>
          </View>
        ) : null}

        {/* Form Fields */}
        {mode !== 'RESET' && (
          <View style={styles.inputGroup}>
            <View style={styles.inputLabelRow}>
              <Text style={styles.inputLabel}>Kode Gereja (Church ID) *</Text>
              <TouchableOpacity
                style={styles.scanQRButton}
                onPress={openScanner}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="qr-code-outline"
                  size={13}
                  color={HolyGraceColors.goldPrimary}
                />
                <Text style={styles.scanQRButtonText}>Scan QR</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.inputWrapper}>
              <Ionicons
                name="business-outline"
                size={18}
                color={HolyGraceColors.textMuted}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.textInput}
                placeholder="Contoh: gpdi-vmm atau gbi-hos"
                placeholderTextColor={HolyGraceColors.textMuted}
                value={tenantId}
                onChangeText={setTenantId}
                autoCapitalize="none"
              />
              {tenantId ? (
                <TouchableOpacity
                  onPress={() => setTenantId('')}
                  style={styles.clearIconButton}
                >
                  <Ionicons
                    name="close-circle"
                    size={16}
                    color={HolyGraceColors.textMuted}
                  />
                </TouchableOpacity>
              ) : null}
            </View>
            <Text style={styles.helperText}>
              Scan QR di banner/warta gereja atau ketik kode gereja Anda.
            </Text>
          </View>
        )}

        {mode === 'REGISTER' && (
          <>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Nama Depan *</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="person-outline" size={18} color={HolyGraceColors.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder="Nama depan Anda"
                  placeholderTextColor={HolyGraceColors.textMuted}
                  value={firstName}
                  onChangeText={setFirstName}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Nama Belakang</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="person-outline" size={18} color={HolyGraceColors.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder="Nama belakang / marga"
                  placeholderTextColor={HolyGraceColors.textMuted}
                  value={lastName}
                  onChangeText={setLastName}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Nomor WhatsApp / HP</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="call-outline" size={18} color={HolyGraceColors.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder="08123456789"
                  placeholderTextColor={HolyGraceColors.textMuted}
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                />
              </View>
            </View>
          </>
        )}

        {/* Email or Phone Field */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>
            {mode === 'LOGIN' ? 'Email atau No. Handphone' : 'Alamat Email Terdaftar *'}
          </Text>
          <View style={styles.inputWrapper}>
            <Ionicons
              name={mode === 'LOGIN' ? 'person-circle-outline' : 'mail-outline'}
              size={18}
              color={HolyGraceColors.textMuted}
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.textInput}
              placeholder={mode === 'LOGIN' ? 'nama@email.com atau 0812...' : 'nama@email.com'}
              placeholderTextColor={HolyGraceColors.textMuted}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType={mode === 'LOGIN' ? 'default' : 'email-address'}
              editable={mode !== 'RESET'}
            />
          </View>
        </View>

        {/* Password Fields */}
        {(mode === 'LOGIN' || mode === 'REGISTER') && (
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Password</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="lock-closed-outline" size={18} color={HolyGraceColors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.textInput}
                placeholder="••••••••"
                placeholderTextColor={HolyGraceColors.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>
          </View>
        )}

        {mode === 'RESET' && (
          <>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Kode OTP (6 Digit)</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="key-outline" size={18} color={HolyGraceColors.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder="Contoh: 123456"
                  placeholderTextColor={HolyGraceColors.textMuted}
                  value={otp}
                  onChangeText={setOtp}
                  keyboardType="number-pad"
                  maxLength={6}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Password Baru</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="lock-closed-outline" size={18} color={HolyGraceColors.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder="Minimal 6 karakter"
                  placeholderTextColor={HolyGraceColors.textMuted}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry
                />
              </View>
            </View>
          </>
        )}

        {/* Action Button */}
        {mode === 'LOGIN' && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleLoginOrRegister}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <View style={styles.buttonInner}>
                <Text style={styles.buttonText}>Masuk ke Aplikasi</Text>
                <Ionicons name="arrow-forward" size={16} color="#fff" />
              </View>
            )}
          </TouchableOpacity>
        )}

        {mode === 'REGISTER' && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleLoginOrRegister}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <View style={styles.buttonInner}>
                <Text style={styles.buttonText}>Buat Akun Baru</Text>
                <Ionicons name="checkmark-circle-outline" size={16} color="#fff" />
              </View>
            )}
          </TouchableOpacity>
        )}

        {mode === 'FORGOT' && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleForgotPassword}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <View style={styles.buttonInner}>
                <Text style={styles.buttonText}>Kirim Kode OTP</Text>
                <Ionicons name="paper-plane-outline" size={16} color="#fff" />
              </View>
            )}
          </TouchableOpacity>
        )}

        {mode === 'RESET' && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleResetPassword}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <View style={styles.buttonInner}>
                <Text style={styles.buttonText}>Simpan Password Baru</Text>
                <Ionicons name="save-outline" size={16} color="#fff" />
              </View>
            )}
          </TouchableOpacity>
        )}

        {/* Links */}
        {mode === 'LOGIN' && (
          <TouchableOpacity
            style={styles.forgotLink}
            onPress={() => changeMode('FORGOT')}
            activeOpacity={0.7}
          >
            <Text style={styles.forgotLinkText}>Lupa password akun Anda?</Text>
          </TouchableOpacity>
        )}

        {(mode === 'FORGOT' || mode === 'RESET') && (
          <TouchableOpacity
            style={styles.backLink}
            onPress={() => changeMode('LOGIN')}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={14} color={HolyGraceColors.navySecondary} />
            <Text style={styles.backLinkText}>Kembali ke Halaman Masuk</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* QR Code Scanner Modal */}
      <Modal
        visible={isScannerOpen}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setIsScannerOpen(false)}
      >
        <View style={styles.scannerContainer}>
          {/* Top Bar */}
          <View style={styles.scannerHeader}>
            <TouchableOpacity
              onPress={() => setIsScannerOpen(false)}
              style={styles.scannerCloseButton}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <View style={styles.scannerTitleContainer}>
              <Text style={styles.scannerTitle}>Scan QR Code Gereja</Text>
              <Text style={styles.scannerSubtitle}>
                Arahkan kamera ke QR Code di banner atau warta gereja
              </Text>
            </View>
          </View>

          {/* Camera View or Fallback */}
          <View style={styles.scannerCameraContainer}>
            {Platform.OS !== 'web' && permission?.granted ? (
              <CameraView
                style={StyleSheet.absoluteFillObject}
                barcodeScannerSettings={{
                  barcodeTypes: ['qr'],
                }}
                onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
              />
            ) : (
              <View style={styles.noCameraFallback}>
                <Ionicons
                  name="qr-code-outline"
                  size={52}
                  color={HolyGraceColors.goldAccent}
                />
                <Text style={styles.noCameraTitle}>
                  {Platform.OS === 'web'
                    ? 'Kamera Web / Input Manual'
                    : 'Izin Kamera Diperlukan'}
                </Text>
                <Text style={styles.noCameraDesc}>
                  {Platform.OS === 'web'
                    ? 'Di browser web, Anda dapat menempelkan URL atau kode QR gereja pada kolom di bawah.'
                    : 'Izinkan akses kamera untuk memindai QR code gereja secara otomatis.'}
                </Text>
                {Platform.OS !== 'web' && !permission?.granted && (
                  <TouchableOpacity
                    style={styles.permissionButton}
                    onPress={requestPermission}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name="shield-checkmark-outline"
                      size={16}
                      color="#FFFFFF"
                    />
                    <Text style={styles.permissionButtonText}>Izinkan Kamera</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* Target Reticle Overlay */}
            <View style={styles.reticleOverlay} pointerEvents="none">
              <View style={styles.reticleBox}>
                <View style={[styles.corner, styles.topLeft]} />
                <View style={[styles.corner, styles.topRight]} />
                <View style={[styles.corner, styles.bottomLeft]} />
                <View style={[styles.corner, styles.bottomRight]} />
              </View>
            </View>
          </View>

          {/* Manual Input / Paste Section in Scanner */}
          <View style={styles.scannerFooter}>
            <Text style={styles.scannerFooterLabel}>
              Atau tempel Link / URL / Kode QR Gereja:
            </Text>
            <View style={styles.manualInputRow}>
              <TextInput
                style={styles.manualTextInput}
                placeholder="Contoh: https://app.eklesia.id?ChurchId=gpdi-vmm"
                placeholderTextColor="#94A3B8"
                value={manualInput}
                onChangeText={setManualInput}
                autoCapitalize="none"
              />
              <TouchableOpacity
                style={styles.manualApplyButton}
                onPress={handleApplyManualInput}
                activeOpacity={0.8}
              >
                <Text style={styles.manualApplyButtonText}>Terapkan</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: HolyGraceColors.background,
  },

  // Brand Header
  brandHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  emblemBadge: {
    width: 60,
    height: 60,
    borderRadius: 20,
    backgroundColor: HolyGraceColors.goldLight,
    borderWidth: 1.5,
    borderColor: HolyGraceColors.goldBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    ...Shadows.sm,
  },
  brandTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: HolyGraceColors.navyPrimary,
    letterSpacing: -0.4,
  },
  brandSubtitle: {
    fontSize: 13,
    color: HolyGraceColors.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },

  // Form Card
  formCard: {
    backgroundColor: HolyGraceColors.surface,
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
    borderColor: HolyGraceColors.border,
    ...Shadows.card,
  },

  // Mode Tabs
  modeTabs: {
    flexDirection: 'row',
    backgroundColor: HolyGraceColors.surfaceSubtle,
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  modeTab: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    borderRadius: 10,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as const } : {}),
  },
  modeTabActive: {
    backgroundColor: HolyGraceColors.surface,
    ...Shadows.sm,
  },
  modeTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: HolyGraceColors.textMuted,
  },
  modeTabTextActive: {
    color: HolyGraceColors.navyPrimary,
    fontWeight: '800',
  },

  // Instructions Box
  instructionBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: HolyGraceColors.blueLight,
    borderWidth: 1,
    borderColor: HolyGraceColors.blueBorder,
    padding: 12,
    borderRadius: 12,
    marginBottom: 18,
  },
  instructionText: {
    fontSize: 12,
    color: HolyGraceColors.navySecondary,
    lineHeight: 17,
    flex: 1,
  },

  // Alert Banners
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: HolyGraceColors.dangerLight,
    borderWidth: 1,
    borderColor: HolyGraceColors.dangerBorder,
    padding: 10,
    borderRadius: 10,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 12,
    color: HolyGraceColors.dangerText,
    fontWeight: '600',
    flex: 1,
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: HolyGraceColors.successLight,
    borderWidth: 1,
    borderColor: HolyGraceColors.successBorder,
    padding: 10,
    borderRadius: 10,
    marginBottom: 16,
  },
  successText: {
    fontSize: 12,
    color: HolyGraceColors.successText,
    fontWeight: '600',
    flex: 1,
  },

  // Inputs
  inputGroup: {
    marginBottom: 14,
  },
  inputLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: HolyGraceColors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  scanQRButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: HolyGraceColors.goldLight,
    borderWidth: 1,
    borderColor: HolyGraceColors.goldBorder,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as const } : {}),
  },
  scanQRButtonText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: HolyGraceColors.goldPrimary,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: HolyGraceColors.surfaceSubtle,
    borderWidth: 1,
    borderColor: HolyGraceColors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  clearIconButton: {
    padding: 4,
    marginLeft: 4,
  },
  helperText: {
    fontSize: 10.5,
    color: HolyGraceColors.textMuted,
    marginTop: 4,
    marginLeft: 2,
  },
  inputIcon: {
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 14,
    color: HolyGraceColors.textPrimary,
  },

  // Action Button
  actionButton: {
    backgroundColor: HolyGraceColors.navySecondary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    ...Shadows.md,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as const } : {}),
  },
  buttonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 14.5,
    fontWeight: '800',
    letterSpacing: 0.2,
  },

  // Links
  forgotLink: {
    marginTop: 16,
    alignItems: 'center',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as const } : {}),
  },
  forgotLinkText: {
    color: HolyGraceColors.navySecondary,
    fontSize: 12.5,
    fontWeight: '600',
  },
  backLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 18,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as const } : {}),
  },
  backLinkText: {
    color: HolyGraceColors.navySecondary,
    fontSize: 13,
    fontWeight: '700',
  },

  // QR Scanner Modal
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
