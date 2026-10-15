import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Modal,
  Platform,
} from 'react-native';
import { client } from '../api/client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import CounselingScreen from './CounselingScreen';
import FacilityBookingScreen from './FacilityBookingScreen';
import PrayerScreen from './PrayerScreen';
import MinistryScreen from './MinistryScreen';
import SmallGroupScreen from './SmallGroupScreen';
import SacramentRequestScreen from './SacramentRequestScreen';
import GameScreen from './GameScreen';
import { HolyGraceColors, Shadows } from '../theme/colors';

export default function HomeScreen() {
  const [events, setEvents] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Modals state
  const [isCounselingOpen, setIsCounselingOpen] = useState(false);
  const [isFacilityOpen, setIsFacilityOpen] = useState(false);
  const [isPrayerOpen, setIsPrayerOpen] = useState(false);
  const [isMinistryOpen, setIsMinistryOpen] = useState(false);
  const [isSmallGroupOpen, setIsSmallGroupOpen] = useState(false);
  const [isSacramentOpen, setIsSacramentOpen] = useState(false);
  const [isGameOpen, setIsGameOpen] = useState(false);

  const fetchProfile = async () => {
    try {
      const res = await client.get('/profile');
      setProfile(res.data);
      await AsyncStorage.setItem('cached_profile', JSON.stringify(res.data));
    } catch {
      const cached = await AsyncStorage.getItem('cached_profile');
      if (cached) setProfile(JSON.parse(cached));
    }
  };

  const fetchEvents = async () => {
    try {
      const res = await client.get('/events');
      setEvents(res.data);
      await AsyncStorage.setItem('cached_events', JSON.stringify(res.data));
    } catch (err) {
      console.log('Failed to fetch events, loading from cache...', err);
      const cached = await AsyncStorage.getItem('cached_events');
      if (cached) setEvents(JSON.parse(cached));
    }
  };

  const loadAllData = async () => {
    await Promise.all([fetchEvents(), fetchProfile()]);
    setLoading(false);
  };

  useEffect(() => {
    loadAllData();
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

  // Helper date formatters
  const getTodayFormatted = () => {
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const months = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    const now = new Date();
    return `${days[now.getDay()]}, ${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;
  };

  const parseEventDate = (dateStr?: string) => {
    if (!dateStr) return { day: '•', month: 'ACARA' };
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return { day: '•', month: 'ACARA' };
      const months = ['JAN', 'FEB', 'MAR', 'APR', 'MEI', 'JUN', 'JUL', 'AGU', 'SEP', 'OKT', 'NOV', 'DES'];
      return {
        day: String(d.getDate()).padStart(2, '0'),
        month: months[d.getMonth()],
      };
    } catch {
      return { day: '•', month: 'ACARA' };
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={HolyGraceColors.navySecondary} />
      </View>
    );
  }

  const services = [
    {
      id: 'counseling',
      title: 'Konseling',
      subtitle: 'Bimbingan Jiwa',
      icon: 'chatbubbles-outline' as const,
      color: HolyGraceColors.blueAccent,
      bg: HolyGraceColors.blueLight,
      border: HolyGraceColors.blueBorder,
      onPress: () => setIsCounselingOpen(true),
    },
    {
      id: 'facility',
      title: 'Ruangan',
      subtitle: 'Peminjaman',
      icon: 'business-outline' as const,
      color: HolyGraceColors.teal,
      bg: HolyGraceColors.tealLight,
      border: '#99F6E4',
      onPress: () => setIsFacilityOpen(true),
    },
    {
      id: 'prayer',
      title: 'Pokok Doa',
      subtitle: 'Dukungan Doa',
      icon: 'heart-outline' as const,
      color: HolyGraceColors.goldPrimary,
      bg: HolyGraceColors.goldLight,
      border: HolyGraceColors.goldBorder,
      onPress: () => setIsPrayerOpen(true),
    },
    {
      id: 'ministry',
      title: 'Pelayanan',
      subtitle: 'Jadwal Roster',
      icon: 'people-outline' as const,
      color: HolyGraceColors.purple,
      bg: HolyGraceColors.purpleLight,
      border: '#DDD6FE',
      onPress: () => setIsMinistryOpen(true),
    },
    {
      id: 'smallgroup',
      title: 'Kelompok Sel',
      subtitle: 'Komunitas',
      icon: 'home-outline' as const,
      color: HolyGraceColors.rose,
      bg: HolyGraceColors.roseLight,
      border: '#FECDD3',
      onPress: () => setIsSmallGroupOpen(true),
    },
    {
      id: 'sacrament',
      title: 'Sakramen',
      subtitle: 'Baptis & Sidi',
      icon: 'ribbon-outline' as const,
      color: '#4F46E5',
      bg: '#EEF2FF',
      border: '#C7D2FE',
      onPress: () => setIsSacramentOpen(true),
    },
    {
      id: 'game',
      title: 'Game Alkitab',
      subtitle: 'Kuis Harian',
      icon: 'game-controller-outline' as const,
      color: '#EA580C',
      bg: '#FFF7ED',
      border: '#FFEDD5',
      onPress: () => setIsGameOpen(true),
    },
    {
      id: 'attendance',
      title: 'Kehadiran',
      subtitle: 'Check-In Acara',
      icon: 'qr-code-outline' as const,
      color: HolyGraceColors.navySecondary,
      bg: '#F1F5F9',
      border: HolyGraceColors.border,
      onPress: () => {
        if (events.length > 0) {
          alert('Pilih acara di bawah untuk melakukan check-in.');
        } else {
          alert('Belum ada acara aktif yang memerlukan check-in saat ini.');
        }
      },
    },
  ];

  return (
    <View style={styles.container}>
      {actionLoading && (
        <View style={styles.overlay}>
          <ActivityIndicator size="large" color={HolyGraceColors.navySecondary} />
        </View>
      )}

      <FlatList
        data={events}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={loadAllData}
            colors={[HolyGraceColors.navySecondary]}
          />
        }
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View>
            {/* 1. Shalom & Scripture Hero Banner Card */}
            <View style={styles.heroCard}>
              <View style={styles.heroHeaderRow}>
                <View style={styles.greetingContainer}>
                  <Text style={styles.heroDateBadge}>{getTodayFormatted()}</Text>
                  <Text style={styles.heroGreetingText}>
                    Shalom, {profile?.firstName || 'Jemaat'} 🙏
                  </Text>
                </View>
                <View style={styles.crossEmblem}>
                  <Ionicons name="sunny" size={20} color={HolyGraceColors.goldAccent} />
                </View>
              </View>

              <View style={styles.scriptureBox}>
                <View style={styles.scriptureQuoteRow}>
                  <Text style={styles.scriptureQuoteSymbol}>“</Text>
                  <Text style={styles.scriptureText}>
                    Sebab Aku ini mengetahui rancangan-rancangan apa yang ada pada-Ku mengenai kamu, yaitu rancangan damai sejahtera dan bukan rancangan kecelakaan, untuk memberikan kepadamu hari depan yang penuh harapan.
                  </Text>
                </View>
                <View style={styles.scriptureRefRow}>
                  <Ionicons name="bookmark-outline" size={13} color={HolyGraceColors.goldPrimary} />
                  <Text style={styles.scriptureRef}>Yeremia 29:11</Text>
                </View>
              </View>
            </View>

            {/* 2. Quick Services Section */}
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Layanan Jemaat</Text>
              <Text style={styles.sectionSubtitle}>Akses Cepat</Text>
            </View>

            <View style={styles.servicesGrid}>
              {services.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.serviceItem}
                  onPress={item.onPress}
                  activeOpacity={0.7}
                >
                  <View style={[styles.serviceIconContainer, { backgroundColor: item.bg, borderColor: item.border }]}>
                    <Ionicons name={item.icon} size={22} color={item.color} />
                  </View>
                  <Text style={styles.serviceItemTitle} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={styles.serviceItemSubtitle} numberOfLines={1}>
                    {item.subtitle}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* 3. Upcoming Events Header */}
            <View style={[styles.sectionHeaderRow, { marginTop: 28 }]}>
              <View>
                <Text style={styles.sectionTitle}>Jadwal Ibadah & Acara</Text>
                <Text style={styles.sectionSubtitle}>Kegiatan mendatang di gereja</Text>
              </View>
              {events.length > 0 && (
                <View style={styles.countBadge}>
                  <Text style={styles.countBadgeText}>{events.length} Acara</Text>
                </View>
              )}
            </View>
          </View>
        }
        renderItem={({ item }) => {
          const dateBadge = parseEventDate(item.startTime || item.date);

          return (
            <View style={styles.eventCard}>
              <View style={styles.eventCardTop}>
                {/* Mini Calendar Tile */}
                <View style={styles.dateTile}>
                  <View style={styles.dateTileHeader}>
                    <Text style={styles.dateTileMonth}>{dateBadge.month}</Text>
                  </View>
                  <View style={styles.dateTileBody}>
                    <Text style={styles.dateTileDay}>{dateBadge.day}</Text>
                  </View>
                </View>

                {/* Event Core Info */}
                <View style={styles.eventInfoContainer}>
                  <View style={styles.eventTitleRow}>
                    <Text style={styles.eventCardTitle} numberOfLines={2}>
                      {item.name}
                    </Text>
                  </View>

                  {/* Status Badge if present */}
                  {item.registrationStatus && (
                    <View
                      style={[
                        styles.statusBadge,
                        item.registrationStatus === 'ATTENDED' && styles.statusAttended,
                        item.registrationStatus === 'WAITLISTED' && styles.statusWaitlisted,
                        item.registrationStatus === 'REGISTERED' && styles.statusRegistered,
                      ]}
                    >
                      <Text style={styles.statusText}>
                        {item.registrationStatus === 'ATTENDED'
                          ? '✓ Hadir'
                          : item.registrationStatus === 'WAITLISTED'
                          ? 'Daftar Tunggu'
                          : 'Terdaftar'}
                      </Text>
                    </View>
                  )}

                  {/* Meta items */}
                  <View style={styles.eventMetaRow}>
                    {item.startTime && (
                      <View style={styles.metaItem}>
                        <Ionicons name="time-outline" size={13} color={HolyGraceColors.textMuted} />
                        <Text style={styles.metaText} numberOfLines={1}>
                          {item.startTime}
                        </Text>
                      </View>
                    )}
                    {item.location && (
                      <View style={styles.metaItem}>
                        <Ionicons name="location-outline" size={13} color={HolyGraceColors.textMuted} />
                        <Text style={styles.metaText} numberOfLines={1}>
                          {item.location}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>

              {/* Description Snippet if available */}
              {item.description && (
                <Text style={styles.eventDesc} numberOfLines={2}>
                  {item.description}
                </Text>
              )}

              {/* Action Button */}
              <View style={styles.eventActionContainer}>
                {item.registrationStatus === 'ATTENDED' ? (
                  <View style={styles.checkedInBadge}>
                    <Ionicons name="checkmark-circle" size={16} color={HolyGraceColors.successText} />
                    <Text style={styles.checkedInText}>Kehadiran Anda Telah Dicatat</Text>
                  </View>
                ) : item.isRegistered ? (
                  <TouchableOpacity
                    style={styles.checkinBtn}
                    onPress={() => handleCheckIn(item.id)}
                    disabled={actionLoading}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="scan-outline" size={16} color="#fff" />
                    <Text style={styles.checkinBtnText}>Check In Sekarang</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={styles.registerBtn}
                    onPress={() => handleRegister(item.id)}
                    disabled={actionLoading}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.registerBtnText}>Daftar Acara</Text>
                    <Ionicons name="arrow-forward" size={15} color="#fff" />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyCard}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name="calendar-outline" size={28} color={HolyGraceColors.textMuted} />
            </View>
            <Text style={styles.emptyTitle}>Belum Ada Acara</Text>
            <Text style={styles.emptySubtitle}>
              Kegiatan ibadah dan persekutuan mendatang akan ditampilkan di sini.
            </Text>
          </View>
        }
      />

      {/* Modals */}
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

      <Modal
        visible={isGameOpen}
        animationType="slide"
        onRequestClose={() => setIsGameOpen(false)}
      >
        <GameScreen onClose={() => setIsGameOpen(false)} />
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: HolyGraceColors.background,
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: HolyGraceColors.background,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },

  // 1. Hero Card
  heroCard: {
    backgroundColor: HolyGraceColors.navyDark,
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(217, 119, 6, 0.3)',
    ...Shadows.lg,
    marginBottom: 24,
  },
  heroHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  greetingContainer: {
    flex: 1,
  },
  heroDateBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: HolyGraceColors.goldAccent,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 3,
  },
  heroGreetingText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  crossEmblem: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(217, 119, 6, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(217, 119, 6, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scriptureBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  scriptureQuoteRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  scriptureQuoteSymbol: {
    fontSize: 24,
    lineHeight: 22,
    fontWeight: '900',
    color: HolyGraceColors.goldAccent,
    marginRight: 6,
    marginTop: -2,
  },
  scriptureText: {
    fontSize: 12.5,
    lineHeight: 19,
    color: '#E2E8F0',
    fontStyle: 'italic',
    flex: 1,
  },
  scriptureRefRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
    justifyContent: 'flex-end',
  },
  scriptureRef: {
    fontSize: 11,
    fontWeight: '700',
    color: HolyGraceColors.goldAccent,
  },

  // Section Headers
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: HolyGraceColors.textPrimary,
    letterSpacing: -0.2,
  },
  sectionSubtitle: {
    fontSize: 11,
    fontWeight: '600',
    color: HolyGraceColors.textMuted,
    marginTop: 2,
  },
  countBadge: {
    backgroundColor: HolyGraceColors.blueLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  countBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: HolyGraceColors.blueAccent,
  },

  // 2. Services Grid (4 Columns)
  servicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'space-between',
  },
  serviceItem: {
    width: '23%',
    backgroundColor: HolyGraceColors.surface,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: HolyGraceColors.borderLight,
    ...Shadows.sm,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as const } : {}),
  },
  serviceIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    borderWidth: 1,
  },
  serviceItemTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: HolyGraceColors.textPrimary,
    textAlign: 'center',
  },
  serviceItemSubtitle: {
    fontSize: 9,
    color: HolyGraceColors.textMuted,
    textAlign: 'center',
    marginTop: 2,
  },

  // 3. Event Cards
  eventCard: {
    backgroundColor: HolyGraceColors.surface,
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: HolyGraceColors.border,
    ...Shadows.card,
  },
  eventCardTop: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  dateTile: {
    width: 52,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: HolyGraceColors.blueBorder,
    backgroundColor: HolyGraceColors.surface,
    alignItems: 'center',
  },
  dateTileHeader: {
    width: '100%',
    backgroundColor: HolyGraceColors.navySecondary,
    paddingVertical: 3,
    alignItems: 'center',
  },
  dateTileMonth: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  dateTileBody: {
    paddingVertical: 6,
    alignItems: 'center',
  },
  dateTileDay: {
    fontSize: 16,
    fontWeight: '800',
    color: HolyGraceColors.navyPrimary,
  },
  eventInfoContainer: {
    flex: 1,
  },
  eventTitleRow: {
    marginBottom: 4,
  },
  eventCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: HolyGraceColors.textPrimary,
    lineHeight: 21,
  },
  eventMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 6,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 11.5,
    color: HolyGraceColors.textSecondary,
    fontWeight: '500',
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 4,
    marginBottom: 2,
  },
  statusRegistered: {
    backgroundColor: HolyGraceColors.blueLight,
  },
  statusWaitlisted: {
    backgroundColor: HolyGraceColors.warningLight,
  },
  statusAttended: {
    backgroundColor: HolyGraceColors.successLight,
  },
  statusText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: HolyGraceColors.navyPrimary,
  },
  eventDesc: {
    fontSize: 12.5,
    lineHeight: 18,
    color: HolyGraceColors.textSecondary,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: HolyGraceColors.borderLight,
  },
  eventActionContainer: {
    marginTop: 14,
  },
  registerBtn: {
    backgroundColor: HolyGraceColors.navySecondary,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as const } : {}),
  },
  registerBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  checkinBtn: {
    backgroundColor: HolyGraceColors.teal,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as const } : {}),
  },
  checkinBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  checkedInBadge: {
    backgroundColor: HolyGraceColors.successLight,
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: HolyGraceColors.successBorder,
  },
  checkedInText: {
    color: HolyGraceColors.successText,
    fontSize: 12,
    fontWeight: '700',
  },

  // Empty State
  emptyCard: {
    backgroundColor: HolyGraceColors.surface,
    borderRadius: 18,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: HolyGraceColors.borderLight,
    marginTop: 10,
  },
  emptyIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: HolyGraceColors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: HolyGraceColors.textPrimary,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 12,
    color: HolyGraceColors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 16,
  },
});
