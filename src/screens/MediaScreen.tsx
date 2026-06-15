import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Linking, TouchableOpacity, RefreshControl, Modal, Alert } from 'react-native';
import { client } from '../api/client';
import AsyncStorage from '@react-native-async-storage/async-storage';

type TabId = 'WARTA' | 'SERMONS' | 'DEVOTIONS' | 'BIBLE_PLANS';

export default function MediaScreen() {
  const [activeTab, setActiveTab] = useState<TabId>('WARTA');
  const [sermons, setSermons] = useState<any[]>([]);
  const [newsletters, setNewsletters] = useState<any[]>([]);
  const [config, setConfig] = useState<any>(null);
  const [todayDevotion, setTodayDevotion] = useState<any>(null);
  const [biblePlans, setBiblePlans] = useState<any[]>([]);
  const [myProgresses, setMyProgresses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [enrollingPlanId, setEnrollingPlanId] = useState<string | null>(null);

  // Detail Bible Plan Modal
  const [detailPlan, setDetailPlan] = useState<any>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  const fetchData = async () => {
    try {
      const [configRes, sermonsRes, newslettersRes, devotionRes, plansRes, progressRes] = await Promise.all([
        client.get('/digital-config'),
        client.get('/sermons'),
        client.get('/newsletters'),
        client.get('/devotions/today'),
        client.get('/bible-plans'),
        client.get('/bible-plans/my/progress')
      ]);
      
      setConfig(configRes.data);
      setSermons(Array.isArray(sermonsRes.data) ? sermonsRes.data : []);
      setNewsletters(Array.isArray(newslettersRes.data) ? newslettersRes.data : []);
      setTodayDevotion(devotionRes.data);
      setBiblePlans(Array.isArray(plansRes.data) ? plansRes.data : []);
      setMyProgresses(Array.isArray(progressRes.data) ? progressRes.data : []);
      
      await Promise.all([
        AsyncStorage.setItem('cached_sermons', JSON.stringify(sermonsRes.data || [])),
        AsyncStorage.setItem('cached_newsletters', JSON.stringify(newslettersRes.data || [])),
        AsyncStorage.setItem('cached_today_devotion', JSON.stringify(devotionRes.data)),
        AsyncStorage.setItem('cached_bible_plans', JSON.stringify(plansRes.data || []))
      ]);
    } catch (err) {
      console.log('Failed to fetch media, loading from cache...');
      const [cachedSermons, cachedNewsletters, cachedDevotion, cachedPlans] = await Promise.all([
        AsyncStorage.getItem('cached_sermons'),
        AsyncStorage.getItem('cached_newsletters'),
        AsyncStorage.getItem('cached_today_devotion'),
        AsyncStorage.getItem('cached_bible_plans')
      ]);
      if (cachedSermons) {
        const parsed = JSON.parse(cachedSermons);
        setSermons(Array.isArray(parsed) ? parsed : []);
      }
      if (cachedNewsletters) {
        const parsed = JSON.parse(cachedNewsletters);
        setNewsletters(Array.isArray(parsed) ? parsed : []);
      }
      if (cachedDevotion) setTodayDevotion(JSON.parse(cachedDevotion));
      if (cachedPlans) {
        const parsed = JSON.parse(cachedPlans);
        setBiblePlans(Array.isArray(parsed) ? parsed : []);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const enrollPlan = async (planId: string) => {
    if (enrollingPlanId) return;
    try {
      setEnrollingPlanId(planId);
      await client.post(`/bible-plans/${planId}/enroll`);
      Alert.alert('Sukses', 'Anda berhasil terdaftar di rencana bacaan ini!');
      await fetchData();
    } catch (err: any) {
      Alert.alert('Gagal', err.response?.data?.error || err.message);
    } finally {
      setEnrollingPlanId(null);
    }
  };

  const openPlanDetail = async (planId: string) => {
    try {
      setLoading(true);
      const res = await client.get(`/bible-plans/${planId}`);
      setDetailPlan(res.data);
      setDetailModalOpen(true);
    } catch (err: any) {
      Alert.alert('Gagal memuat detail', err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleDay = async (planId: string, dayNumber: number, isCompleted: boolean) => {
    try {
      if (isCompleted) {
        await client.post(`/bible-plans/${planId}/uncomplete`, { dayNumber });
      } else {
        await client.post(`/bible-plans/${planId}/complete`, { dayNumber });
      }
      
      // Update local progress list
      const progressRes = await client.get(`/bible-plans/my/progress`);
      setMyProgresses(Array.isArray(progressRes.data) ? progressRes.data : []);
    } catch (err: any) {
      Alert.alert('Gagal memperbarui', err.response?.data?.error || err.message);
    }
  };

  if (loading && !detailModalOpen) return <View style={styles.centered}><ActivityIndicator size="large" color="#8b5cf6" /></View>;

  return (
    <View style={{ flex: 1 }}>
      <ScrollView 
        style={styles.container}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchData} />}
      >
        <Text style={styles.header}>Media & Digital</Text>

        {config?.liveStreamUrl && (
          <TouchableOpacity 
            style={styles.liveCard} 
            onPress={() => Linking.openURL(config.liveStreamUrl)}
          >
            <Text style={styles.liveTitle}>🔴 Join Live Service</Text>
            <Text style={styles.liveSubtitle}>Ibadah sedang atau akan berlangsung. Ketuk untuk bergabung.</Text>
          </TouchableOpacity>
        )}

        {/* Tabs */}
        <View style={styles.tabContainer}>
          {[
            { id: 'WARTA', label: 'Warta' },
            { id: 'SERMONS', label: 'Khotbah' },
            { id: 'DEVOTIONS', label: 'Saat Teduh' },
            { id: 'BIBLE_PLANS', label: 'Rencana Baca' }
          ].map(t => (
            <TouchableOpacity 
              key={t.id}
              style={[styles.tabButton, activeTab === t.id && styles.activeTabButton]}
              onPress={() => setActiveTab(t.id as TabId)}
            >
              <Text style={[styles.tabButtonText, activeTab === t.id && styles.activeTabButtonText]}>
                {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Tab Contents */}
        {activeTab === 'WARTA' && (
          <View>
            {(newsletters || []).length === 0 ? (
              <Text style={styles.empty}>Belum ada warta jemaat terbaru</Text>
            ) : (
              (newsletters || []).map(item => (
                <TouchableOpacity 
                   key={item.id}
                   style={styles.card}
                   onPress={() => item.pdfUrl ? Linking.openURL(item.pdfUrl) : null}
                >
                  <View style={styles.wartaBadge}>
                    <Text style={styles.wartaBadgeText}>WARTA</Text>
                  </View>
                  <Text style={styles.cardTitle}>{item.title}</Text>
                  <Text style={styles.cardText}>
                    Diterbitkan: {(item.publishDate || item.date) ? new Date(item.publishDate || item.date).toLocaleDateString('id-ID', { dateStyle: 'long' }) : '-'}
                  </Text>
                  {item.content && <Text style={styles.cardContent}>{item.content}</Text>}
                  {item.pdfUrl && <Text style={styles.linkText}>Unduh PDF Warta ↗</Text>}
                </TouchableOpacity>
              ))
            )}
          </View>
        )}

        {activeTab === 'SERMONS' && (
          <View>
            {(sermons || []).length === 0 ? (
              <Text style={styles.empty}>Belum ada arsip khotbah</Text>
            ) : (
              (sermons || []).map(item => (
                <TouchableOpacity 
                  key={item.id}
                  style={styles.card}
                  onPress={() => item.videoUrl ? Linking.openURL(item.videoUrl) : null}
                >
                  <Text style={styles.cardTitle}>{item.title}</Text>
                  <Text style={styles.cardText}>{new Date(item.date).toLocaleDateString('id-ID')} • {item.preacher}</Text>
                  {item.videoUrl && <Text style={styles.linkText}>Tonton Video ↗</Text>}
                </TouchableOpacity>
              ))
            )}
          </View>
        )}

        {activeTab === 'DEVOTIONS' && (
          <View>
            {todayDevotion ? (
              <View style={styles.devotionCard}>
                <Text style={styles.devotionDate}>
                  📅 Renungan Hari Ini: {new Date(todayDevotion.publishDate).toLocaleDateString('id-ID', { dateStyle: 'full' })}
                </Text>
                <Text style={styles.devotionTitle}>{todayDevotion.title}</Text>
                <Text style={styles.devotionScripture}>📖 Nats: {todayDevotion.scriptureReference}</Text>
                
                {todayDevotion.passageText && (
                  <View style={styles.passageContainer}>
                    <Text style={styles.passageText}>"{todayDevotion.passageText}"</Text>
                  </View>
                )}
                
                <Text style={styles.devotionContent}>{todayDevotion.content}</Text>
                <Text style={styles.devotionAuthor}>Oleh: {todayDevotion.author}</Text>
              </View>
            ) : (
              <Text style={styles.empty}>Belum ada renungan harian terjadwal untuk hari ini.</Text>
            )}
          </View>
        )}

        {activeTab === 'BIBLE_PLANS' && (
          <View>
            {/* Active reading programs */}
            <Text style={styles.subHeader}>Rencana Bacaan Saya</Text>
            {(myProgresses || []).length === 0 ? (
              <Text style={styles.emptySmall}>Anda belum mengikuti rencana bacaan apapun.</Text>
            ) : (
              (myProgresses || []).filter(Boolean).map(prog => {
                const completed = Array.isArray(prog?.completedDays) ? prog.completedDays : [];
                const total = prog?.plan?.durationDays || 1;
                const percent = Math.round((completed.length / total) * 100);

                return (
                  <TouchableOpacity 
                    key={prog.id} 
                    style={styles.planCardActive} 
                    onPress={() => openPlanDetail(prog.planId)}
                  >
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={styles.planTitle}>{prog?.plan?.title}</Text>
                      <Text style={styles.planBadge}>{percent}%</Text>
                    </View>
                    <Text style={styles.planDesc}>{completed.length} dari {total} hari diselesaikan</Text>
                    
                    {/* Progress Bar */}
                    <View style={styles.progressBg}>
                      <View style={[styles.progressFg, { width: `${percent}%` }]} />
                    </View>
                    <Text style={styles.planLinkText}>Buka Bacaan Harian →</Text>
                  </TouchableOpacity>
                );
              })
            )}

            {/* List of other available plans */}
            <Text style={[styles.subHeader, { marginTop: 20 }]}>Pilihan Rencana Baca Alkitab</Text>
            {(biblePlans || [])
              .filter(Boolean)
              .filter(p => !(myProgresses || []).some(prog => prog?.planId === p?.id))
              .map(plan => (
                <View key={plan.id} style={styles.planCard}>
                  <Text style={styles.planTitle}>{plan.title}</Text>
                  <Text style={styles.planDesc}>{plan.durationDays} Hari • {plan.description || 'Tidak ada deskripsi'}</Text>
                  <TouchableOpacity 
                    style={[styles.enrollButton, enrollingPlanId !== null && { opacity: 0.5 }]}
                    onPress={() => enrollPlan(plan.id)}
                    disabled={enrollingPlanId !== null}
                  >
                    <Text style={styles.enrollButtonText}>
                      {enrollingPlanId === plan.id ? 'Memproses...' : 'Mulai Rencana Bacaan'}
                    </Text>
                  </TouchableOpacity>
                </View>
              ))
            }
            {(biblePlans || [])
              .filter(Boolean)
              .filter(p => !(myProgresses || []).some(prog => prog?.planId === p?.id)).length === 0 && (
              <Text style={styles.emptySmall}>Semua rencana bacaan sudah Anda ikuti.</Text>
            )}
          </View>
        )}
        
        {/* Bottom padding */}
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Bible Reading Plan Detail Modal */}
      {detailPlan && (
        <Modal
          visible={detailModalOpen}
          animationType="slide"
          onRequestClose={() => setDetailModalOpen(false)}
        >
          <View style={{ flex: 1, backgroundColor: '#fff' }}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalHeaderTitle} numberOfLines={1}>{detailPlan.title}</Text>
              <TouchableOpacity onPress={() => setDetailModalOpen(false)} style={styles.closeBtn}>
                <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#64748b' }}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={{ flex: 1, padding: 16 }}>
              <Text style={styles.modalDesc}>{detailPlan.description || 'Selesaikan pembacaan Alkitab Anda hari demi hari.'}</Text>
              
              <View style={{ marginTop: 16, marginBottom: 40 }}>
                {(detailPlan?.days || []).map((day: any) => {
                  const prog = (myProgresses || []).find(p => p?.planId === detailPlan?.id);
                  const completedList: number[] = prog && Array.isArray(prog.completedDays) ? prog.completedDays : [];
                  const isDone = completedList.includes(day.dayNumber);

                  return (
                    <TouchableOpacity 
                      key={day.id} 
                      style={[styles.dayItem, isDone && styles.dayItemDone]}
                      onPress={() => toggleDay(detailPlan.id, day.dayNumber, isDone)}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={styles.dayLabel}>HARI KE-{day.dayNumber}</Text>
                        <Text style={styles.dayPassage}>{day.scripturePassage}</Text>
                      </View>
                      <View style={[styles.checkbox, isDone && styles.checkboxChecked]}>
                        {isDone && <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 12 }}>✓</Text>}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', padding: 16 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { fontSize: 24, fontWeight: 'bold', color: '#1e293b', marginBottom: 16, marginTop: 40 },
  subHeader: { fontSize: 16, fontWeight: 'bold', color: '#475569', marginBottom: 12, marginTop: 10 },
  liveCard: { backgroundColor: '#ef4444', padding: 20, borderRadius: 16, marginBottom: 24, shadowColor: '#ef4444', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
  liveTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff', marginBottom: 4 },
  liveSubtitle: { fontSize: 14, color: '#fee2e2' },
  card: { backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#0f172a', marginBottom: 4 },
  cardText: { fontSize: 12, color: '#64748b' },
  cardContent: { fontSize: 13, color: '#475569', marginTop: 6, lineHeight: 18 },
  linkText: { fontSize: 12, color: '#8b5cf6', marginTop: 8, fontWeight: 'bold' },
  empty: { textAlign: 'center', color: '#94a3b8', marginTop: 32, marginBottom: 16, fontStyle: 'italic', paddingHorizontal: 20, fontSize: 14 },
  emptySmall: { color: '#94a3b8', fontStyle: 'italic', fontSize: 12, marginBottom: 12 },
  wartaBadge: { alignSelf: 'flex-start', backgroundColor: '#e0e7ff', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, marginBottom: 6 },
  wartaBadgeText: { fontSize: 10, fontWeight: 'bold', color: '#4f46e5' },

  // Devotion styles
  devotionCard: { backgroundColor: '#fff', padding: 20, borderRadius: 16, borderLeftWidth: 5, borderLeftColor: '#8b5cf6', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  devotionDate: { fontSize: 11, fontWeight: 'bold', color: '#8b5cf6', textTransform: 'uppercase' },
  devotionTitle: { fontSize: 20, fontWeight: '800', color: '#0f172a', marginTop: 6, marginBottom: 4 },
  devotionScripture: { fontSize: 13, fontWeight: 'bold', color: '#475569', marginBottom: 12 },
  passageContainer: { backgroundColor: '#f1f5f9', padding: 12, borderRadius: 10, marginBottom: 14, borderLeftWidth: 3, borderLeftColor: '#cbd5e1' },
  passageText: { fontSize: 12, color: '#64748b', fontStyle: 'italic', lineHeight: 18 },
  devotionContent: { fontSize: 14, color: '#334155', lineHeight: 22, marginBottom: 16, textAlign: 'justify' },
  devotionAuthor: { fontSize: 12, fontWeight: 'bold', color: '#64748b', fontStyle: 'italic', textAlign: 'right' },

  // Bible plans styles
  planCard: { backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 12, borderLeftWidth: 4, borderLeftColor: '#e2e8f0', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  planCardActive: { backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 12, borderLeftWidth: 4, borderLeftColor: '#8b5cf6', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2 },
  planTitle: { fontSize: 15, fontWeight: 'bold', color: '#0f172a', flex: 1 },
  planDesc: { fontSize: 12, color: '#64748b', marginTop: 4 },
  planBadge: { backgroundColor: '#f3e8ff', color: '#8b5cf6', fontSize: 11, fontWeight: '800', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, overflow: 'hidden' },
  enrollButton: { backgroundColor: '#8b5cf6', alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, marginTop: 10 },
  enrollButtonText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  progressBg: { height: 6, backgroundColor: '#f1f5f9', borderRadius: 3, marginTop: 10, overflow: 'hidden' },
  progressFg: { height: '100%', backgroundColor: '#8b5cf6', borderRadius: 3 },
  planLinkText: { fontSize: 12, color: '#8b5cf6', marginTop: 10, fontWeight: 'bold' },

  // Modal styles
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  modalHeaderTitle: { fontSize: 18, fontWeight: 'bold', color: '#0f172a', flex: 1, marginRight: 10 },
  closeBtn: { padding: 4 },
  modalDesc: { fontSize: 13, color: '#64748b', lineHeight: 18, marginBottom: 16 },
  dayItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  dayItemDone: { backgroundColor: '#f8fafc' },
  dayLabel: { fontSize: 10, fontWeight: 'bold', color: '#94a3b8' },
  dayPassage: { fontSize: 14, fontWeight: 'bold', color: '#334155', marginTop: 2 },
  checkbox: { width: 22, height: 22, borderWidth: 2, borderColor: '#cbd5e1', borderRadius: 6, justifyContent: 'center', alignItems: 'center' },
  checkboxChecked: { backgroundColor: '#10b981', borderColor: '#10b981' },

  // Tabs style
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#e2e8f0',
    padding: 4,
    borderRadius: 14,
    marginBottom: 20
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
  tabButtonText: { fontSize: 11, fontWeight: 'bold', color: '#64748b' },
  activeTabButtonText: { color: '#0f172a' }
});
