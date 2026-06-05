import React, { useState, useEffect } from 'react';
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
  Alert 
} from 'react-native';
import { client } from '../api/client';

export default function MinistryScreen() {
  const [activeTab, setActiveTab] = useState<'MY_SERVICE' | 'RECRUITMENT'>('MY_SERVICE');
  const [recruitments, setRecruitments] = useState<any[]>([]);
  const [myRosters, setMyRosters] = useState<any[]>([]);
  const [appliedIds, setAppliedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  
  // Apply Modal state
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [selectedRec, setSelectedRec] = useState<any>(null);
  const [notes, setNotes] = useState('');

  const fetchData = async () => {
    try {
      // Fetch volunteer recruitments
      const recRes = await client.get('/volunteer');
      setRecruitments(recRes.data || []);
      
      // Fetch my rosters (My Service)
      const rosterRes = await client.get('/roster');
      setMyRosters(rosterRes.data || []);
      
      // Get profile to check which ones the user has already applied to
      const profileRes = await client.get('/profile');
      
      // Extract recruitmentIds from user's volunteerApplications
      const applied = (profileRes.data.volunteerApplications || [])
        .map((app: any) => app.recruitmentId);
      setAppliedIds(applied);
    } catch (err: any) {
      console.log('Error fetching volunteer/roster data:', err.message);
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

  const openApplyModal = (rec: any) => {
    setSelectedRec(rec);
    setNotes('');
    setIsApplyModalOpen(true);
  };

  const handleApply = async () => {
    if (!selectedRec) return;
    
    setActionLoading(true);
    try {
      await client.post(`/volunteer/${selectedRec.id}/apply`, { notes: notes.trim() });
      Alert.alert('Sukses', 'Lamaran relawan berhasil dikirim!');
      setIsApplyModalOpen(false);
      fetchData();
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error || err.message || 'Gagal mengirim lamaran');
    } finally {
      setActionLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const d = new Date(dateString);
    return d.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#c026d3" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Pelayanan</Text>

      {/* Tab Switcher */}
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tabButton, activeTab === 'MY_SERVICE' && styles.tabButtonActive]}
          onPress={() => setActiveTab('MY_SERVICE')}
        >
          <Text style={[styles.tabButtonText, activeTab === 'MY_SERVICE' && styles.tabButtonTextActive]}>Jadwal Saya</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tabButton, activeTab === 'RECRUITMENT' && styles.tabButtonActive]}
          onPress={() => setActiveTab('RECRUITMENT')}
        >
          <Text style={[styles.tabButtonText, activeTab === 'RECRUITMENT' && styles.tabButtonTextActive]}>Lowongan Relawan</Text>
        </TouchableOpacity>
      </View>
      
      {activeTab === 'MY_SERVICE' ? (
        <FlatList
          data={myRosters}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={['#c026d3']} />}
          renderItem={({ item }) => (
            <View style={styles.rosterCard}>
              <View style={styles.rosterHeader}>
                <Text style={styles.rosterMinistry}>{item.roster?.ministry?.name}</Text>
                <View style={styles.roleBadge}>
                  <Text style={styles.roleText}>{item.role}</Text>
                </View>
              </View>

              <Text style={styles.rosterDate}>
                📅  {formatDate(item.roster?.date)}
              </Text>
              
              <Text style={styles.rosterTime}>
                ⏰  {item.roster?.startTime || '00:00'} {item.roster?.endTime ? `- ${item.roster.endTime}` : ''}
              </Text>

              <Text style={styles.rosterService}>
                📍  {item.roster?.worshipService?.name || item.roster?.event?.title || 'Kebaktian'}
              </Text>

              {item.notes ? (
                <View style={styles.rosterNotesContainer}>
                  <Text style={styles.rosterNotesTitle}>Catatan:</Text>
                  <Text style={styles.rosterNotes}>{item.notes}</Text>
                </View>
              ) : null}
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Anda belum memiliki jadwal pelayanan saat ini.</Text>
            </View>
          }
        />
      ) : (
        <FlatList
          data={recruitments}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={['#c026d3']} />}
          renderItem={({ item }) => {
            const hasApplied = appliedIds.includes(item.id);
            return (
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.ministryTag}>{item.ministry?.name}</Text>
                  {hasApplied && (
                    <View style={styles.appliedBadge}>
                      <Text style={styles.appliedText}>Sudah Daftar</Text>
                    </View>
                  )}
                </View>

                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.description}>{item.description}</Text>

                {item.requirements ? (
                  <View style={styles.reqContainer}>
                    <Text style={styles.reqTitle}>Persyaratan:</Text>
                    <Text style={styles.requirements}>{item.requirements}</Text>
                  </View>
                ) : null}

                <TouchableOpacity 
                  style={[styles.applyBtn, hasApplied && styles.appliedBtn]} 
                  onPress={() => openApplyModal(item)}
                  disabled={hasApplied || actionLoading}
                >
                  <Text style={styles.applyBtnText}>
                    {hasApplied ? 'Terdaftar Sebagai Calon' : 'Daftar Sebagai Relawan'}
                  </Text>
                </TouchableOpacity>
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Belum ada lowongan relawan yang dibuka saat ini.</Text>
            </View>
          }
        />
      )}

      {/* Apply Modal */}
      <Modal
        visible={isApplyModalOpen}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsApplyModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Daftar Pelayanan</Text>
            {selectedRec && (
              <Text style={styles.modalSubtitle}>
                {selectedRec.title} - {selectedRec.ministry?.name}
              </Text>
            )}

            <TextInput
              style={styles.textInput}
              placeholder="Catatan tambahan (misal: pengalaman, ketersediaan jadwal)..."
              placeholderTextColor="#94a3b8"
              multiline={true}
              numberOfLines={4}
              value={notes}
              onChangeText={setNotes}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={styles.cancelBtn} 
                onPress={() => setIsApplyModalOpen(false)}
                disabled={actionLoading}
              >
                <Text style={styles.cancelBtnText}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.submitBtn} 
                onPress={handleApply}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.submitBtnText}>Kirim</Text>
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
  header: { fontSize: 24, fontWeight: 'bold', color: '#1e293b', marginBottom: 16, marginTop: 40 },
  
  // Tab Switcher Styles
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#e2e8f0',
    padding: 4,
    borderRadius: 12,
    marginBottom: 16
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8
  },
  tabButtonActive: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#64748b'
  },
  tabButtonTextActive: {
    color: '#c026d3'
  },

  // Roster Card Styles
  rosterCard: {
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
  rosterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  rosterMinistry: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#2563eb',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    textTransform: 'uppercase'
  },
  roleBadge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6
  },
  roleText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: 'bold'
  },
  rosterDate: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 6
  },
  rosterTime: {
    fontSize: 13,
    color: '#475569',
    marginBottom: 6
  },
  rosterService: {
    fontSize: 13,
    color: '#64748b'
  },
  rosterNotesContainer: {
    backgroundColor: '#f8fafc',
    padding: 10,
    borderRadius: 8,
    marginTop: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#3b82f6'
  },
  rosterNotesTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#64748b',
    marginBottom: 2
  },
  rosterNotes: {
    fontSize: 12,
    color: '#475569'
  },

  // Volunteer Card Styles
  card: { 
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
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  ministryTag: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#c026d3',
    backgroundColor: '#fdf4ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    textTransform: 'uppercase'
  },
  appliedBadge: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6
  },
  appliedText: {
    fontSize: 10,
    color: '#15803d',
    fontWeight: 'bold'
  },
  title: { fontSize: 18, fontWeight: 'bold', color: '#0f172a', marginBottom: 6 },
  description: { fontSize: 14, color: '#475569', lineHeight: 20, marginBottom: 12 },
  reqContainer: {
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
    borderLeftWidth: 3,
    borderLeftColor: '#c026d3'
  },
  reqTitle: { fontSize: 12, fontWeight: 'bold', color: '#64748b', marginBottom: 4 },
  requirements: { fontSize: 13, color: '#475569', lineHeight: 18 },
  applyBtn: {
    backgroundColor: '#c026d3',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center'
  },
  appliedBtn: {
    backgroundColor: '#cbd5e1'
  },
  applyBtnText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  emptyContainer: { alignItems: 'center', marginTop: 40 },
  emptyText: { color: '#94a3b8', fontSize: 14, textAlign: 'center' },
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
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#0f172a', marginBottom: 4 },
  modalSubtitle: { fontSize: 14, color: '#64748b', marginBottom: 16 },
  textInput: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: '#0f172a',
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
    backgroundColor: '#c026d3',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center'
  },
  submitBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 14 }
});
