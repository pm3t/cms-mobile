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

interface FacilityBookingScreenProps {
  onClose?: () => void;
}

export default function FacilityBookingScreen({ onClose }: FacilityBookingScreenProps) {
  const [bookings, setBookings] = useState<any[]>([]);
  const [facilities, setFacilities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);

  // Form states
  const [selectedFacilityId, setSelectedFacilityId] = useState('');
  const [purpose, setPurpose] = useState('');
  const [description, setDescription] = useState('');
  const [startDateStr, setStartDateStr] = useState(''); // YYYY-MM-DD
  const [startTimeStr, setStartTimeStr] = useState(''); // HH:MM
  const [endDateStr, setEndDateStr] = useState(''); // YYYY-MM-DD
  const [endTimeStr, setEndTimeStr] = useState(''); // HH:MM
  const [userNotes, setUserNotes] = useState('');
  const [showFacilityDropdown, setShowFacilityDropdown] = useState(false);

  const fetchData = async () => {
    try {
      const [bookingsRes, facilitiesRes] = await Promise.all([
        client.get('/facilities/bookings'),
        client.get('/facilities')
      ]);
      setBookings(bookingsRes.data || []);
      setFacilities(facilitiesRes.data || []);
    } catch (err: any) {
      console.log('Error fetching facility data:', err.message);
      Alert.alert('Gagal Memuat Data', 'Tidak dapat mengambil histori peminjaman atau daftar ruangan.');
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
    setSelectedFacilityId('');
    setPurpose('');
    setDescription('');
    setUserNotes('');
    
    // Pre-populate date/time
    const today = new Date();
    const formattedDate = today.toISOString().split('T')[0];
    setStartDateStr(formattedDate);
    setEndDateStr(formattedDate);
    setStartTimeStr('13:00');
    setEndTimeStr('15:00');
    
    setIsBookModalOpen(true);
  };

  const handleBookFacility = async () => {
    if (!selectedFacilityId || !purpose.trim() || !startDateStr.trim() || !startTimeStr.trim() || !endDateStr.trim() || !endTimeStr.trim()) {
      Alert.alert('Form Belum Lengkap', 'Harap isi semua kolom wajib.');
      return;
    }

    // Date regex validations
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(startDateStr) || !dateRegex.test(endDateStr)) {
      Alert.alert('Format Tanggal Salah', 'Gunakan format YYYY-MM-DD (contoh: 2026-06-15).');
      return;
    }

    // Time regex validations
    const timeRegex = /^\d{2}:\d{2}$/;
    if (!timeRegex.test(startTimeStr) || !timeRegex.test(endTimeStr)) {
      Alert.alert('Format Waktu Salah', 'Gunakan format HH:MM (contoh: 14:30).');
      return;
    }

    const startTime = `${startDateStr}T${startTimeStr}:00`;
    const endTime = `${endDateStr}T${endTimeStr}:00`;

    const start = new Date(startTime);
    const end = new Date(endTime);

    if (end <= start) {
      Alert.alert('Waktu Tidak Valid', 'Waktu selesai harus setelah waktu mulai.');
      return;
    }

    setSubmitting(true);
    try {
      await client.post('/facilities/bookings', {
        facilityId: selectedFacilityId,
        purpose: purpose.trim(),
        description: description.trim() || null,
        startTime,
        endTime,
        userNotes: userNotes.trim() || null
      });

      Alert.alert('Berhasil', 'Permohonan peminjaman ruangan Anda telah dikirim dan menunggu persetujuan.');
      setIsBookModalOpen(false);
      handleRefresh();
    } catch (err: any) {
      Alert.alert('Gagal Memesan', err.response?.data?.error || err.message || 'Terjadi kesalahan.');
    } finally {
      setSubmitting(false);
    }
  };

  const getSelectedFacilityName = () => {
    const facility = facilities.find(f => f.id === selectedFacilityId);
    return facility ? `${facility.name} (${facility.location || 'Tanpa Lokasi'})` : 'Pilih ruangan *';
  };

  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
      case 'APPROVED': return styles.badgeApproved;
      case 'REJECTED': return styles.badgeRejected;
      case 'CANCELLED': return styles.badgeCancelled;
      default: return styles.badgePending;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'APPROVED': return 'Disetujui';
      case 'REJECTED': return 'Ditolak';
      case 'CANCELLED': return 'Dibatalkan';
      default: return 'Menunggu';
    }
  };

  const formatDateTime = (dateString: string) => {
    if (!dateString) return '-';
    const d = new Date(dateString);
    return d.toLocaleDateString('id-ID', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    }) + ' ' + d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#10b981" />
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
        <Text style={styles.header}>Peminjaman Ruangan</Text>
      </View>

      <Text style={styles.introText}>
        Ajukan peminjaman ruangan atau fasilitas gereja untuk kegiatan ibadah, latihan, atau keperluan pelayanan keluarga lainnya.
      </Text>

      {/* Bookings List */}
      <FlatList
        data={bookings}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={['#10b981']} />
        }
        renderItem={({ item }) => (
          <View style={styles.bookingCard}>
            <View style={styles.bookingCardHeader}>
              <Text style={styles.facilityName}>{item.facility?.name}</Text>
              <View style={[styles.statusBadge, getStatusBadgeStyle(item.status)]}>
                <Text style={styles.statusText}>{getStatusText(item.status)}</Text>
              </View>
            </View>

            {item.facility?.location && (
              <Text style={styles.locationText}>📍 Lokasi: {item.facility.location}</Text>
            )}

            <View style={styles.timeSection}>
              <Text style={styles.timeText}>📅 Mulai: {formatDateTime(item.startTime)}</Text>
              <Text style={styles.timeText}>📅 Selesai: {formatDateTime(item.endTime)}</Text>
            </View>

            <View style={styles.detailBox}>
              <Text style={styles.detailLabel}>Tujuan:</Text>
              <Text style={styles.detailText}>{item.purpose}</Text>
              {item.description ? (
                <>
                  <Text style={[styles.detailLabel, { marginTop: 6 }]}>Keterangan:</Text>
                  <Text style={styles.detailText}>{item.description}</Text>
                </>
              ) : null}
            </View>

            {item.approvedBy && (
              <Text style={styles.approvedByText}>✓ Diverifikasi oleh Admin</Text>
            )}
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="business-outline" size={64} color="#94a3b8" />
            <Text style={styles.emptyText}>Belum ada pengajuan peminjaman ruangan saat ini.</Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={handleOpenBookModal}>
              <Text style={styles.emptyBtnText}>Ajukan Peminjaman Ruangan</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {/* FAB */}
      {bookings.length > 0 && (
        <TouchableOpacity style={styles.fab} onPress={handleOpenBookModal}>
          <Ionicons name="add" size={30} color="#fff" />
        </TouchableOpacity>
      )}

      {/* Request Booking Modal */}
      <Modal
        visible={isBookModalOpen}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsBookModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Form Peminjaman</Text>
              <TouchableOpacity onPress={() => setIsBookModalOpen(false)}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalForm} showsVerticalScrollIndicator={false}>
              <View style={styles.warningBox}>
                <Ionicons name="information-circle" size={18} color="#065f46" />
                <Text style={styles.warningText}>
                  Permohonan akan ditinjau oleh Admin untuk mencegah bentrokan jadwal penggunaan ruangan gereja.
                </Text>
              </View>

              <Text style={styles.label}>Pilih Ruangan / Fasilitas *</Text>
              <TouchableOpacity 
                style={styles.dropdownTrigger}
                onPress={() => setShowFacilityDropdown(!showFacilityDropdown)}
              >
                <Text style={[styles.dropdownTriggerText, !selectedFacilityId && styles.placeholderColor]}>
                  {getSelectedFacilityName()}
                </Text>
                <Ionicons name={showFacilityDropdown ? 'chevron-up' : 'chevron-down'} size={18} color="#64748b" />
              </TouchableOpacity>

              {showFacilityDropdown && (
                <View style={styles.dropdownList}>
                  {facilities.map((f) => (
                    <TouchableOpacity 
                      key={f.id}
                      style={styles.dropdownItem}
                      onPress={() => {
                        setSelectedFacilityId(f.id);
                        setShowFacilityDropdown(false);
                      }}
                    >
                      <Text style={styles.dropdownItemText}>{f.name} ({f.location || 'Tanpa Lokasi'})</Text>
                      {f.capacity && <Text style={styles.capacityText}>Kapasitas: {f.capacity} orang</Text>}
                    </TouchableOpacity>
                  ))}
                  {facilities.length === 0 && (
                    <Text style={styles.emptyDropdownText}>Tidak ada ruangan aktif yang tersedia.</Text>
                  )}
                </View>
              )}

              <Text style={styles.label}>Tujuan Peminjaman *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Latihan Musik Choir, Ibadah Keluarga Besar"
                placeholderTextColor="#94a3b8"
                value={purpose}
                onChangeText={setPurpose}
              />

              <Text style={styles.label}>Deskripsi Acara</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Latihan musik rutin persiapan ibadah minggu"
                placeholderTextColor="#94a3b8"
                value={description}
                onChangeText={setDescription}
              />

              {/* Start Date & Time */}
              <View style={styles.row}>
                <View style={styles.flexHalf}>
                  <Text style={styles.label}>Tgl Mulai (YYYY-MM-DD) *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. 2026-06-15"
                    placeholderTextColor="#94a3b8"
                    value={startDateStr}
                    onChangeText={setStartDateStr}
                  />
                </View>
                <View style={styles.flexHalf}>
                  <Text style={styles.label}>Jam Mulai (HH:MM) *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. 13:00"
                    placeholderTextColor="#94a3b8"
                    value={startTimeStr}
                    onChangeText={setStartTimeStr}
                  />
                </View>
              </View>

              {/* End Date & Time */}
              <View style={styles.row}>
                <View style={styles.flexHalf}>
                  <Text style={styles.label}>Tgl Selesai (YYYY-MM-DD) *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. 2026-06-15"
                    placeholderTextColor="#94a3b8"
                    value={endDateStr}
                    onChangeText={setEndDateStr}
                  />
                </View>
                <View style={styles.flexHalf}>
                  <Text style={styles.label}>Jam Selesai (HH:MM) *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. 15:00"
                    placeholderTextColor="#94a3b8"
                    value={endTimeStr}
                    onChangeText={setEndTimeStr}
                  />
                </View>
              </View>

              <Text style={styles.label}>Catatan Tambahan / Pesanan Khusus</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Tuliskan jika ada kebutuhan khusus (e.g. Meminjam proyektor tambahan, tambahan kursi)..."
                placeholderTextColor="#94a3b8"
                multiline={true}
                numberOfLines={4}
                value={userNotes}
                onChangeText={setUserNotes}
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
                onPress={handleBookFacility}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.submitBtnText}>Ajukan Peminjaman</Text>
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

  // Cards
  bookingCard: {
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
  bookingCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  facilityName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0f172a',
    flex: 1,
    marginRight: 8
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8
  },
  statusText: {
    fontSize: 10,
    fontWeight: 'bold'
  },
  badgePending: { backgroundColor: '#fef3c7', color: '#b45309' },
  badgeApproved: { backgroundColor: '#d1fae5', color: '#065f46' },
  badgeRejected: { backgroundColor: '#fee2e2', color: '#991b1b' },
  badgeCancelled: { backgroundColor: '#f1f5f9', color: '#475569' },
  locationText: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 8
  },
  timeSection: {
    backgroundColor: '#f8fafc',
    padding: 10,
    borderRadius: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#f1f5f9'
  },
  timeText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '500',
    lineHeight: 18
  },
  detailBox: {
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 10
  },
  detailLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#94a3b8',
    marginBottom: 2
  },
  detailText: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 18
  },
  approvedByText: {
    fontSize: 11,
    color: '#10b981',
    fontWeight: 'bold',
    marginTop: 8
  },

  // FAB
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    backgroundColor: '#10b981',
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5
  },

  // Empty state
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
    backgroundColor: '#10b981',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: '#10b981',
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

  // Modal
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
    backgroundColor: '#ecfdf5',
    padding: 12,
    borderRadius: 10,
    gap: 8,
    marginBottom: 16,
    alignItems: 'flex-start'
  },
  warningText: {
    fontSize: 12,
    color: '#065f46',
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
    color: '#334155',
    fontWeight: '600'
  },
  capacityText: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2
  },
  emptyDropdownText: {
    padding: 16,
    color: '#94a3b8',
    textAlign: 'center',
    fontSize: 13
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
    height: 90,
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
    backgroundColor: '#10b981',
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
