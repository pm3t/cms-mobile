import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView, Alert } from 'react-native';
import { client } from '../api/client';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const [mode, setMode] = useState<'LOGIN' | 'REGISTER' | 'FORGOT' | 'RESET'>('LOGIN');
  const [tenantId, setTenantId] = useState('gbi-hos');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
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
        newPassword
      });
      Alert.alert('Sukses', res.data.message || 'Password berhasil direset!');
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
      <Text style={styles.title}>Welcome to Eklesia</Text>
      
      {mode === 'LOGIN' && (
        <Text style={styles.subtitle}>Sign in to access your member portal</Text>
      )}
      {mode === 'REGISTER' && (
        <Text style={styles.subtitle}>Claim your account or register</Text>
      )}
      {mode === 'FORGOT' && (
        <Text style={styles.subtitle}>Masukkan email Anda untuk menerima kode OTP reset password</Text>
      )}
      {mode === 'RESET' && (
        <Text style={styles.subtitle}>Masukkan kode OTP yang dikirim ke email Anda untuk mengubah password</Text>
      )}

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {success ? <Text style={styles.success}>{success}</Text> : null}

      {/* Tenant / Church ID is needed for Login, Register, and Forgot Password */}
      {mode !== 'RESET' && (
        <TextInput
          style={styles.input}
          placeholder="Church ID (e.g. gbi-hos)"
          value={tenantId}
          onChangeText={setTenantId}
          autoCapitalize="none"
        />
      )}

      {mode === 'REGISTER' && (
        <>
          <TextInput
            style={styles.input}
            placeholder="Nama Depan *"
            value={firstName}
            onChangeText={setFirstName}
          />
          <TextInput
            style={styles.input}
            placeholder="Nama Belakang"
            value={lastName}
            onChangeText={setLastName}
          />
          <TextInput
            style={styles.input}
            placeholder="Nomor HP"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />
        </>
      )}

      {/* Email input is needed in all modes */}
      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        editable={mode !== 'RESET'} // prevent changing email during OTP verification
      />
      
      {/* Password inputs */}
      {(mode === 'LOGIN' || mode === 'REGISTER') && (
        <TextInput
          style={styles.input}
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
      )}

      {mode === 'RESET' && (
        <>
          <TextInput
            style={styles.input}
            placeholder="Kode OTP (6 Digit)"
            value={otp}
            onChangeText={setOtp}
            keyboardType="number-pad"
            maxLength={6}
          />
          <TextInput
            style={styles.input}
            placeholder="Password Baru"
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry
          />
        </>
      )}

      {/* Action Buttons */}
      {mode === 'LOGIN' && (
        <TouchableOpacity style={styles.button} onPress={handleLoginOrRegister} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Login</Text>}
        </TouchableOpacity>
      )}

      {mode === 'REGISTER' && (
        <TouchableOpacity style={styles.button} onPress={handleLoginOrRegister} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Klaim / Register</Text>}
        </TouchableOpacity>
      )}

      {mode === 'FORGOT' && (
        <TouchableOpacity style={styles.button} onPress={handleForgotPassword} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Kirim Kode OTP</Text>}
        </TouchableOpacity>
      )}

      {mode === 'RESET' && (
        <TouchableOpacity style={styles.button} onPress={handleResetPassword} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Reset Password</Text>}
        </TouchableOpacity>
      )}

      {/* Forgot Password Link inside Login Mode */}
      {mode === 'LOGIN' && (
        <TouchableOpacity style={styles.forgotLink} onPress={() => changeMode('FORGOT')}>
          <Text style={styles.forgotLinkText}>Lupa Password?</Text>
        </TouchableOpacity>
      )}

      {/* Bottom Switch Links */}
      {mode === 'LOGIN' && (
        <TouchableOpacity style={styles.toggleLink} onPress={() => changeMode('REGISTER')}>
          <Text style={styles.toggleLinkText}>Belum punya password? Klaim Akun / Register</Text>
        </TouchableOpacity>
      )}

      {mode === 'REGISTER' && (
        <TouchableOpacity style={styles.toggleLink} onPress={() => changeMode('LOGIN')}>
          <Text style={styles.toggleLinkText}>Sudah punya akun? Login di sini</Text>
        </TouchableOpacity>
      )}

      {(mode === 'FORGOT' || mode === 'RESET') && (
        <TouchableOpacity style={styles.toggleLink} onPress={() => changeMode('LOGIN')}>
          <Text style={styles.toggleLinkText}>Kembali ke halaman Login</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: 'center', padding: 24, backgroundColor: '#f8fafc' },
  title: { fontSize: 28, fontWeight: 'bold', color: '#1e293b', marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 16, color: '#64748b', marginBottom: 32, textAlign: 'center' },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, padding: 16, marginBottom: 16, fontSize: 16 },
  button: { backgroundColor: '#3b82f6', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 8 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  error: { color: '#ef4444', marginBottom: 16, textAlign: 'center', fontWeight: '600' },
  success: { color: '#22c55e', marginBottom: 16, textAlign: 'center', fontWeight: '600' },
  forgotLink: { marginTop: 16, alignItems: 'center' },
  forgotLinkText: { color: '#64748b', fontSize: 14, fontWeight: '600', textDecorationLine: 'underline' },
  toggleLink: { marginTop: 20, alignItems: 'center' },
  toggleLinkText: { color: '#3b82f6', fontSize: 14, fontWeight: '600' }
});
