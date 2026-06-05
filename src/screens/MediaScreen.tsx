import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Linking, TouchableOpacity, RefreshControl } from 'react-native';
import { client } from '../api/client';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function MediaScreen() {
  const [activeTab, setActiveTab] = useState<'WARTA' | 'SERMONS'>('WARTA');
  const [sermons, setSermons] = useState<any[]>([]);
  const [newsletters, setNewsletters] = useState<any[]>([]);
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [configRes, sermonsRes, newslettersRes] = await Promise.all([
        client.get('/digital-config'),
        client.get('/sermons'),
        client.get('/newsletters')
      ]);
      setConfig(configRes.data);
      setSermons(sermonsRes.data);
      setNewsletters(newslettersRes.data);
      
      await Promise.all([
        AsyncStorage.setItem('cached_sermons', JSON.stringify(sermonsRes.data)),
        AsyncStorage.setItem('cached_newsletters', JSON.stringify(newslettersRes.data))
      ]);
    } catch (err) {
      console.log('Failed to fetch media, loading from cache...');
      const [cachedSermons, cachedNewsletters] = await Promise.all([
        AsyncStorage.getItem('cached_sermons'),
        AsyncStorage.getItem('cached_newsletters')
      ]);
      if (cachedSermons) setSermons(JSON.parse(cachedSermons));
      if (cachedNewsletters) setNewsletters(JSON.parse(cachedNewsletters));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color="#8b5cf6" /></View>;

  return (
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
        <TouchableOpacity 
          style={[styles.tabButton, activeTab === 'WARTA' && styles.activeTabButton]}
          onPress={() => setActiveTab('WARTA')}
        >
          <Text style={[styles.tabButtonText, activeTab === 'WARTA' && styles.activeTabButtonText]}>
            Warta Jemaat
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tabButton, activeTab === 'SERMONS' && styles.activeTabButton]}
          onPress={() => setActiveTab('SERMONS')}
        >
          <Text style={[styles.tabButtonText, activeTab === 'SERMONS' && styles.activeTabButtonText]}>
            Arsip Khotbah
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab Contents */}
      {activeTab === 'WARTA' ? (
        <View>
          {newsletters.length === 0 ? (
            <Text style={styles.empty}>Belum ada warta jemaat terbaru</Text>
          ) : (
            newsletters.map(item => (
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
                  Diterbitkan: {item.date ? new Date(item.date).toLocaleDateString('id-ID', { dateStyle: 'long' }) : '-'}
                </Text>
                {item.content && <Text style={styles.cardContent}>{item.content}</Text>}
                {item.pdfUrl && <Text style={styles.linkText}>Unduh PDF Warta ↗</Text>}
              </TouchableOpacity>
            ))
          )}
        </View>
      ) : (
        <View>
          {sermons.length === 0 ? (
            <Text style={styles.empty}>Belum ada arsip khotbah</Text>
          ) : (
            sermons.map(item => (
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
      
      {/* Bottom padding */}
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', padding: 16 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { fontSize: 24, fontWeight: 'bold', color: '#1e293b', marginBottom: 16, marginTop: 40 },
  subHeader: { fontSize: 18, fontWeight: 'bold', color: '#475569', marginBottom: 12 },
  liveCard: { backgroundColor: '#ef4444', padding: 20, borderRadius: 16, marginBottom: 24, shadowColor: '#ef4444', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
  liveTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff', marginBottom: 4 },
  liveSubtitle: { fontSize: 14, color: '#fee2e2' },
  card: { backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#0f172a', marginBottom: 4 },
  cardText: { fontSize: 12, color: '#64748b' },
  cardContent: { fontSize: 13, color: '#475569', marginTop: 6, lineHeight: 18 },
  linkText: { fontSize: 12, color: '#8b5cf6', marginTop: 8, fontWeight: 'bold' },
  empty: { textAlign: 'center', color: '#94a3b8', marginTop: 16, marginBottom: 16, fontStyle: 'italic' },
  wartaBadge: { alignSelf: 'flex-start', backgroundColor: '#e0e7ff', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, marginBottom: 6 },
  wartaBadgeText: { fontSize: 10, fontWeight: 'bold', color: '#4f46e5' },

  // Tabs style matching the other screens
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
  tabButtonText: { fontSize: 12, fontWeight: 'bold', color: '#64748b' },
  activeTabButtonText: { color: '#0f172a' }
});
