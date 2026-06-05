import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Image, ScrollView } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { client } from '../api/client';

export default function GivingScreen() {
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const pickImage = async () => {
    // Request media library permissions
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      return Alert.alert('Izin Ditolak', 'Aplikasi memerlukan akses galeri untuk mengunggah bukti transfer.');
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  const handleGive = async () => {
    if (!amount || isNaN(Number(amount))) {
      return Alert.alert('Error', 'Silakan masukkan jumlah nominal yang valid');
    }
    
    setLoading(true);
    try {
      let proofUrl = null;

      // 1. Upload receipt if exists
      if (image) {
        const filename = image.split('/').pop() || 'receipt.jpg';
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : `image/jpeg`;

        const formData = new FormData();
        formData.append('file', {
          uri: image,
          name: filename,
          type
        } as any);

        const uploadRes = await client.post('/giving/upload', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
        proofUrl = uploadRes.data.imageUrl;
      }

      // 2. Submit transaction
      await client.post('/giving', { 
        amount: Number(amount), 
        description, 
        proofUrl 
      });

      Alert.alert('Sukses', 'Persembahan berhasil dicatat dengan bukti transfer. Menunggu verifikasi admin...');
      setAmount('');
      setDescription('');
      setImage(null);
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Text style={styles.header}>Digital Giving</Text>
      <Text style={styles.subtitle}>Sow your seed digitally. Quick, secure, and easy.</Text>

      <View style={styles.card}>
        <Text style={styles.label}>Amount (Rp)</Text>
        <TextInput
          style={styles.input}
          placeholder="0"
          value={amount}
          onChangeText={setAmount}
          keyboardType="numeric"
        />

        <Text style={styles.label}>Notes (Optional)</Text>
        <TextInput
          style={styles.input}
          placeholder="Tithe, Offering, etc."
          value={description}
          onChangeText={setDescription}
        />

        <Text style={styles.label}>Bukti Transfer</Text>
        {image ? (
          <View>
            <Image source={{ uri: image }} style={styles.previewImage} resizeMode="cover" />
            <TouchableOpacity style={styles.removeButton} onPress={() => setImage(null)}>
              <Text style={styles.removeButtonText}>Hapus Gambar</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.uploadBox} onPress={pickImage}>
            <Text style={styles.uploadBoxText}>+ Pilih Bukti Transfer (Gambar)</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.button} onPress={handleGive} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Give Now</Text>}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  contentContainer: { padding: 16, paddingBottom: 40 },
  header: { fontSize: 24, fontWeight: 'bold', color: '#1e293b', marginBottom: 8, marginTop: 40 },
  subtitle: { fontSize: 14, color: '#64748b', marginBottom: 24 },
  card: { backgroundColor: '#fff', padding: 20, borderRadius: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 3 },
  label: { fontSize: 14, fontWeight: 'bold', color: '#475569', marginBottom: 8 },
  input: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, padding: 16, marginBottom: 16, fontSize: 16 },
  uploadBox: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#cbd5e1',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
    marginBottom: 20,
  },
  uploadBoxText: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  previewImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginBottom: 8,
  },
  removeButton: {
    backgroundColor: '#ef4444',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignSelf: 'center',
    marginBottom: 20,
  },
  removeButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  button: { backgroundColor: '#10b981', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 8 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});
