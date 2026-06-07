import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, RefreshControl, TouchableOpacity, Modal } from 'react-native';
import { client } from '../api/client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CounselingScreen from './CounselingScreen';
import FacilityBookingScreen from './FacilityBookingScreen';
import PrayerScreen from './PrayerScreen';
import MinistryScreen from './MinistryScreen';
import SmallGroupScreen from './SmallGroupScreen';
import SacramentRequestScreen from './SacramentRequestScreen';

export default function HomeScreen() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [isCounselingOpen, setIsCounselingOpen] = useState(false);
  const [isFacilityOpen, setIsFacilityOpen] = useState(false);
  const [isPrayerOpen, setIsPrayerOpen] = useState(false);
  const [isMinistryOpen, setIsMinistryOpen] = useState(false);
  const [isSmallGroupOpen, setIsSmallGroupOpen] = useState(false);
  const [isSacramentOpen, setIsSacramentOpen] = useState(false);

  const fetchEvents = async () => {
    try {
      const res = await client.get('/events');
      setEvents(res.data);
      // Cache for offline
      await AsyncStorage.setItem('cached_events', JSON.stringify(res.data));
    } catch (err) {
      console.log('Failed to fetch, loading from cache...');
      const cached = await AsyncStorage.getItem('cached_events');
      if (cached) setEvents(JSON.parse(cached));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const handleRegister = async (eventId: string) => {
    setActionLoading(true);
    try {
      await client.post(`/events/${eventId}/register`);
      alert('Pendaftaran berhasil dilakukan!');
      await fetchEvents();
    } catch (err: any) {
      alert(err.response?.data?.error || err.message || 'Pendaftaran gagal');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCheckIn = async (eventId: string) => {
    setActionLoading(true);
    try {
      await client.post(`/events/${eventId}/checkin`);
      alert('Check-in berhasil! Selamat menikmati acara.');
      await fetchEvents();
    } catch (err: any) {
      alert(err.response?.data?.error || err.message || 'Check-in gagal');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color="#3b82f6" /></View>;

  return (
    <View style={styles.container}>
      {actionLoading && (
        <View style={styles.overlay}>
          <ActivityIndicator size="large" color="#3b82f6" />
        </View>
      )}

      <FlatList
        data={events}
        keyExtractor={item => item.id}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchEvents} />}
        ListHeaderComponent={
          <View>
            {/* Quick Actions Grid */}
            <Text style={styles.gridSectionHeader}>Layanan Jemaat</Text>
            <View style={styles.gridContainer}>
              <View style={styles.gridRow}>
                <TouchableOpacity style={[styles.gridItem, styles.bgBlue]} onPress={() => setIsCounselingOpen(true)}>
                  <View style={[styles.iconCircle, styles.circleBlue]}>
                    <Text style={styles.gridIcon}>🕊️</Text>
                  </View>
                  <Text style={styles.gridTitle}>Konseling</Text>
                  <Text style={styles.gridSubtitle}>Bimbingan</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.gridItem, styles.bgGreen]} onPress={() => setIsFacilityOpen(true)}>
                  <View style={[styles.iconCircle, styles.circleGreen]}>
                    <Text style={styles.gridIcon}>🏢</Text>
                  </View>
                  <Text style={styles.gridTitle}>Ruangan</Text>
                  <Text style={styles.gridSubtitle}>Peminjaman</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.gridRow}>
                <TouchableOpacity style={[styles.gridItem, styles.bgAmber]} onPress={() => setIsPrayerOpen(true)}>
                  <View style={[styles.iconCircle, styles.circleAmber]}>
                    <Text style={styles.gridIcon}>🙏</Text>
                  </View>
                  <Text style={styles.gridTitle}>Doa</Text>
                  <Text style={styles.gridSubtitle}>Pokok Doa</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.gridItem, styles.bgIndigo]} onPress={() => setIsMinistryOpen(true)}>
                  <View style={[styles.iconCircle, styles.circleIndigo]}>
                    <Text style={styles.gridIcon}>👥</Text>
                  </View>
                  <Text style={styles.gridTitle}>Pelayanan</Text>
                  <Text style={styles.gridSubtitle}>Jadwal Roster</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.gridRow}>
                <TouchableOpacity style={[styles.gridItem, styles.bgRose]} onPress={() => setIsSmallGroupOpen(true)}>
                  <View style={[styles.iconCircle, styles.circleRose]}>
                    <Text style={styles.gridIcon}>🏠</Text>
                  </View>
                  <Text style={styles.gridTitle}>Kelompok Sel</Text>
                  <Text style={styles.gridSubtitle}>Cari & Gabung Komunitas</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.gridItem, styles.bgViolet]} onPress={() => setIsSacramentOpen(true)}>
                  <View style={[styles.iconCircle, styles.circleViolet]}>
                    <Text style={styles.gridIcon}>📜</Text>
                  </View>
                  <Text style={styles.gridTitle}>Sakramen</Text>
                  <Text style={styles.gridSubtitle}>Pengajuan & Sertifikat</Text>
                </TouchableOpacity>
              </View>
            </View>

            <Text style={styles.header}>Upcoming Events</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>{item.name}</Text>
              {item.registrationStatus && (
                <View style={[
                  styles.statusBadge,
                  item.registrationStatus === 'ATTENDED' && styles.statusAttended,
                  item.registrationStatus === 'WAITLISTED' && styles.statusWaitlisted,
                  item.registrationStatus === 'REGISTERED' && styles.statusRegistered,
                ]}>
                  <Text style={styles.statusText}>
                    {item.registrationStatus === 'ATTENDED' ? 'Hadir' : 
                     item.registrationStatus === 'WAITLISTED' ? 'Daftar Tunggu' : 'Terdaftar'}
                  </Text>
                </View>
              )}
            </View>

            {item.location && <Text style={styles.cardText}>📍 {item.location}</Text>}
            {item.startTime && <Text style={styles.cardText}>⏰ {item.startTime}</Text>}
            <Text style={styles.cardText}>👥 {item.registrantCount || 0} Pendaftar</Text>

            {item.description && (
              <View style={styles.descContainer}>
                <Text style={styles.cardDesc}>{item.description}</Text>
              </View>
            )}

            <View style={styles.actionContainer}>
              {item.registrationStatus === 'ATTENDED' ? (
                <View style={styles.checkedInBadge}>
                  <Text style={styles.checkedInText}>✓ Anda sudah melakukan check-in</Text>
                </View>
              ) : item.isRegistered ? (
                <TouchableOpacity 
                  style={styles.checkinBtn} 
                  onPress={() => handleCheckIn(item.id)}
                  disabled={actionLoading}
                >
                  <Text style={styles.checkinBtnText}>Check In Kehadiran</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity 
                  style={styles.registerBtn} 
                  onPress={() => handleRegister(item.id)}
                  disabled={actionLoading}
                >
                  <Text style={styles.registerBtnText}>Daftar Acara</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>Belum ada acara mendatang</Text>}
      />

      <Modal
        visible={isCounselingOpen}
        animationType="slide"
        onRequestClose={() => setIsCounselingOpen(false)}
      >
        <CounselingScreen onClose={() => setIsCounselingOpen(false)} />
      </Modal>

      <Modal
        visible={isFacilityOpen}
        animationType="slide"
        onRequestClose={() => setIsFacilityOpen(false)}
      >
        <FacilityBookingScreen onClose={() => setIsFacilityOpen(false)} />
      </Modal>

      <Modal
        visible={isPrayerOpen}
        animationType="slide"
        onRequestClose={() => setIsPrayerOpen(false)}
      >
        <PrayerScreen onClose={() => setIsPrayerOpen(false)} />
      </Modal>

      <Modal
        visible={isMinistryOpen}
        animationType="slide"
        onRequestClose={() => setIsMinistryOpen(false)}
      >
        <MinistryScreen onClose={() => setIsMinistryOpen(false)} />
      </Modal>

      <Modal
        visible={isSmallGroupOpen}
        animationType="slide"
        onRequestClose={() => setIsSmallGroupOpen(false)}
      >
        <SmallGroupScreen onClose={() => setIsSmallGroupOpen(false)} />
      </Modal>

      <Modal
        visible={isSacramentOpen}
        animationType="slide"
        onRequestClose={() => setIsSacramentOpen(false)}
      >
        <SacramentRequestScreen onClose={() => setIsSacramentOpen(false)} />
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', padding: 16 },
  gridSectionHeader: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 32,
    marginBottom: 10
  },
  gridContainer: {
    marginBottom: 16
  },
  gridRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12
  },
  gridItem: {
    flex: 1,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 2
  },
  bgBlue: { backgroundColor: '#eff6ff', borderColor: '#bfdbfe' },
  bgGreen: { backgroundColor: '#ecfdf5', borderColor: '#a7f3d0' },
  bgAmber: { backgroundColor: '#fffbeb', borderColor: '#fde68a' },
  bgIndigo: { backgroundColor: '#eef2ff', borderColor: '#c7d2fe' },
  bgRose: { backgroundColor: '#fff1f2', borderColor: '#fecdd3' },
  bgViolet: { backgroundColor: '#faf5ff', borderColor: '#e9d5ff' },
  
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8
  },
  circleBlue: { backgroundColor: '#dbeafe' },
  circleGreen: { backgroundColor: '#d1fae5' },
  circleAmber: { backgroundColor: '#fef3c7' },
  circleIndigo: { backgroundColor: '#e0e7ff' },
  circleRose: { backgroundColor: '#ffe4e6' },
  circleViolet: { backgroundColor: '#f3e8ff' },
  
  gridIcon: { fontSize: 16 },
  gridTitle: { fontSize: 13, fontWeight: 'bold', color: '#0f172a' },
  gridSubtitle: { fontSize: 10, color: '#64748b', marginTop: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { fontSize: 20, fontWeight: 'bold', color: '#1e293b', marginBottom: 12, marginTop: 12 },
  overlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999
  },
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
    alignItems: 'flex-start',
    marginBottom: 8
  },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#0f172a', flex: 1, marginRight: 8 },
  cardText: { fontSize: 14, color: '#64748b', marginTop: 6, fontWeight: '500' },
  descContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9'
  },
  cardDesc: { fontSize: 14, color: '#475569', lineHeight: 20 },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusRegistered: { backgroundColor: '#dbeafe' },
  statusWaitlisted: { backgroundColor: '#fef3c7' },
  statusAttended: { backgroundColor: '#dcfce7' },
  statusText: { fontSize: 11, fontWeight: 'bold', color: '#1e293b' },
  actionContainer: {
    marginTop: 16,
  },
  registerBtn: {
    backgroundColor: '#3b82f6',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center'
  },
  registerBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold'
  },
  checkinBtn: {
    backgroundColor: '#10b981',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center'
  },
  checkinBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold'
  },
  checkedInBadge: {
    backgroundColor: '#f0fdf4',
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#bbf7d0'
  },
  checkedInText: {
    color: '#166534',
    fontSize: 13,
    fontWeight: '600'
  },
  empty: { textAlign: 'center', color: '#94a3b8', marginTop: 32 }
});
