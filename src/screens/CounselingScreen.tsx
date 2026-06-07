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
  ScrollView
} from 'react-native';
import { client } from '../api/client';
import { Ionicons } from '@expo/vector-icons';

interface CounselingScreenProps {
  onClose?: () => void;
}

export default function CounselingScreen({ onClose }: CounselingScreenProps) {
  const [counselings, setCounselings] = useState<any[]>([]);
  const [counselors, setCounselors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);

  // Form states
  const [title, setTitle] = useState('');
  const [issueDescription, setIssueDescription] = useState('');
  const [selectedCounselorId, setSelectedCounselorId] = useState('');
  const [dateStr, setDateStr] = useState(''); // YYYY-MM-DD
  const [timeStr, setTimeStr] = useState(''); // HH:MM
  const [showCounselorDropdown, setShowCounselorDropdown] = useState(false);

  const fetchData = async () => {
    try {
      const [counselingRes, counselorsRes] = await Promise.all([
        client.get('/counseling'),
        client.get('/counselors')
      ]);
      setCounselings(counselingRes.data || []);
      setCounselors(counselorsRes.data || []);
    } catch (err: any) {
      console.log('Error fetching counseling data:', err.message);
      Alert.alert('Gagal Memuat Data', 'Tidak dapat mengambil jadwal konseling atau daftar konselor.');
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

  const handleOpenBookModal = () => {
    setTitle('');
    setIssueDescription('');
    setSelectedCounselorId('');
    // Pre-populate with today's date formatted as YYYY-MM-DD
    const today = new Date();
    const formattedDate = today.toISOString().split('T')[0];
    setDateStr(formattedDate);
    setTimeStr('10:00');
    setIsBookModalOpen(true);
  };

  const handleBookSession = async () => {
    if (!title.trim() || !issueDescription.trim() || !dateStr.trim() || !timeStr.trim()) {
      Alert.alert('Form Belum Lengkap', 'Harap isi semua kolom wajib.');
      return;
    }

    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(dateStr)) {
      Alert.alert('Format Tanggal Salah', 'Gunakan format YYYY-MM-DD (contoh: 2026-06-15).');
      return;
    }

    // Validate time format (HH:MM)
    const timeRegex = /^\d{2}:\d{2}$/;
    if (!timeRegex.test(timeStr)) {
      Alert.alert('Format Waktu Salah', 'Gunakan format HH:MM (contoh: 14:30).');
      return;
    }

    const counselingDate = `${dateStr}T${timeStr}:00`;

    setSubmitting(true);
    try {
      await client.post('/counseling', {
        title: title.trim(),
        issueDescription: issueDescription.trim(),
        counselorId: selectedCounselorId || null,
        counselingDate
      });

      Alert.alert('Berhasil', 'Permohonan bimbingan/konseling Anda telah diajukan.');
      setIsBookModalOpen(false);
      handleRefresh();
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error || err.message || 'Gagal mengajukan konseling');
    } finally {
      setSubmitting(false);
    }
  };

  const getSelectedCounselorName = () => {
    const counselor = counselors.find(c => c.id === selectedCounselorId);
    return counselor ? counselor.name : 'Pilih konselor (opsional)';
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    const d = new Date(dateString);
    return d.toLocaleDateString('id-ID', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    }) + ' pukul ' + d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerRow}>
        {onClose && (
          <TouchableOpacity style={styles.backButton} onPress={onClose}>
            <Ionicons name="arrow-back" size={24} color="#1e293b" />
          </TouchableOpacity>
        )}
        <Text style={styles.header}>Konseling Pastoral</Text>
      </View>

      <Text style={styles.introText}>
        Gereja siap mendampingi Anda melewati setiap pergumulan hidup. Jadwalkan bimbingan rohani atau konseling secara pribadi.
      </Text>

      {/* Booking History List */}
      <FlatList
        data={counselings}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={['#6366f1']} />
        }
        renderItem={({ item }) => (
          <View style={styles.counselCard}>
            <View style={styles.counselHeader}>
              <Text style={styles.counselTitle}>{item.title}</Text>
              <View style={styles.privacyBadge}>
                <Ionicons name="lock-closed" size={10} color="#0f766e" />
                <Text style={styles.privacyText}>Pribadi</Text>
              </View>
            </View>

            <Text style={styles.counselDate}>
              📅 {formatDate(item.counselingDate)}
            </Text>

            <Text style={styles.counselorName}>
              🤝 Konselor: {item.counselorName}
            </Text>

            <View style={styles.issueBox}>
              <Text style={styles.issueLabel}>Pergumulan/Kebutuhan:</Text>
              <Text style={styles.issueText}>{item.issueDescription}</Text>
            </View>

            {item.notes && item.notes !== 'Sesi dijadwalkan via mobile jemaat' && (
              <View style={styles.notesBox}>
                <Text style={styles.notesLabel}>Catatan Konselor:</Text>
                <Text style={styles.notesText}>{item.notes}</Text>
              </View>
            )}
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="chatbubble-ellipses-outline" size={64} color="#94a3b8" />
            <Text style={styles.emptyText}>Belum ada permohonan bimbingan/konseling saat ini.</Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={handleOpenBookModal}>
              <Text style={styles.emptyBtnText}>Buat Permohonan Baru</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {/* Floating Action Button */}
      {counselings.length > 0 && (
        <TouchableOpacity style={styles.fab} onPress={handleOpenBookModal}>
          <Ionicons name="add" size={30} color="#fff" />
        </TouchableOpacity>
      )}

      {/* Book Counseling Modal */}
      <Modal
        visible={isBookModalOpen}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsBookModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Jadwalkan Bimbingan</Text>
              <TouchableOpacity onPress={() => setIsBookModalOpen(false)}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalForm} showsVerticalScrollIndicator={false}>
              <View style={styles.warningBox}>
                <Ionicons name="shield-checkmark" size={18} color="#0f766e" />
                <Text style={styles.warningText}>
                  Seluruh isi konseling bersifat rahasia dan hanya dapat diakses oleh konselor rohani yang bertugas.
                </Text>
              </View>

              <Text style={styles.label}>Topik Bimbingan / Konseling *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Masalah Keluarga, Bimbingan Pranikah, Spiritual"
                placeholderTextColor="#94a3b8"
                value={title}
                onChangeText={setTitle}
              />

              <Text style={styles.label}>Pilih Konselor (Opsional)</Text>
              <TouchableOpacity 
                style={styles.dropdownTrigger}
                onPress={() => setShowCounselorDropdown(!showCounselorDropdown)}
              >
                <Text style={[styles.dropdownTriggerText, !selectedCounselorId && styles.placeholderColor]}>
                  {getSelectedCounselorName()}
                </Text>
                <Ionicons name={showCounselorDropdown ? 'chevron-up' : 'chevron-down'} size={18} color="#64748b" />
              </TouchableOpacity>

              {showCounselorDropdown && (
                <View style={styles.dropdownList}>
                  <TouchableOpacity 
                    style={styles.dropdownItem}
                    onPress={() => {
                      setSelectedCounselorId('');
                      setShowCounselorDropdown(false);
                    }}
                  >
                    <Text style={styles.dropdownItemText}>Pelayanan Pastoral Umum (Ditugaskan Gereja)</Text>
                  </TouchableOpacity>
                  {counselors.map((c) => (
                    <TouchableOpacity 
                      key={c.id}
                      style={styles.dropdownItem}
                      onPress={() => {
                        setSelectedCounselorId(c.id);
                        setShowCounselorDropdown(false);
                      }}
                    >
                      <Text style={styles.dropdownItemText}>{c.name} ({c.role?.name || 'Pastor/Staff'})</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <View style={styles.row}>
                <View style={styles.flexHalf}>
                  <Text style={styles.label}>Tanggal (YYYY-MM-DD) *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. 2026-06-15"
                    placeholderTextColor="#94a3b8"
                    value={dateStr}
                    onChangeText={setDateStr}
                  />
                </View>
                <View style={styles.flexHalf}>
                  <Text style={styles.label}>Waktu (HH:MM) *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. 14:00"
                    placeholderTextColor="#94a3b8"
                    value={timeStr}
                    onChangeText={setTimeStr}
                  />
                </View>
              </View>

              <Text style={styles.label}>Deskripsi Pergumulan / Kebutuhan *</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Ceritakan secara singkat hal yang ingin dibagikan atau didoakan..."
                placeholderTextColor="#94a3b8"
                multiline={true}
                numberOfLines={5}
                value={issueDescription}
                onChangeText={setIssueDescription}
              />

              <View style={{ height: 20 }} />
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={styles.cancelBtn} 
                onPress={() => setIsBookModalOpen(false)}
                disabled={submitting}
              >
                <Text style={styles.cancelBtnText}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.submitBtn} 
                onPress={handleBookSession}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.submitBtnText}>Ajukan Jadwal</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', padding: 16 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 12, 
    marginTop: 40 
  },
  backButton: { marginRight: 12, padding: 4 },
  header: { fontSize: 24, fontWeight: 'bold', color: '#1e293b' },
  introText: { 
    fontSize: 14, 
    color: '#64748b', 
    lineHeight: 20, 
    marginBottom: 20 
  },
  
  // Counseling Card Styles
  counselCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  counselHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10
  },
  counselTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e293b',
    flex: 1,
    marginRight: 8
  },
  privacyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ccfbf1',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4
  },
  privacyText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#0f766e'
  },
  counselDate: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4f46e5',
    marginBottom: 6
  },
  counselorName: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '500',
    marginBottom: 10
  },
  issueBox: {
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#6366f1'
  },
  issueLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#64748b',
    marginBottom: 4
  },
  issueText: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 18
  },
  notesBox: {
    backgroundColor: '#f0fdf4',
    padding: 12,
    borderRadius: 10,
    marginTop: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#22c55e'
  },
  notesLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#166534',
    marginBottom: 4
  },
  notesText: {
    fontSize: 13,
    color: '#14532d',
    lineHeight: 18
  },

  // FAB
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    backgroundColor: '#6366f1',
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5
  },

  // Empty State
  emptyContainer: { 
    alignItems: 'center', 
    justifyContent: 'center',
    marginTop: 64,
    paddingHorizontal: 32
  },
  emptyText: { 
    color: '#94a3b8', 
    fontSize: 14, 
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 20,
    marginBottom: 24
  },
  emptyBtn: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3
  },
  emptyBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold'
  },

  // Modal Styles
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
    marginBottom: 16
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b'
  },
  modalForm: {
    marginBottom: 20
  },
  warningBox: {
    flexDirection: 'row',
    backgroundColor: '#f0fdfa',
    padding: 12,
    borderRadius: 10,
    gap: 8,
    marginBottom: 16,
    alignItems: 'flex-start'
  },
  warningText: {
    fontSize: 12,
    color: '#0f766e',
    flex: 1,
    lineHeight: 18
  },
  label: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#475569',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 1
  },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: '#0f172a',
    backgroundColor: '#f8fafc',
    marginBottom: 16
  },
  dropdownTrigger: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 12,
    backgroundColor: '#f8fafc',
    marginBottom: 16
  },
  dropdownTriggerText: {
    fontSize: 14,
    color: '#0f172a'
  },
  placeholderColor: {
    color: '#94a3b8'
  },
  dropdownList: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    backgroundColor: '#fff',
    marginTop: -12,
    marginBottom: 16,
    overflow: 'hidden'
  },
  dropdownItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9'
  },
  dropdownItemText: {
    fontSize: 13,
    color: '#334155'
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16
  },
  flexHalf: {
    flex: 1
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top'
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center'
  },
  cancelBtnText: {
    color: '#64748b',
    fontWeight: 'bold',
    fontSize: 14
  },
  submitBtn: {
    flex: 1,
    backgroundColor: '#6366f1',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center'
  },
  submitBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14
  }
});
