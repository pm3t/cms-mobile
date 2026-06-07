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
  Platform
} from 'react-native';
import { client } from '../api/client';
import { Ionicons } from '@expo/vector-icons';

interface SmallGroupScreenProps {
  onClose?: () => void;
}

export default function SmallGroupScreen({ onClose }: SmallGroupScreenProps) {
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<'ALL' | 'CELL_GROUP' | 'FELLOWSHIP' | 'COMMISSION'>('ALL');

  // Modal States
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<any>(null);
  const [notes, setNotes] = useState('');

  const fetchData = async () => {
    try {
      const res = await client.get('/small-groups');
      setGroups(res.data || []);
    } catch (err: any) {
      console.log('Error fetching small groups:', err.message);
      Alert.alert('Gagal Memuat Data', 'Tidak dapat mengambil daftar kelompok sel.');
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

  const handleOpenJoinModal = (group: any) => {
    setSelectedGroup(group);
    setNotes('');
    setIsJoinModalOpen(true);
  };

  const handleSendRequest = async () => {
    if (!selectedGroup) return;
    setSubmitting(true);
    try {
      await client.post('/small-groups/join', {
        groupId: selectedGroup.id,
        notes: notes.trim()
      });
      Alert.alert(
        'Permohonan Terkirim', 
        `Permohonan Anda untuk bergabung dengan "${selectedGroup.name}" telah dikirim ke ketua kelompok sel.`
      );
      setIsJoinModalOpen(false);
      fetchData();
    } catch (err: any) {
      Alert.alert('Gagal Mengirim', err.response?.data?.error || err.message || 'Terjadi kesalahan.');
    } finally {
      setSubmitting(false);
    }
  };

  const getGroupTypeLabel = (type: string) => {
    switch (type) {
      case 'CELL_GROUP': return 'Kelompok Sel';
      case 'FELLOWSHIP': return 'Persekutuan';
      case 'COMMISSION': return 'Komisi';
      default: return 'Komunitas';
    }
  };

  const getGroupTypeColor = (type: string) => {
    switch (type) {
      case 'CELL_GROUP': return { bg: '#ecfdf5', text: '#059669' };
      case 'FELLOWSHIP': return { bg: '#eff6ff', text: '#2563eb' };
      case 'COMMISSION': return { bg: '#fffbeb', text: '#d97706' };
      default: return { bg: '#f1f5f9', text: '#475569' };
    }
  };

  const filteredGroups = groups.filter(g => {
    const matchesSearch = 
      g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (g.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (g.location || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (g.leader?.name || '').toLowerCase().includes(searchQuery.toLowerCase());
      
    const matchesType = selectedType === 'ALL' || g.type === selectedType;
    return matchesSearch && matchesType;
  });

  if (loading && !refreshing) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#f59e0b" />
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
        <Text style={styles.header}>Kelompok Sel</Text>
      </View>

      <Text style={styles.introText}>
        Temukan kelompok sel / komunitas mini terdekat untuk bertumbuh bersama dalam iman, doa, dan pemuridan.
      </Text>

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#94a3b8" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Cari nama kelompok, lokasi, ketua..."
          placeholderTextColor="#94a3b8"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={18} color="#94a3b8" />
          </TouchableOpacity>
        )}
      </View>

      {/* Type Filters */}
      <View style={styles.filterContainer}>
        <TouchableOpacity 
          style={[styles.filterTab, selectedType === 'ALL' && styles.filterTabActive]}
          onPress={() => setSelectedType('ALL')}
        >
          <Text style={[styles.filterText, selectedType === 'ALL' && styles.filterTextActive]}>Semua</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.filterTab, selectedType === 'CELL_GROUP' && styles.filterTabActive]}
          onPress={() => setSelectedType('CELL_GROUP')}
        >
          <Text style={[styles.filterText, selectedType === 'CELL_GROUP' && styles.filterTextActive]}>Kelompok Sel</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.filterTab, selectedType === 'FELLOWSHIP' && styles.filterTabActive]}
          onPress={() => setSelectedType('FELLOWSHIP')}
        >
          <Text style={[styles.filterText, selectedType === 'FELLOWSHIP' && styles.filterTextActive]}>Persekutuan</Text>
        </TouchableOpacity>
      </View>

      {/* Small Groups List */}
      <FlatList
        data={filteredGroups}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={['#f59e0b']} />
        }
        renderItem={({ item }) => {
          const colors = getGroupTypeColor(item.type);
          return (
            <View style={styles.groupCard}>
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.groupName}>{item.name}</Text>
                  <View style={[styles.typeBadge, { backgroundColor: colors.bg }]}>
                    <Text style={[styles.typeText, { color: colors.text }]}>{getGroupTypeLabel(item.type)}</Text>
                  </View>
                </View>
                <View style={styles.memberCountBadge}>
                  <Ionicons name="people" size={14} color="#64748b" />
                  <Text style={styles.memberCountText}>{item.memberCount} Anggota</Text>
                </View>
              </View>

              {item.description ? (
                <Text style={styles.descriptionText}>{item.description}</Text>
              ) : null}

              <View style={styles.metaSection}>
                {item.meetingSchedule && (
                  <View style={styles.metaRow}>
                    <Ionicons name="time-outline" size={15} color="#64748b" />
                    <Text style={styles.metaText}>{item.meetingSchedule}</Text>
                  </View>
                )}
                {item.location && (
                  <View style={styles.metaRow}>
                    <Ionicons name="location-outline" size={15} color="#64748b" />
                    <Text style={styles.metaText}>{item.location}</Text>
                  </View>
                )}
                <View style={styles.metaRow}>
                  <Ionicons name="person-outline" size={15} color="#64748b" />
                  <Text style={styles.metaText}>Ketua: <Text style={{ fontWeight: '600' }}>{item.leader?.name}</Text></Text>
                </View>
              </View>

              {/* Action Area */}
              <View style={styles.cardActions}>
                {item.isJoined ? (
                  <View style={styles.joinedStatus}>
                    <Ionicons name="checkmark-circle" size={18} color="#059669" />
                    <Text style={styles.joinedText}>Anda sudah bergabung</Text>
                  </View>
                ) : item.joinStatus === 'PENDING' ? (
                  <View style={styles.pendingStatus}>
                    <Ionicons name="hourglass" size={16} color="#d97706" />
                    <Text style={styles.pendingText}>Permohonan Menunggu Persetujuan</Text>
                  </View>
                ) : (
                  <TouchableOpacity 
                    style={styles.joinBtn}
                    onPress={() => handleOpenJoinModal(item)}
                  >
                    <Text style={styles.joinBtnText}>Request to Join</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={64} color="#94a3b8" />
            <Text style={styles.emptyText}>Tidak ada kelompok sel yang cocok dengan kriteria pencarian Anda.</Text>
          </View>
        }
        contentContainerStyle={{ paddingBottom: 24 }}
      />

      {/* Join Request Modal */}
      <Modal
        visible={isJoinModalOpen}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsJoinModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Gabung Kelompok Sel</Text>
              <TouchableOpacity onPress={() => setIsJoinModalOpen(false)}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>
              Kirim permohonan bergabung ke ketua kelompok sel "{selectedGroup?.name}". Tuliskan pesan perkenalan singkat.
            </Text>

            <TextInput
              style={styles.textInput}
              placeholder="Halo Ketua, perkenalkan nama saya... Saya rindu untuk bergabung dan bertumbuh bersama kelompok sel ini..."
              placeholderTextColor="#94a3b8"
              multiline={true}
              numberOfLines={4}
              value={notes}
              onChangeText={setNotes}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={styles.cancelBtn} 
                onPress={() => setIsJoinModalOpen(false)}
                disabled={submitting}
              >
                <Text style={styles.cancelBtnText}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.submitBtn} 
                onPress={handleSendRequest}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.submitBtnText}>Kirim Permohonan</Text>
                )}
              </TouchableOpacity>
            </View>
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

  // Search & Filter
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 46,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 2,
    elevation: 1
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 14, color: '#0f172a' },
  filterContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16
  },
  filterTab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  filterTabActive: {
    backgroundColor: '#fef3c7',
    borderColor: '#fde68a'
  },
  filterText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#64748b'
  },
  filterTextActive: {
    color: '#d97706'
  },

  // Group Cards
  groupCard: {
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
    marginBottom: 10
  },
  groupName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 4
  },
  typeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6
  },
  typeText: {
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase'
  },
  memberCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#f1f5f9'
  },
  memberCountText: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '500'
  },
  descriptionText: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
    marginBottom: 12
  },
  metaSection: {
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 12,
    gap: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#f1f5f9'
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  metaText: {
    fontSize: 12,
    color: '#475569'
  },

  // Actions
  cardActions: {
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 12
  },
  joinBtn: {
    backgroundColor: '#f59e0b',
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center'
  },
  joinBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold'
  },
  joinedStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8
  },
  joinedText: {
    color: '#059669',
    fontSize: 13,
    fontWeight: 'bold'
  },
  pendingStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8
  },
  pendingText: {
    color: '#d97706',
    fontSize: 13,
    fontWeight: 'bold'
  },

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
    lineHeight: 20
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    padding: 24
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#0f172a' },
  modalSubtitle: { fontSize: 13, color: '#64748b', lineHeight: 18, marginBottom: 16 },
  textInput: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: '#0f172a',
    backgroundColor: '#f8fafc',
    height: 100,
    textAlignVertical: 'top',
    marginBottom: 20
  },
  modalActions: { flexDirection: 'row', gap: 12 },
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
    backgroundColor: '#f59e0b',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center'
  },
  submitBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 14 }
});
