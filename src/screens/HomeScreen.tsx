import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, RefreshControl, TouchableOpacity } from 'react-native';
import { client } from '../api/client';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function HomeScreen() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

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
      <Text style={styles.header}>Upcoming Events</Text>
      
      {actionLoading && (
        <View style={styles.overlay}>
          <ActivityIndicator size="large" color="#3b82f6" />
        </View>
      )}

      <FlatList
        data={events}
        keyExtractor={item => item.id}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchEvents} />}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', padding: 16 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { fontSize: 24, fontWeight: 'bold', color: '#1e293b', marginBottom: 16, marginTop: 40 },
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
