import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { client, DEFAULT_TENANT_ID, getInitialTenantId } from '../api/client';
import ChurchQRScannerModal from '../components/ChurchQRScannerModal';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { HolyGraceColors, Shadows } from '../theme/colors';

export default function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const [mode, setMode] = useState<'LOGIN' | 'REGISTER' | 'FORGOT' | 'RESET'>('LOGIN');
  const [tenantId, setTenantId] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Scanner state
  const [isScannerOpen, setIsScannerOpen] = useState(false);

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

  const openScanner = () => {
    setError('');
    setIsScannerOpen(true);
  };

  const handleChurchScanned = async (parsed: string) => {
    setTenantId(parsed);
    await AsyncStorage.setItem('mobile_tenant_id', parsed);
    setIsScannerOpen(false);
    setSuccess(`Kode gereja "${parsed}" berhasil terhubung!`);
    setTimeout(() => setSuccess(''), 4000);
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
      <ChurchQRScannerModal
        visible={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanned={handleChurchScanned}
      />
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
});
