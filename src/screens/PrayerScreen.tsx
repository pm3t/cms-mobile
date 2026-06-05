import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  ActivityIndicator, 
  Alert, 
  FlatList, 
  Switch, 
  KeyboardAvoidingView, 
  Platform 
} from 'react-native';
import { client } from '../api/client';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function PrayerScreen() {
  const [activeTab, setActiveTab] = useState<'MY_PRAYERS' | 'PUBLIC_PRAYERS'>('MY_PRAYERS');
  const [myPrayers, setMyPrayers] = useState<any[]>([]);
  const [publicPrayers, setPublicPrayers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Form state
  const [content, setContent] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isPrivate, setIsPrivate] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);

  // Track prayed requests locally so user can't spam or knows they did pray
  const [prayedRequests, setPrayedRequests] = useState<string[]>([]);

  const fetchMyPrayers = async () => {
    try {
      const res = await client.get('/prayers/my');
      setMyPrayers(res.data || []);
    } catch (err: any) {
      console.log('Error fetching my prayers:', err.message);
    }
  };

  const fetchPublicPrayers = async () => {
    try {
      const res = await client.get('/prayers/public');
      setPublicPrayers(res.data || []);
    } catch (err: any) {
      console.log('Error fetching public prayers:', err.message);
    }
  };

  const loadData = async () => {
    setLoading(true);
    await Promise.all([fetchMyPrayers(), fetchPublicPrayers()]);
    setLoading(false);
  };

  // Load prayed request IDs from storage
  const loadPrayedRequests = async () => {
    try {
      const cached = await AsyncStorage.getItem('prayed_requests');
      if (cached) {
        setPrayedRequests(JSON.parse(cached));
      }
    } catch (e) {
      console.log('Error loading prayed requests from cache:', e);
    }
  };

  useEffect(() => {
    loadData();
    loadPrayedRequests();
  }, []);

  const handleCreatePrayer = async () => {
    if (!content.trim()) {
      return Alert.alert('Gagal', 'Silakan masukkan isi pokok doa Anda.');
    }

    setSubmitLoading(true);
    try {
      await client.post('/prayers', {
        content: content.trim(),
        isAnonymous,
        isPrivate
      });
      
      Alert.alert('Sukses', 'Permohonan doa Anda berhasil dikirim.');
      setContent('');
      setIsAnonymous(false);
      setIsPrivate(false);
      
      await fetchMyPrayers();
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error || err.message || 'Gagal mengirim permohonan doa');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handlePrayFor = async (id: string) => {
    if (prayedRequests.includes(id)) {
      return;
    }

    try {
      await client.post(`/prayers/${id}/pray`);
      
      // Update locally
      const updated = [...prayedRequests, id];
      setPrayedRequests(updated);
      await AsyncStorage.setItem('prayed_requests', JSON.stringify(updated));

      // Refresh list to show updated count
      await fetchPublicPrayers();
      
      Alert.alert('Terima Kasih', 'Anda telah mendoakan permohonan doa ini.');
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error || err.message || 'Gagal mengirim dukungan doa');
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Text style={styles.header}>Pastoral Prayer Request</Text>
      <Text style={styles.subtitle}>Saling mendukung di dalam doa. Setiap permohonan Anda berharga.</Text>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tabButton, activeTab === 'MY_PRAYERS' && styles.activeTabButton]}
          onPress={() => setActiveTab('MY_PRAYERS')}
        >
          <Text style={[styles.tabButtonText, activeTab === 'MY_PRAYERS' && styles.activeTabButtonText]}>
            Permohonan Doa Saya
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tabButton, activeTab === 'PUBLIC_PRAYERS' && styles.activeTabButton]}
          onPress={() => setActiveTab('PUBLIC_PRAYERS')}
        >
          <Text style={[styles.tabButtonText, activeTab === 'PUBLIC_PRAYERS' && styles.activeTabButtonText]}>
            Pokok Doa Jemaat
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#3b82f6" />
        </View>
      ) : activeTab === 'MY_PRAYERS' ? (
        <FlatList
          data={myPrayers}
          keyExtractor={(item) => item.id}
          refreshing={loading}
          onRefresh={loadData}
          ListHeaderComponent={
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Input Permohonan Doa Baru</Text>
              
              <Text style={styles.inputLabel}>Isi Pokok Doa (Syafaat) *</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Tuliskan pergumulan, kesembuhan, atau kebutuhan doa Anda di sini..."
                value={content}
                onChangeText={setContent}
                multiline
                numberOfLines={4}
              />

              <View style={styles.switchContainer}>
                <Text style={styles.switchLabel}>Kirim Secara Anonim (Sembunyikan Nama)</Text>
                <Switch 
                  value={isAnonymous}
                  onValueChange={setIsAnonymous}
                  trackColor={{ false: '#767577', true: '#f59e0b' }}
                  thumbColor={isAnonymous ? '#fff' : '#f4f3f4'}
                />
              </View>

              <View style={styles.switchContainer}>
                <Text style={styles.switchLabel}>Kirim Secara Privat (Hanya untuk Pastor)</Text>
                <Switch 
                  value={isPrivate}
                  onValueChange={setIsPrivate}
                  trackColor={{ false: '#767577', true: '#6366f1' }}
                  thumbColor={isPrivate ? '#fff' : '#f4f3f4'}
                />
              </View>

              <TouchableOpacity 
                style={styles.submitButton} 
                onPress={handleCreatePrayer}
                disabled={submitLoading}
              >
                {submitLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitButtonText}>Kirim Permohonan Doa</Text>
                )}
              </TouchableOpacity>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.prayerCard}>
              <View style={styles.prayerCardHeader}>
                <Text style={styles.prayerRequester}>
                  {item.isAnonymous ? 'Anonim' : item.requesterName}
                </Text>
                <View style={[
                  styles.badge, 
                  item.isPrivate ? styles.badgePrivate : styles.badgePublic
                ]}>
                  <Text style={styles.badgeText}>
                    {item.isPrivate ? 'Privat (Pastor)' : 'Publik'}
                  </Text>
                </View>
              </View>
              <Text style={styles.prayerContent}>"{item.content}"</Text>
              
              <View style={styles.prayerCardFooter}>
                <Text style={styles.prayerDate}>
                  {new Date(item.createdAt).toLocaleDateString('id-ID', { dateStyle: 'medium' })}
                </Text>
                <View style={styles.countBadge}>
                  <Text style={styles.countBadgeText}>
                    🙏 {item.prayerCount || 0} Dukungan Doa
                  </Text>
                </View>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <Text style={styles.emptyText}>Anda belum membuat permohonan doa apa pun.</Text>
          }
          contentContainerStyle={{ paddingBottom: 24 }}
        />
      ) : (
        <FlatList
          data={publicPrayers}
          keyExtractor={(item) => item.id}
          refreshing={loading}
          onRefresh={loadData}
          renderItem={({ item }) => {
            const hasPrayed = prayedRequests.includes(item.id);
            return (
              <View style={styles.prayerCard}>
                <View style={styles.prayerCardHeader}>
                  <Text style={styles.prayerRequester}>
                    {item.isAnonymous ? 'Anonim' : item.requesterName}
                  </Text>
                  <Text style={styles.prayerDate}>
                    {new Date(item.createdAt).toLocaleDateString('id-ID', { dateStyle: 'medium' })}
                  </Text>
                </View>
                <Text style={styles.prayerContent}>"{item.content}"</Text>
                
                <View style={styles.prayerCardFooter}>
                  <View style={styles.countBadge}>
                    <Text style={styles.countBadgeText}>
                      🙏 {item.prayerCount || 0} orang mendoakan
                    </Text>
                  </View>
                  
                  <TouchableOpacity 
                    style={[styles.prayButton, hasPrayed && styles.prayButtonDisabled]}
                    onPress={() => handlePrayFor(item.id)}
                    disabled={hasPrayed}
                  >
                    <Text style={[styles.prayButtonText, hasPrayed && styles.prayButtonTextDisabled]}>
                      {hasPrayed ? '✓ Sudah Didoakan' : '🙏 Bantu Berdoa'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            <Text style={styles.emptyText}>Belum ada permohonan doa dari jemaat lain saat ini.</Text>
          }
          contentContainerStyle={{ paddingBottom: 24 }}
        />
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', padding: 16 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', minHeight: 200 },
  header: { fontSize: 24, fontWeight: 'bold', color: '#1e293b', marginBottom: 8, marginTop: 40 },
  subtitle: { fontSize: 14, color: '#64748b', marginBottom: 20 },
  
  // Tabs
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#e2e8f0',
    padding: 4,
    borderRadius: 14,
    marginBottom: 16
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10
  },
  activeTabButton: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2
  },
  tabButtonText: { fontSize: 12, fontWeight: 'bold', color: '#64748b' },
  activeTabButtonText: { color: '#0f172a' },

  // Card & Forms
  card: { 
    backgroundColor: '#fff', 
    borderRadius: 20, 
    padding: 16, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.05, 
    shadowRadius: 8, 
    elevation: 3,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 20
  },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#1e293b', marginBottom: 12 },
  inputLabel: { fontSize: 13, fontWeight: '700', color: '#475569', marginBottom: 6 },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 11,
    fontSize: 14,
    color: '#0f172a',
    marginBottom: 14
  },
  textArea: { height: 90, textAlignVertical: 'top' },
  
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  switchLabel: { fontSize: 13, color: '#475569', fontWeight: '600', flex: 1, marginRight: 8 },
  
  submitButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8
  },
  submitButtonText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },

  // Prayer Cards
  prayerCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 2
  },
  prayerCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  prayerRequester: { fontSize: 14, fontWeight: 'bold', color: '#1e293b' },
  prayerContent: { fontSize: 14, color: '#334155', fontStyle: 'italic', lineHeight: 20, marginBottom: 12 },
  
  prayerCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 10
  },
  prayerDate: { fontSize: 11, color: '#94a3b8', fontWeight: '500' },
  
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgePublic: { backgroundColor: '#dbeafe' },
  badgePrivate: { backgroundColor: '#f3e8ff' },
  badgeText: { fontSize: 10, fontWeight: 'bold', color: '#1e293b' },
  
  countBadge: { backgroundColor: '#fef3c7', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  countBadgeText: { fontSize: 11, color: '#d97706', fontWeight: '700' },
  
  prayButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8
  },
  prayButtonDisabled: {
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#cbd5e1'
  },
  prayButtonText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  prayButtonTextDisabled: { color: '#94a3b8' },

  emptyText: { textAlign: 'center', color: '#94a3b8', marginTop: 24, fontSize: 13 }
});
