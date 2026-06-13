import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  ActivityIndicator, 
  RefreshControl, 
  Modal, 
  TextInput, 
  Alert,
  KeyboardAvoidingView,
  Platform,
  Linking,
  ScrollView,
  Image
} from 'react-native';
import { client } from '../api/client';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

interface SacramentRequestScreenProps {
  onClose?: () => void;
}

export default function SacramentRequestScreen({ onClose }: SacramentRequestScreenProps) {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Modal State for New Request
  const [isFormOpen, setIsFormOpen] = useState(false);
  
  // New Request Form Fields
  const [type, setType] = useState<'BAPTISM' | 'MARRIAGE' | 'CONFIRMATION' | 'MEMBERSHIP' | 'OTHER'>('BAPTISM');
  const [pastorName, setPastorName] = useState('');
  const [date, setDate] = useState('');
  const [location, setLocation] = useState('');
  const [requirements, setRequirements] = useState<any[]>([]); // Array of uploaded files: { url, name, type, size }

  const fetchData = async () => {
    try {
      const res = await client.get('/sacrament-requests');
      setRequests(res.data || []);
    } catch (err: any) {
      console.log('Error fetching sacrament requests:', err.message);
      Alert.alert('Gagal Memuat Data', 'Tidak dapat mengambil data permohonan sakramen.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const pickAndUploadDocument = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      return Alert.alert('Izin Ditolak', 'Aplikasi memerlukan akses galeri untuk mengunggah dokumen persyaratan.');
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
    });

    if (result.canceled) return;

    setUploading(true);
    try {
      const imageUri = result.assets[0].uri;
      const filename = imageUri.split('/').pop() || 'document.jpg';

      const formData = new FormData();
      if (Platform.OS === 'web') {
        const response = await fetch(imageUri);
        const blob = await response.blob();
        formData.append('file', blob, filename);
      } else {
        const match = /\.(\w+)$/.exec(filename);
        const fileType = match ? `image/${match[1]}` : `image/jpeg`;
        formData.append('file', {
          uri: imageUri,
          name: filename,
          type: fileType
        } as any);
      }

      const res = await client.post('/sacrament-requests/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setRequirements(prev => [...prev, {
        url: res.data.url,
        name: res.data.name || filename,
        type: res.data.type || fileType,
        size: res.data.size || 0
      }]);

      Alert.alert('Sukses', 'Persyaratan berhasil diunggah!');
    } catch (err: any) {
      Alert.alert('Gagal Mengunggah', err.response?.data?.error || err.message || 'Terjadi kesalahan saat mengunggah.');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveRequirement = (index: number) => {
    setRequirements(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmitRequest = async () => {
    if (requirements.length === 0) {
      return Alert.alert('Dokumen Wajib', 'Silakan unggah minimal 1 dokumen persyaratan (KTP, Akta Lahir, dll.).');
    }

    setSubmitting(true);
    try {
      await client.post('/sacrament-requests', {
        type,
        pastorName: pastorName.trim(),
        date: date.trim() || undefined,
        location: location.trim(),
        requirements
      });

      Alert.alert('Sukses', 'Permohonan sakramen berhasil diajukan. Mohon tunggu verifikasi berkas oleh admin.');
      setIsFormOpen(false);
      
      // Reset form
      setType('BAPTISM');
      setPastorName('');
      setDate('');
      setLocation('');
      setRequirements([]);

      fetchData();
    } catch (err: any) {
      Alert.alert('Gagal Mengajukan', err.response?.data?.error || err.message || 'Terjadi kesalahan.');
    } finally {
      setSubmitting(false);
    }
  };

  const getSacramentLabel = (typeCode: string) => {
    switch (typeCode) {
      case 'BAPTISM': return 'Baptis Kudus';
      case 'MARRIAGE': return 'Pemberkatan Pernikahan';
      case 'CONFIRMATION': return 'Sidi / Penyerahan Anak';
      case 'MEMBERSHIP': return 'Surat Pindah / Keanggotaan';
      case 'OTHER': return 'Lain-lain';
      default: return typeCode;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED': 
        return { bg: '#d1fae5', text: '#065f46', label: 'Disetujui', icon: 'checkmark-circle' as const };
      case 'REJECTED': 
        return { bg: '#fee2e2', text: '#991b1b', label: 'Ditolak', icon: 'close-circle' as const };
      default: 
        return { bg: '#fef3c7', text: '#92400e', label: 'Pending', icon: 'time-outline' as const };
    }
  };

  const handleDownloadCertificate = async (fileUrl: string) => {
    try {
      // Resolve full server URL if path is relative
      const fullUrl = fileUrl.startsWith('http') 
        ? fileUrl 
        : `${client.defaults.baseURL?.replace('/api/mobile', '')}${fileUrl}`;
      await Linking.openURL(fullUrl);
    } catch (err) {
      Alert.alert('Gagal Membuka File', 'Tidak dapat membuka sertifikat digital.');
    }
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={styles.headerRow}>
        {onClose && (
          <TouchableOpacity style={styles.backButton} onPress={onClose}>
            <Ionicons name="arrow-back" size={24} color="#1e293b" />
          </TouchableOpacity>
        )}
        <Text style={styles.header}>Layanan Sakramen</Text>
      </View>

      <Text style={styles.introText}>
        Ajukan layanan administrasi gereja seperti Baptisan, Pernikahan, atau Sidi secara paperless dengan mengunggah dokumen persyaratan.
      </Text>

      {/* Main Action Button */}
      <TouchableOpacity 
        style={styles.newRequestBtn}
        onPress={() => setIsFormOpen(true)}
      >
        <Ionicons name="add" size={20} color="#fff" />
        <Text style={styles.newRequestBtnText}>Ajukan Layanan Baru</Text>
      </TouchableOpacity>

      {/* Requests List */}
      <FlatList
        data={requests}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={['#6366f1']} />
        }
        renderItem={({ item }) => {
          const badge = getStatusBadge(item.status);
          return (
            <View style={styles.requestCard}>
              <View style={styles.cardHeader}>
                <View>
                  <Text style={styles.requestType}>{getSacramentLabel(item.type)}</Text>
                  <Text style={styles.requestDate}>Diajukan: {new Date(item.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
                  <Ionicons name={badge.icon} size={14} color={badge.text} style={{ marginRight: 4 }} />
                  <Text style={[styles.statusText, { color: badge.text }]}>{badge.label}</Text>
                </View>
              </View>

              <View style={styles.cardBody}>
                {item.pastorName ? (
                  <Text style={styles.detailText}>Pastor: <Text style={styles.detailVal}>{item.pastorName}</Text></Text>
                ) : null}
                {item.date ? (
                  <Text style={styles.detailText}>Tanggal Rencana: <Text style={styles.detailVal}>{new Date(item.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</Text></Text>
                ) : null}
                {item.location ? (
                  <Text style={styles.detailText}>Lokasi: <Text style={styles.detailVal}>{item.location}</Text></Text>
                ) : null}
                
                {item.notes ? (
                  <View style={styles.notesBox}>
                    <Text style={styles.notesTitle}>{item.status === 'REJECTED' ? 'Catatan Penolakan:' : 'Catatan Admin:'}</Text>
                    <Text style={styles.notesText}>{item.notes}</Text>
                  </View>
                ) : null}
              </View>

              {item.status === 'APPROVED' && item.certificate?.fileUrl ? (
                <TouchableOpacity 
                  style={styles.downloadBtn}
                  onPress={() => handleDownloadCertificate(item.certificate.fileUrl)}
                >
                  <Ionicons name="download" size={16} color="#fff" style={{ marginRight: 6 }} />
                  <Text style={styles.downloadBtnText}>Unduh Sertifikat Digital</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="document-text-outline" size={64} color="#cbd5e1" />
            <Text style={styles.emptyText}>Belum ada riwayat pengajuan layanan sakramen.</Text>
          </View>
        }
        contentContainerStyle={{ paddingBottom: 24 }}
      />

      {/* New Request Form Modal */}
      <Modal
        visible={isFormOpen}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsFormOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Ajukan Sakramen / Dokumen</Text>
              <TouchableOpacity onPress={() => setIsFormOpen(false)}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
              <Text style={styles.label}>Jenis Layanan / Sakramen</Text>
              <View style={styles.typeSelectorRow}>
                {(['BAPTISM', 'MARRIAGE', 'CONFIRMATION', 'MEMBERSHIP', 'OTHER'] as const).map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[styles.typeTab, type === t && styles.typeTabActive]}
                    onPress={() => setType(t)}
                  >
                    <Text style={[styles.typeTabText, type === t && styles.typeTabTextActive]}>
                      {t === 'BAPTISM' ? 'Baptis' : t === 'MARRIAGE' ? 'Nikah' : t === 'CONFIRMATION' ? 'Sidi' : t === 'MEMBERSHIP' ? 'Pindah' : 'Lainnya'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Nama Pastor / Pendeta (Opsional)</Text>
              <TextInput
                style={styles.input}
                placeholder="Pdt. Yohanes, M.Th"
                placeholderTextColor="#94a3b8"
                value={pastorName}
                onChangeText={setPastorName}
              />

              <Text style={styles.label}>Tanggal Rencana (YYYY-MM-DD) (Opsional)</Text>
              <TextInput
                style={styles.input}
                placeholder="Contoh: 2026-08-20"
                placeholderTextColor="#94a3b8"
                value={date}
                onChangeText={setDate}
              />

              <Text style={styles.label}>Rencana Tempat / Lokasi (Opsional)</Text>
              <TextInput
                style={styles.input}
                placeholder="Gedung Ibadah Utama / Rumah"
                placeholderTextColor="#94a3b8"
                value={location}
                onChangeText={setLocation}
              />

              <Text style={styles.label}>Unggah Persyaratan (Min. 1 Foto KTP/Akta/KK)</Text>
              {requirements.length > 0 ? (
                <View style={styles.requirementsList}>
                  {requirements.map((req, idx) => (
                    <View key={idx} style={styles.requirementItem}>
                      <Ionicons name="image" size={20} color="#6366f1" />
                      <Text style={styles.requirementName} numberOfLines={1}>{req.name}</Text>
                      <TouchableOpacity onPress={() => handleRemoveRequirement(idx)}>
                        <Ionicons name="trash-outline" size={18} color="#ef4444" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              ) : null}

              {uploading ? (
                <View style={styles.uploadingBox}>
                  <ActivityIndicator size="small" color="#6366f1" />
                  <Text style={styles.uploadingText}>Mengunggah berkas...</Text>
                </View>
              ) : (
                <TouchableOpacity style={styles.uploadBox} onPress={pickAndUploadDocument}>
                  <Ionicons name="cloud-upload-outline" size={24} color="#6366f1" />
                  <Text style={styles.uploadBoxText}>+ Unggah Persyaratan (Gambar)</Text>
                </TouchableOpacity>
              )}

              <View style={styles.modalActions}>
                <TouchableOpacity 
                  style={styles.cancelBtn} 
                  onPress={() => setIsFormOpen(false)}
                  disabled={submitting}
                >
                  <Text style={styles.cancelBtnText}>Batal</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.submitBtn} 
                  onPress={handleSubmitRequest}
                  disabled={submitting}
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.submitBtnText}>Kirim Pengajuan</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', padding: 16 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 8, 
    marginTop: 40 
  },
  backButton: { marginRight: 12, padding: 4 },
  header: { fontSize: 24, fontWeight: 'bold', color: '#1e293b' },
  introText: { 
    fontSize: 14, 
    color: '#64748b', 
    lineHeight: 20, 
    marginBottom: 16 
  },
  newRequestBtn: {
    backgroundColor: '#6366f1',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 14,
    marginBottom: 20,
    gap: 6,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3
  },
  newRequestBtnText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },

  // List Cards
  requestCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 5,
    elevation: 2
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingBottom: 10,
    marginBottom: 10
  },
  requestType: { fontSize: 16, fontWeight: 'bold', color: '#0f172a' },
  requestDate: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20
  },
  statusText: { fontSize: 12, fontWeight: 'bold' },
  cardBody: { marginBottom: 12, gap: 4 },
  detailText: { fontSize: 13, color: '#64748b' },
  detailVal: { color: '#334155', fontWeight: '500' },
  notesBox: {
    backgroundColor: '#f8fafc',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    marginTop: 8
  },
  notesTitle: { fontSize: 11, fontWeight: 'bold', color: '#64748b', marginBottom: 2 },
  notesText: { fontSize: 12, color: '#475569', lineHeight: 16 },
  downloadBtn: {
    backgroundColor: '#10b981',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 4
  },
  downloadBtnText: { color: '#fff', fontSize: 13, fontWeight: 'bold' },

  // Empty State
  emptyContainer: {
    alignItems: 'center',
    marginTop: 48,
    paddingHorizontal: 32
  },
  emptyText: {
    color: '#94a3b8',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 12
  },

  // Modal styling
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end'
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '85%'
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20
  },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#0f172a' },
  label: { fontSize: 13, fontWeight: 'bold', color: '#475569', marginBottom: 6, marginTop: 12 },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: '#0f172a'
  },
  typeSelectorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10
  },
  typeTab: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  typeTabActive: {
    backgroundColor: '#e0e7ff',
    borderColor: '#c7d2fe'
  },
  typeTabText: { fontSize: 12, fontWeight: 'bold', color: '#64748b' },
  typeTabTextActive: { color: '#4338ca' },

  // Upload Area
  uploadBox: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#cbd5e1',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
    marginVertical: 10,
    gap: 6
  },
  uploadBoxText: { fontSize: 13, color: '#6366f1', fontWeight: 'bold' },
  uploadingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    gap: 8,
    marginVertical: 10
  },
  uploadingText: { fontSize: 13, color: '#6366f1' },
  requirementsList: { gap: 8, marginVertical: 6 },
  requirementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    padding: 10
  },
  requirementName: { flex: 1, fontSize: 13, color: '#334155', marginLeft: 8 },

  modalActions: { flexDirection: 'row', gap: 12, marginTop: 20 },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center'
  },
  cancelBtnText: { color: '#64748b', fontWeight: 'bold', fontSize: 14 },
  submitBtn: {
    flex: 1,
    backgroundColor: '#6366f1',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center'
  },
  submitBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 14 }
});
