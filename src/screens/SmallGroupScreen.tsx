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
  Platform,
  ScrollView,
  Image,
} from 'react-native';
import { client, SERVER_BASE_URL } from '../api/client';
import { Ionicons } from '@expo/vector-icons';
import { HolyGraceColors, Shadows } from '../theme/colors';

interface SmallGroupScreenProps {
  onClose?: () => void;
}

export default function SmallGroupScreen({ onClose }: SmallGroupScreenProps) {
  // Main view mode: 'DISCOVER' for general member search, 'LEADER' for Leader Portal
  const [viewMode, setViewMode] = useState<'DISCOVER' | 'LEADER'>('DISCOVER');

  // Discover Groups State
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<'ALL' | 'CELL_GROUP' | 'FELLOWSHIP' | 'COMMISSION'>('ALL');

  // Join Request Modal
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<any>(null);
  const [notes, setNotes] = useState('');

  // ─── LEADER PORTAL STATES ──────────────────────────────────────────────
  const [leadGroups, setLeadGroups] = useState<any[]>([]);
  const [selectedLeadGroupId, setSelectedLeadGroupId] = useState<string | null>(null);
  const [leaderGroupDetails, setLeaderGroupDetails] = useState<any>(null);
  const [leaderDetailsLoading, setLeaderDetailsLoading] = useState(false);
  const [leaderTab, setLeaderTab] = useState<'MEMBERS' | 'MEETINGS' | 'ATTENDANCE'>('MEMBERS');

  // Create Meeting Modal
  const [isNewMeetingModalOpen, setIsNewMeetingModalOpen] = useState(false);
  const [meetingDate, setMeetingDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [meetingTitle, setMeetingTitle] = useState('');
  const [meetingNotes, setMeetingNotes] = useState('');
  const [meetingSaving, setMeetingSaving] = useState(false);

  // Attendance Sheet State
  const [selectedMeetingId, setSelectedMeetingId] = useState<string | null>(null);
  const [attendanceSheet, setAttendanceSheet] = useState<any>(null);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [attendanceSaving, setAttendanceSaving] = useState(false);
  const [attendanceMap, setAttendanceMap] = useState<Record<string, 'PRESENT' | 'ABSENT' | 'EXCUSED'>>({});

  // ─── DATA FETCHING ─────────────────────────────────────────────────────
  const fetchDiscoverGroups = async () => {
    try {
      const res = await client.get('/small-groups');
      setGroups(res.data || []);
    } catch (err: any) {
      console.log('Error fetching small groups:', err.message);
    }
  };

  const fetchLeadGroups = async () => {
    try {
      const res = await client.get('/small-groups/leader/my-groups');
      const data = res.data || [];
      setLeadGroups(data);

      // If user is a leader, default to active group
      if (data.length > 0) {
        if (!selectedLeadGroupId || !data.some((g: any) => g.groupId === selectedLeadGroupId)) {
          setSelectedLeadGroupId(data[0].groupId);
        }
      }
    } catch (err: any) {
      console.log('Error fetching lead groups:', err.message);
    }
  };

  const fetchLeaderGroupDetails = async (groupId: string) => {
    setLeaderDetailsLoading(true);
    try {
      const res = await client.get(`/small-groups/leader/${groupId}/details`);
      setLeaderGroupDetails(res.data);

      // If there are meetings, default to first meeting for attendance
      if (res.data?.meetings?.length > 0) {
        setSelectedMeetingId(res.data.meetings[0].id);
      } else {
        setSelectedMeetingId(null);
      }
    } catch (err: any) {
      console.log('Error fetching leader group details:', err.message);
      Alert.alert('Error', err.response?.data?.error || 'Gagal memuat detail kelompok.');
    } finally {
      setLeaderDetailsLoading(false);
    }
  };

  const loadAll = async () => {
    setLoading(true);
    await Promise.all([fetchDiscoverGroups(), fetchLeadGroups()]);
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    loadAll();
  }, []);

  useEffect(() => {
    if (selectedLeadGroupId) {
      fetchLeaderGroupDetails(selectedLeadGroupId);
    }
  }, [selectedLeadGroupId]);

  // Load attendance when selectedMeetingId changes
  useEffect(() => {
    if (selectedMeetingId && leaderTab === 'ATTENDANCE') {
      fetchMeetingAttendance(selectedMeetingId);
    }
  }, [selectedMeetingId, leaderTab]);

  const fetchMeetingAttendance = async (meetingId: string) => {
    setAttendanceLoading(true);
    try {
      const res = await client.get(`/small-groups/leader/meetings/${meetingId}`);
      setAttendanceSheet(res.data);
      const initMap: Record<string, 'PRESENT' | 'ABSENT' | 'EXCUSED'> = {};
      (res.data.members || []).forEach((m: any) => {
        initMap[m.memberId] = m.status || 'PRESENT';
      });
      setAttendanceMap(initMap);
    } catch (err: any) {
      console.log('Error fetching attendance:', err.message);
    } finally {
      setAttendanceLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchDiscoverGroups(), fetchLeadGroups()]);
    if (selectedLeadGroupId) {
      await fetchLeaderGroupDetails(selectedLeadGroupId);
    }
    setRefreshing(false);
  };

  // ─── GENERAL MEMBER ACTIONS ───────────────────────────────────────────
  const handleOpenJoinModal = (group: any) => {
    setSelectedGroup(group);
    setNotes('');
    setIsJoinModalOpen(true);
  };

  const handleSendJoinRequest = async () => {
    if (!selectedGroup) return;
    setSubmitting(true);
    try {
      await client.post('/small-groups/join', {
        groupId: selectedGroup.id,
        notes: notes.trim(),
      });
      Alert.alert(
        'Permohonan Terkirim',
        `Permohonan Anda untuk bergabung dengan "${selectedGroup.name}" telah dikirim ke ketua kelompok sel.`
      );
      setIsJoinModalOpen(false);
      fetchDiscoverGroups();
    } catch (err: any) {
      Alert.alert('Gagal Mengirim', err.response?.data?.error || err.message || 'Terjadi kesalahan.');
    } finally {
      setSubmitting(false);
    }
  };

  // ─── LEADER ACTIONS ───────────────────────────────────────────────────
  const handleRespondJoinRequest = async (requestId: string, action: 'APPROVE' | 'REJECT') => {
    try {
      await client.post(`/small-groups/leader/join-requests/${requestId}/respond`, { action });
      Alert.alert(
        'Sukses',
        action === 'APPROVE'
          ? 'Jemaat berhasil disetujui dan ditambahkan ke dalam kelompok!'
          : 'Permohonan jemaat telah ditolak.'
      );
      if (selectedLeadGroupId) fetchLeaderGroupDetails(selectedLeadGroupId);
      fetchLeadGroups();
    } catch (err: any) {
      Alert.alert('Gagal', err.response?.data?.error || err.message || 'Gagal memproses permohonan');
    }
  };

  const handleRemoveMember = async (targetMemberId: string, memberName: string) => {
    if (!selectedLeadGroupId) return;
    Alert.alert(
      'Konfirmasi Hapus Anggota',
      `Apakah Anda yakin ingin mengeluarkan ${memberName} dari kelompok sel ini?`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Keluarkan',
          style: 'destructive',
          onPress: async () => {
            try {
              await client.delete(`/small-groups/leader/${selectedLeadGroupId}/members/${targetMemberId}`);
              Alert.alert('Sukses', `${memberName} berhasil dikeluarkan.`);
              fetchLeaderGroupDetails(selectedLeadGroupId);
            } catch (err: any) {
              Alert.alert('Gagal', err.response?.data?.error || err.message || 'Gagal menghapus anggota');
            }
          },
        },
      ]
    );
  };

  const handleCreateMeeting = async () => {
    if (!selectedLeadGroupId) return;
    if (!meetingDate) return Alert.alert('Peringatan', 'Tanggal pertemuan wajib diisi');

    setMeetingSaving(true);
    try {
      await client.post(`/small-groups/leader/${selectedLeadGroupId}/meetings`, {
        date: new Date(meetingDate).toISOString(),
        title: meetingTitle.trim() || undefined,
        notes: meetingNotes.trim() || undefined,
      });

      Alert.alert('Sukses', 'Sesi pertemuan rutin berhasil dicatat!');
      setIsNewMeetingModalOpen(false);
      setMeetingTitle('');
      setMeetingNotes('');
      fetchLeaderGroupDetails(selectedLeadGroupId);
    } catch (err: any) {
      Alert.alert('Gagal', err.response?.data?.error || err.message || 'Gagal membuat pertemuan');
    } finally {
      setMeetingSaving(false);
    }
  };

  const handleSaveAttendance = async () => {
    if (!selectedMeetingId) return;
    setAttendanceSaving(true);
    try {
      const payload = Object.keys(attendanceMap).map((mId) => ({
        memberId: mId,
        status: attendanceMap[mId],
      }));

      await client.post(`/small-groups/leader/meetings/${selectedMeetingId}/attendance`, {
        attendances: payload,
      });

      Alert.alert('Tersimpan', 'Data presensi kehadiran jemaat berhasil disimpan.');
      if (selectedLeadGroupId) fetchLeaderGroupDetails(selectedLeadGroupId);
    } catch (err: any) {
      Alert.alert('Gagal', err.response?.data?.error || err.message || 'Gagal menyimpan absensi');
    } finally {
      setAttendanceSaving(false);
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

  const filteredGroups = groups.filter((g) => {
    const matchesSearch =
      g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (g.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (g.location || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (g.leader?.name || '').toLowerCase().includes(searchQuery.toLowerCase());

    const matchesType = selectedType === 'ALL' || g.type === selectedType;
    return matchesSearch && matchesType;
  });

  const totalPendingRequests = leadGroups.reduce((acc, g) => acc + (g.pendingRequestsCount || 0), 0);

  if (loading && !refreshing) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={HolyGraceColors.navySecondary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Top Header */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeftRow}>
          {onClose && (
            <TouchableOpacity style={styles.backButton} onPress={onClose} activeOpacity={0.7}>
              <Ionicons name="arrow-back" size={22} color={HolyGraceColors.navyPrimary} />
            </TouchableOpacity>
          )}
          <View>
            <Text style={styles.headerTitle}>Kelompok Sel</Text>
            <Text style={styles.headerSubtitle}>Komunitas & Pemuridan Jemaat</Text>
          </View>
        </View>
      </View>

      {/* Top Switcher: Discover vs Leader Portal (Visible if user is a Leader) */}
      {leadGroups.length > 0 && (
        <View style={styles.modeSwitcherContainer}>
          <TouchableOpacity
            style={[styles.modeSwitcherBtn, viewMode === 'DISCOVER' && styles.modeSwitcherBtnActive]}
            onPress={() => setViewMode('DISCOVER')}
            activeOpacity={0.7}
          >
            <Ionicons
              name="people-outline"
              size={16}
              color={viewMode === 'DISCOVER' ? HolyGraceColors.navyPrimary : HolyGraceColors.textMuted}
            />
            <Text style={[styles.modeSwitcherText, viewMode === 'DISCOVER' && styles.modeSwitcherTextActive]}>
              Jelajah Komunitas
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.modeSwitcherBtn, viewMode === 'LEADER' && styles.modeSwitcherBtnActive]}
            onPress={() => setViewMode('LEADER')}
            activeOpacity={0.7}
          >
            <Ionicons
              name="shield-checkmark"
              size={16}
              color={viewMode === 'LEADER' ? HolyGraceColors.goldPrimary : HolyGraceColors.textMuted}
            />
            <Text style={[styles.modeSwitcherText, viewMode === 'LEADER' && styles.modeSwitcherTextActive]}>
              Portal Pemimpin
            </Text>
            {totalPendingRequests > 0 && (
              <View style={styles.pendingBadge}>
                <Text style={styles.pendingBadgeText}>{totalPendingRequests}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* VIEW MODE 1: DISCOVER GROUPS                                        */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {viewMode === 'DISCOVER' && (
        <FlatList
          data={filteredGroups}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[HolyGraceColors.navySecondary]}
            />
          }
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            <View>
              {/* Search Bar */}
              <View style={styles.searchContainer}>
                <Ionicons name="search" size={18} color={HolyGraceColors.textMuted} style={styles.searchIcon} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Cari kelompok, wilayah, atau ketua..."
                  placeholderTextColor={HolyGraceColors.textMuted}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchQuery('')}>
                    <Ionicons name="close-circle" size={18} color={HolyGraceColors.textMuted} />
                  </TouchableOpacity>
                )}
              </View>

              {/* Type Filter Pills */}
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
                  <Text style={[styles.filterText, selectedType === 'CELL_GROUP' && styles.filterTextActive]}>
                    Kelompok Sel
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.filterTab, selectedType === 'FELLOWSHIP' && styles.filterTabActive]}
                  onPress={() => setSelectedType('FELLOWSHIP')}
                >
                  <Text style={[styles.filterText, selectedType === 'FELLOWSHIP' && styles.filterTextActive]}>
                    Persekutuan
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.groupCard}>
              <View style={styles.groupCardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.groupName}>{item.name}</Text>
                  <View style={styles.typeBadge}>
                    <Text style={styles.typeBadgeText}>{getGroupTypeLabel(item.type)}</Text>
                  </View>
                </View>
                <View style={styles.memberCountBadge}>
                  <Ionicons name="people" size={13} color={HolyGraceColors.navySecondary} />
                  <Text style={styles.memberCountText}>{item.memberCount} Anggota</Text>
                </View>
              </View>

              {item.description ? (
                <Text style={styles.descriptionText} numberOfLines={2}>
                  {item.description}
                </Text>
              ) : null}

              <View style={styles.metaSection}>
                {item.meetingSchedule && (
                  <View style={styles.metaRow}>
                    <Ionicons name="time-outline" size={14} color={HolyGraceColors.textMuted} />
                    <Text style={styles.metaText}>{item.meetingSchedule}</Text>
                  </View>
                )}
                {item.location && (
                  <View style={styles.metaRow}>
                    <Ionicons name="location-outline" size={14} color={HolyGraceColors.textMuted} />
                    <Text style={styles.metaText}>{item.location}</Text>
                  </View>
                )}
                <View style={styles.metaRow}>
                  <Ionicons name="person-outline" size={14} color={HolyGraceColors.textMuted} />
                  <Text style={styles.metaText}>
                    Ketua: <Text style={{ fontWeight: '700', color: HolyGraceColors.textPrimary }}>{item.leader?.name}</Text>
                  </Text>
                </View>
              </View>

              {/* Action Area */}
              <View style={styles.cardActions}>
                {item.isJoined ? (
                  <View style={styles.joinedStatus}>
                    <Ionicons name="checkmark-circle" size={16} color={HolyGraceColors.successText} />
                    <Text style={styles.joinedText}>Anda sudah bergabung</Text>
                  </View>
                ) : item.joinStatus === 'PENDING' ? (
                  <View style={styles.pendingStatus}>
                    <Ionicons name="hourglass" size={15} color={HolyGraceColors.goldDark} />
                    <Text style={styles.pendingText}>Permohonan Menunggu Persetujuan</Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.joinBtn}
                    onPress={() => handleOpenJoinModal(item)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="add-circle-outline" size={15} color="#fff" />
                    <Text style={styles.joinBtnText}>Gabung Komunitas</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyCard}>
              <Ionicons name="people-outline" size={32} color={HolyGraceColors.textMuted} />
              <Text style={styles.emptyTitle}>Kelompok Tidak Ditemukan</Text>
              <Text style={styles.emptySubtitle}>Coba kata kunci lain atau pilih kategori Semua.</Text>
            </View>
          }
        />
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* VIEW MODE 2: LEADER PORTAL                                          */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {viewMode === 'LEADER' && (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[HolyGraceColors.navySecondary]}
            />
          }
        >
          {/* Group Selector Pills (if leading multiple groups) */}
          {leadGroups.length > 1 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.leadGroupSelectorScroll}>
              <View style={styles.leadGroupSelectorRow}>
                {leadGroups.map((g) => {
                  const isSelected = selectedLeadGroupId === g.groupId;
                  return (
                    <TouchableOpacity
                      key={g.groupId}
                      style={[styles.leadGroupPill, isSelected && styles.leadGroupPillActive]}
                      onPress={() => setSelectedLeadGroupId(g.groupId)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.leadGroupPillText, isSelected && styles.leadGroupPillTextActive]}>
                        {g.name}
                      </Text>
                      {g.pendingRequestsCount > 0 && (
                        <View style={styles.pillBadge}>
                          <Text style={styles.pillBadgeText}>{g.pendingRequestsCount}</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
          )}

          {/* Active Group Hero Header */}
          {leaderGroupDetails && (
            <View style={styles.leaderHeroCard}>
              <View style={styles.leaderHeroRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.leaderHeroTitle}>{leaderGroupDetails.name}</Text>
                  <Text style={styles.leaderHeroSchedule}>
                    📍 {leaderGroupDetails.location || 'Lokasi fleksibel'} • {leaderGroupDetails.meetingSchedule || 'Jadwal rutin'}
                  </Text>
                </View>
                <View style={styles.leaderRoleBadge}>
                  <Text style={styles.leaderRoleBadgeText}>KETUA</Text>
                </View>
              </View>

              {/* Stats overview */}
              <View style={styles.leaderStatsRow}>
                <View style={styles.leaderStatBox}>
                  <Text style={styles.leaderStatValue}>{leaderGroupDetails.members?.length || 0}</Text>
                  <Text style={styles.leaderStatLabel}>Anggota</Text>
                </View>
                <View style={styles.leaderStatBox}>
                  <Text style={styles.leaderStatValue}>{leaderGroupDetails.meetings?.length || 0}</Text>
                  <Text style={styles.leaderStatLabel}>Pertemuan</Text>
                </View>
                <View style={styles.leaderStatBox}>
                  <Text style={[styles.leaderStatValue, { color: HolyGraceColors.goldPrimary }]}>
                    {leaderGroupDetails.joinRequests?.length || 0}
                  </Text>
                  <Text style={styles.leaderStatLabel}>Permohonan</Text>
                </View>
              </View>
            </View>
          )}

          {/* Leader Sub-Tabs */}
          <View style={styles.leaderTabsContainer}>
            <TouchableOpacity
              style={[styles.leaderTabItem, leaderTab === 'MEMBERS' && styles.leaderTabItemActive]}
              onPress={() => setLeaderTab('MEMBERS')}
              activeOpacity={0.7}
            >
              <Ionicons
                name="people-outline"
                size={16}
                color={leaderTab === 'MEMBERS' ? HolyGraceColors.navyPrimary : HolyGraceColors.textMuted}
              />
              <Text style={[styles.leaderTabText, leaderTab === 'MEMBERS' && styles.leaderTabTextActive]}>
                Anggota ({leaderGroupDetails?.members?.length || 0})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.leaderTabItem, leaderTab === 'MEETINGS' && styles.leaderTabItemActive]}
              onPress={() => setLeaderTab('MEETINGS')}
              activeOpacity={0.7}
            >
              <Ionicons
                name="calendar-outline"
                size={16}
                color={leaderTab === 'MEETINGS' ? HolyGraceColors.navyPrimary : HolyGraceColors.textMuted}
              />
              <Text style={[styles.leaderTabText, leaderTab === 'MEETINGS' && styles.leaderTabTextActive]}>
                Pertemuan ({leaderGroupDetails?.meetings?.length || 0})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.leaderTabItem, leaderTab === 'ATTENDANCE' && styles.leaderTabItemActive]}
              onPress={() => setLeaderTab('ATTENDANCE')}
              activeOpacity={0.7}
            >
              <Ionicons
                name="checkmark-done-circle-outline"
                size={16}
                color={leaderTab === 'ATTENDANCE' ? HolyGraceColors.navyPrimary : HolyGraceColors.textMuted}
              />
              <Text style={[styles.leaderTabText, leaderTab === 'ATTENDANCE' && styles.leaderTabTextActive]}>
                Absensi
              </Text>
            </TouchableOpacity>
          </View>

          {leaderDetailsLoading ? (
            <View style={{ padding: 32, alignItems: 'center' }}>
              <ActivityIndicator size="small" color={HolyGraceColors.navySecondary} />
            </View>
          ) : (
            <>
              {/* ───────────────────────────────────────────────────────────── */}
              {/* TAB 1: MEMBERS & PENDING JOIN REQUESTS                        */}
              {/* ───────────────────────────────────────────────────────────── */}
              {leaderTab === 'MEMBERS' && (
                <View>
                  {/* Pending Join Requests Section */}
                  {leaderGroupDetails?.joinRequests?.length > 0 && (
                    <View style={styles.sectionCard}>
                      <View style={styles.sectionHeaderRow}>
                        <Ionicons name="notifications" size={16} color={HolyGraceColors.goldPrimary} />
                        <Text style={styles.sectionCardTitle}>
                          Permohonan Bergabung Baru ({leaderGroupDetails.joinRequests.length})
                        </Text>
                      </View>

                      {leaderGroupDetails.joinRequests.map((req: any) => (
                        <View key={req.id} style={styles.requestCard}>
                          <View style={styles.requestCardTop}>
                            <View style={styles.memberAvatar}>
                              <Text style={styles.memberAvatarText}>
                                {req.member?.firstName?.charAt(0).toUpperCase() || 'J'}
                              </Text>
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.requestName}>
                                {req.member?.firstName} {req.member?.lastName || ''}
                              </Text>
                              <Text style={styles.requestContact}>
                                📞 {req.member?.phone || 'No HP tidak tersedia'}
                              </Text>
                            </View>
                          </View>

                          {req.notes && (
                            <View style={styles.requestNotesBox}>
                              <Text style={styles.requestNotesLabel}>Catatan Jemaat:</Text>
                              <Text style={styles.requestNotesText}>{req.notes}</Text>
                            </View>
                          )}

                          <View style={styles.requestActionsRow}>
                            <TouchableOpacity
                              style={styles.rejectBtn}
                              onPress={() => handleRespondJoinRequest(req.id, 'REJECT')}
                              activeOpacity={0.7}
                            >
                              <Ionicons name="close" size={14} color={HolyGraceColors.dangerText} />
                              <Text style={styles.rejectBtnText}>Tolak</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                              style={styles.approveBtn}
                              onPress={() => handleRespondJoinRequest(req.id, 'APPROVE')}
                              activeOpacity={0.7}
                            >
                              <Ionicons name="checkmark" size={14} color="#fff" />
                              <Text style={styles.approveBtnText}>Terima Jemaat</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Active Members List Section */}
                  <View style={styles.sectionCard}>
                    <Text style={styles.sectionCardTitle}>Daftar Anggota Aktif</Text>
                    {leaderGroupDetails?.members?.map((gm: any) => (
                      <View key={gm.id} style={styles.memberRow}>
                        <View style={styles.memberAvatar}>
                          {gm.member?.photoUrl ? (
                            <Image
                              source={{ uri: `${SERVER_BASE_URL}${gm.member.photoUrl}` }}
                              style={styles.memberAvatarImg}
                            />
                          ) : (
                            <Text style={styles.memberAvatarText}>
                              {gm.member?.firstName?.charAt(0).toUpperCase() || 'J'}
                            </Text>
                          )}
                        </View>

                        <View style={{ flex: 1 }}>
                          <View style={styles.memberNameRow}>
                            <Text style={styles.memberNameText}>
                              {gm.member?.firstName} {gm.member?.lastName || ''}
                            </Text>
                            <View
                              style={[
                                styles.roleBadge,
                                gm.role === 'LEADER' && styles.roleBadgeLeader,
                                gm.role === 'ASSISTANT' && styles.roleBadgeAssistant,
                              ]}
                            >
                              <Text
                                style={[
                                  styles.roleBadgeText,
                                  gm.role === 'LEADER' && styles.roleBadgeTextLeader,
                                  gm.role === 'ASSISTANT' && styles.roleBadgeTextAssistant,
                                ]}
                              >
                                {gm.role}
                              </Text>
                            </View>
                          </View>
                          <Text style={styles.memberPhoneText}>📞 {gm.member?.phone || '-'}</Text>
                        </View>

                        {gm.role !== 'LEADER' && (
                          <TouchableOpacity
                            style={styles.deleteMemberBtn}
                            onPress={() =>
                              handleRemoveMember(
                                gm.memberId,
                                `${gm.member?.firstName} ${gm.member?.lastName || ''}`.trim()
                              )
                            }
                            activeOpacity={0.7}
                          >
                            <Ionicons name="trash-outline" size={16} color={HolyGraceColors.dangerText} />
                          </TouchableOpacity>
                        )}
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* ───────────────────────────────────────────────────────────── */}
              {/* TAB 2: MEETINGS MANAGEMENT                                    */}
              {/* ───────────────────────────────────────────────────────────── */}
              {leaderTab === 'MEETINGS' && (
                <View>
                  <TouchableOpacity
                    style={styles.createMeetingBtn}
                    onPress={() => setIsNewMeetingModalOpen(true)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="add-circle-outline" size={18} color="#fff" />
                    <Text style={styles.createMeetingBtnText}>Catat Sesi Pertemuan Baru</Text>
                  </TouchableOpacity>

                  {leaderGroupDetails?.meetings?.length === 0 ? (
                    <View style={styles.emptyCard}>
                      <Ionicons name="calendar-outline" size={32} color={HolyGraceColors.textMuted} />
                      <Text style={styles.emptyTitle}>Belum Ada Pertemuan Dicatat</Text>
                      <Text style={styles.emptySubtitle}>
                        Tekan tombol di atas untuk mencatat ibadah sel mingguan.
                      </Text>
                    </View>
                  ) : (
                    leaderGroupDetails?.meetings?.map((m: any) => {
                      const d = new Date(m.date);
                      const formattedDate = !isNaN(d.getTime())
                        ? `${d.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}`
                        : m.date;

                      return (
                        <View key={m.id} style={styles.meetingCard}>
                          <View style={styles.meetingCardTop}>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.meetingCardDate}>{formattedDate}</Text>
                              <Text style={styles.meetingCardTitle}>
                                {m.title || 'Ibadah Persekutuan Rutin'}
                              </Text>
                            </View>
                            <View style={styles.attendanceBadge}>
                              <Ionicons name="people-outline" size={13} color={HolyGraceColors.navySecondary} />
                              <Text style={styles.attendanceBadgeText}>
                                {m._count?.attendance || 0} Hadir
                              </Text>
                            </View>
                          </View>

                          {m.notes ? (
                            <View style={styles.meetingNotesBox}>
                              <Text style={styles.meetingNotesLabel}>Catatan / Pokok Doa:</Text>
                              <Text style={styles.meetingNotesText}>{m.notes}</Text>
                            </View>
                          ) : null}

                          <TouchableOpacity
                            style={styles.openAttendanceBtn}
                            onPress={() => {
                              setSelectedMeetingId(m.id);
                              setLeaderTab('ATTENDANCE');
                            }}
                            activeOpacity={0.7}
                          >
                            <Ionicons name="checkbox-outline" size={15} color={HolyGraceColors.navySecondary} />
                            <Text style={styles.openAttendanceBtnText}>Isi / Lihat Presensi Kehadiran</Text>
                          </TouchableOpacity>
                        </View>
                      );
                    })
                  )}
                </View>
              )}

              {/* ───────────────────────────────────────────────────────────── */}
              {/* TAB 3: ATTENDANCE SHEET                                       */}
              {/* ───────────────────────────────────────────────────────────── */}
              {leaderTab === 'ATTENDANCE' && (
                <View>
                  {/* Meeting Picker if multiple meetings exist */}
                  {leaderGroupDetails?.meetings?.length > 1 && (
                    <View style={styles.meetingPickerContainer}>
                      <Text style={styles.pickerLabel}>Pilih Tanggal Sesi Pertemuan:</Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 6 }}>
                        <View style={{ flexDirection: 'row', gap: 6 }}>
                          {leaderGroupDetails.meetings.map((m: any) => {
                            const d = new Date(m.date);
                            const label = !isNaN(d.getTime())
                              ? `${d.getDate()}/${d.getMonth() + 1}`
                              : 'Sesi';
                            const isSelected = selectedMeetingId === m.id;

                            return (
                              <TouchableOpacity
                                key={m.id}
                                style={[styles.meetingPill, isSelected && styles.meetingPillActive]}
                                onPress={() => setSelectedMeetingId(m.id)}
                                activeOpacity={0.7}
                              >
                                <Text
                                  style={[styles.meetingPillText, isSelected && styles.meetingPillTextActive]}
                                >
                                  {label} - {m.title || 'Ibadah'}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      </ScrollView>
                    </View>
                  )}

                  {attendanceLoading ? (
                    <View style={{ padding: 32, alignItems: 'center' }}>
                      <ActivityIndicator size="small" color={HolyGraceColors.navySecondary} />
                    </View>
                  ) : !selectedMeetingId ? (
                    <View style={styles.emptyCard}>
                      <Ionicons name="calendar-outline" size={32} color={HolyGraceColors.textMuted} />
                      <Text style={styles.emptyTitle}>Belum Ada Pertemuan</Text>
                      <Text style={styles.emptySubtitle}>
                        Silakan buat sesi pertemuan terlebih dahulu di tab "Pertemuan".
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.sectionCard}>
                      <View style={styles.attendanceHeaderBox}>
                        <Text style={styles.attendanceMeetingTitle}>
                          {attendanceSheet?.meeting?.title || 'Ibadah Kelompok'}
                        </Text>
                        <Text style={styles.attendanceMeetingDate}>
                          {new Date(attendanceSheet?.meeting?.date).toLocaleDateString('id-ID', {
                            weekday: 'long',
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                          })}
                        </Text>
                      </View>

                      {/* Attendance List */}
                      {attendanceSheet?.members?.map((mem: any) => {
                        const currentStatus = attendanceMap[mem.memberId] || 'PRESENT';

                        return (
                          <View key={mem.memberId} style={styles.attendanceRow}>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.attendanceMemberName}>{mem.name}</Text>
                              <Text style={styles.attendanceMemberRole}>{mem.role}</Text>
                            </View>

                            <View style={styles.statusToggleGroup}>
                              <TouchableOpacity
                                style={[
                                  styles.statusToggleBtn,
                                  currentStatus === 'PRESENT' && styles.statusToggleBtnPresent,
                                ]}
                                onPress={() =>
                                  setAttendanceMap((prev) => ({ ...prev, [mem.memberId]: 'PRESENT' }))
                                }
                                activeOpacity={0.7}
                              >
                                <Text
                                  style={[
                                    styles.statusToggleText,
                                    currentStatus === 'PRESENT' && styles.statusToggleTextActive,
                                  ]}
                                >
                                  Hadir
                                </Text>
                              </TouchableOpacity>

                              <TouchableOpacity
                                style={[
                                  styles.statusToggleBtn,
                                  currentStatus === 'EXCUSED' && styles.statusToggleBtnExcused,
                                ]}
                                onPress={() =>
                                  setAttendanceMap((prev) => ({ ...prev, [mem.memberId]: 'EXCUSED' }))
                                }
                                activeOpacity={0.7}
                              >
                                <Text
                                  style={[
                                    styles.statusToggleText,
                                    currentStatus === 'EXCUSED' && styles.statusToggleTextActive,
                                  ]}
                                >
                                  Izin
                                </Text>
                              </TouchableOpacity>

                              <TouchableOpacity
                                style={[
                                  styles.statusToggleBtn,
                                  currentStatus === 'ABSENT' && styles.statusToggleBtnAbsent,
                                ]}
                                onPress={() =>
                                  setAttendanceMap((prev) => ({ ...prev, [mem.memberId]: 'ABSENT' }))
                                }
                                activeOpacity={0.7}
                              >
                                <Text
                                  style={[
                                    styles.statusToggleText,
                                    currentStatus === 'ABSENT' && styles.statusToggleTextActive,
                                  ]}
                                >
                                  Absen
                                </Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                        );
                      })}

                      {/* Save Attendance Button */}
                      <TouchableOpacity
                        style={styles.saveAttendanceBtn}
                        onPress={handleSaveAttendance}
                        disabled={attendanceSaving}
                        activeOpacity={0.8}
                      >
                        {attendanceSaving ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : (
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Ionicons name="save-outline" size={16} color="#fff" />
                            <Text style={styles.saveAttendanceBtnText}>Simpan Presensi Kehadiran</Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              )}
            </>
          )}
        </ScrollView>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* MODAL 1: REQUEST TO JOIN (FOR GENERAL MEMBERS)                      */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <Modal visible={isJoinModalOpen} transparent animationType="slide" onRequestClose={() => setIsJoinModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Gabung Kelompok Sel</Text>
              <TouchableOpacity onPress={() => setIsJoinModalOpen(false)}>
                <Ionicons name="close" size={22} color={HolyGraceColors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>
              Ajukan permohonan untuk bergabung dengan <Text style={{ fontWeight: '700' }}>{selectedGroup?.name}</Text>.
            </Text>

            <Text style={styles.modalInputLabel}>Pesan / Alasan Bergabung (Opsional):</Text>
            <TextInput
              style={styles.modalTextInput}
              placeholder="Misal: Saya jemaat baru di wilayah ini..."
              placeholderTextColor={HolyGraceColors.textMuted}
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={3}
            />

            <View style={styles.modalActionsRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setIsJoinModalOpen(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.modalCancelBtnText}>Batal</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalSubmitBtn}
                onPress={handleSendJoinRequest}
                disabled={submitting}
                activeOpacity={0.8}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.modalSubmitBtnText}>Kirim Permohonan</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* MODAL 2: CREATE MEETING (FOR LEADERS)                               */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <Modal
        visible={isNewMeetingModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setIsNewMeetingModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Catat Pertemuan Baru</Text>
              <TouchableOpacity onPress={() => setIsNewMeetingModalOpen(false)}>
                <Ionicons name="close" size={22} color={HolyGraceColors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalInputLabel}>Tanggal Pertemuan (YYYY-MM-DD) *</Text>
            <TextInput
              style={styles.modalInputSingle}
              placeholder="Contoh: 2026-10-16"
              placeholderTextColor={HolyGraceColors.textMuted}
              value={meetingDate}
              onChangeText={setMeetingDate}
            />

            <Text style={styles.modalInputLabel}>Tema / Judul Firman (Opsional)</Text>
            <TextInput
              style={styles.modalInputSingle}
              placeholder="Contoh: Bertumbuh dalam Kasih Kristus"
              placeholderTextColor={HolyGraceColors.textMuted}
              value={meetingTitle}
              onChangeText={setMeetingTitle}
            />

            <Text style={styles.modalInputLabel}>Catatan / Notulen Doa (Opsional)</Text>
            <TextInput
              style={styles.modalTextInput}
              placeholder="Pokok doa bersama, sharing jemaat, atau pengumuman..."
              placeholderTextColor={HolyGraceColors.textMuted}
              value={meetingNotes}
              onChangeText={setMeetingNotes}
              multiline
              numberOfLines={3}
            />

            <View style={styles.modalActionsRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setIsNewMeetingModalOpen(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.modalCancelBtnText}>Batal</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalSubmitBtn}
                onPress={handleCreateMeeting}
                disabled={meetingSaving}
                activeOpacity={0.8}
              >
                {meetingSaving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.modalSubmitBtnText}>Simpan Pertemuan</Text>
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
  container: {
    flex: 1,
    backgroundColor: HolyGraceColors.background,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: HolyGraceColors.background,
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },

  // Header Row
  headerRow: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    backgroundColor: HolyGraceColors.surface,
    borderBottomWidth: 1,
    borderBottomColor: HolyGraceColors.borderLight,
  },
  headerLeftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: HolyGraceColors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as const } : {}),
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: HolyGraceColors.navyPrimary,
  },
  headerSubtitle: {
    fontSize: 11,
    color: HolyGraceColors.textSecondary,
    marginTop: 1,
  },

  // Mode Switcher (Discover vs Leader Portal)
  modeSwitcherContainer: {
    flexDirection: 'row',
    backgroundColor: HolyGraceColors.surfaceSubtle,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: HolyGraceColors.borderLight,
  },
  modeSwitcherBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 10,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as const } : {}),
  },
  modeSwitcherBtnActive: {
    backgroundColor: HolyGraceColors.surface,
    ...Shadows.sm,
  },
  modeSwitcherText: {
    fontSize: 12,
    fontWeight: '600',
    color: HolyGraceColors.textMuted,
  },
  modeSwitcherTextActive: {
    color: HolyGraceColors.navyPrimary,
    fontWeight: '800',
  },
  pendingBadge: {
    backgroundColor: HolyGraceColors.danger,
    borderRadius: 8,
    paddingHorizontal: 5,
    paddingVertical: 1,
    marginLeft: 2,
  },
  pendingBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },

  // Discover Search Bar
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: HolyGraceColors.surface,
    borderWidth: 1,
    borderColor: HolyGraceColors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 12,
    ...Shadows.sm,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 13,
    color: HolyGraceColors.textPrimary,
  },

  // Filter Container
  filterContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  filterTab: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: HolyGraceColors.surface,
    borderWidth: 1,
    borderColor: HolyGraceColors.border,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as const } : {}),
  },
  filterTabActive: {
    backgroundColor: HolyGraceColors.blueLight,
    borderColor: HolyGraceColors.blueBorder,
  },
  filterText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: HolyGraceColors.textSecondary,
  },
  filterTextActive: {
    color: HolyGraceColors.navySecondary,
    fontWeight: '700',
  },

  // Group Cards (Discover Mode)
  groupCard: {
    backgroundColor: HolyGraceColors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: HolyGraceColors.border,
    ...Shadows.card,
  },
  groupCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  groupName: {
    fontSize: 15,
    fontWeight: '800',
    color: HolyGraceColors.textPrimary,
  },
  typeBadge: {
    backgroundColor: HolyGraceColors.blueLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: HolyGraceColors.navySecondary,
  },
  memberCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: HolyGraceColors.surfaceSubtle,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  memberCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: HolyGraceColors.textSecondary,
  },
  descriptionText: {
    fontSize: 12.5,
    color: HolyGraceColors.textSecondary,
    lineHeight: 18,
    marginBottom: 10,
  },
  metaSection: {
    gap: 5,
    borderTopWidth: 1,
    borderTopColor: HolyGraceColors.borderLight,
    paddingTop: 10,
    marginBottom: 12,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 11.5,
    color: HolyGraceColors.textSecondary,
  },
  cardActions: {
    marginTop: 4,
  },
  joinedStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: HolyGraceColors.successLight,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    justifyContent: 'center',
  },
  joinedText: {
    fontSize: 12,
    fontWeight: '700',
    color: HolyGraceColors.successText,
  },
  pendingStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: HolyGraceColors.warningLight,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    justifyContent: 'center',
  },
  pendingText: {
    fontSize: 12,
    fontWeight: '700',
    color: HolyGraceColors.goldDark,
  },
  joinBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: HolyGraceColors.navySecondary,
    paddingVertical: 10,
    borderRadius: 10,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as const } : {}),
  },
  joinBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },

  // ─── LEADER PORTAL STYLES ──────────────────────────────────────────────
  leadGroupSelectorScroll: {
    marginBottom: 14,
  },
  leadGroupSelectorRow: {
    flexDirection: 'row',
    gap: 8,
  },
  leadGroupPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: HolyGraceColors.surface,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: HolyGraceColors.border,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as const } : {}),
  },
  leadGroupPillActive: {
    backgroundColor: HolyGraceColors.navyDark,
    borderColor: HolyGraceColors.navyDark,
  },
  leadGroupPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: HolyGraceColors.textSecondary,
  },
  leadGroupPillTextActive: {
    color: '#FFFFFF',
  },
  pillBadge: {
    backgroundColor: HolyGraceColors.danger,
    borderRadius: 6,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  pillBadgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: 'bold',
  },

  leaderHeroCard: {
    backgroundColor: HolyGraceColors.navyDark,
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(217, 119, 6, 0.3)',
    ...Shadows.md,
  },
  leaderHeroRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  leaderHeroTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  leaderHeroSchedule: {
    fontSize: 11.5,
    color: HolyGraceColors.goldAccent,
    marginTop: 4,
  },
  leaderRoleBadge: {
    backgroundColor: 'rgba(217, 119, 6, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(217, 119, 6, 0.4)',
  },
  leaderRoleBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: HolyGraceColors.goldAccent,
    letterSpacing: 0.5,
  },
  leaderStatsRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 14,
    padding: 12,
    justifyContent: 'space-around',
  },
  leaderStatBox: {
    alignItems: 'center',
  },
  leaderStatValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  leaderStatLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#94A3B8',
    marginTop: 2,
    textTransform: 'uppercase',
  },

  // Leader Tabs
  leaderTabsContainer: {
    flexDirection: 'row',
    backgroundColor: HolyGraceColors.surface,
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: HolyGraceColors.border,
    marginBottom: 16,
  },
  leaderTabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 8,
    borderRadius: 9,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as const } : {}),
  },
  leaderTabItemActive: {
    backgroundColor: HolyGraceColors.blueLight,
  },
  leaderTabText: {
    fontSize: 11,
    fontWeight: '600',
    color: HolyGraceColors.textMuted,
  },
  leaderTabTextActive: {
    color: HolyGraceColors.navySecondary,
    fontWeight: '800',
  },

  // Section Cards
  sectionCard: {
    backgroundColor: HolyGraceColors.surface,
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: HolyGraceColors.border,
    ...Shadows.card,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  sectionCardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: HolyGraceColors.navyPrimary,
  },

  // Request Cards
  requestCard: {
    backgroundColor: HolyGraceColors.surfaceSubtle,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: HolyGraceColors.borderLight,
  },
  requestCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  memberAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: HolyGraceColors.blueLight,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  memberAvatarImg: {
    width: '100%',
    height: '100%',
  },
  memberAvatarText: {
    fontSize: 16,
    fontWeight: '800',
    color: HolyGraceColors.navySecondary,
  },
  requestName: {
    fontSize: 13.5,
    fontWeight: '700',
    color: HolyGraceColors.textPrimary,
  },
  requestContact: {
    fontSize: 11,
    color: HolyGraceColors.textSecondary,
    marginTop: 2,
  },
  requestNotesBox: {
    backgroundColor: '#fff',
    padding: 8,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: HolyGraceColors.borderLight,
  },
  requestNotesLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: HolyGraceColors.textMuted,
    marginBottom: 2,
  },
  requestNotesText: {
    fontSize: 12,
    color: HolyGraceColors.textSecondary,
  },
  requestActionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  rejectBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: HolyGraceColors.dangerLight,
    borderWidth: 1,
    borderColor: HolyGraceColors.dangerBorder,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as const } : {}),
  },
  rejectBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: HolyGraceColors.dangerText,
  },
  approveBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: HolyGraceColors.success,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as const } : {}),
  },
  approveBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },

  // Member Rows
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: HolyGraceColors.borderLight,
    gap: 10,
  },
  memberNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  memberNameText: {
    fontSize: 13,
    fontWeight: '700',
    color: HolyGraceColors.textPrimary,
  },
  memberPhoneText: {
    fontSize: 11,
    color: HolyGraceColors.textSecondary,
    marginTop: 2,
  },
  roleBadge: {
    backgroundColor: HolyGraceColors.surfaceSubtle,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  roleBadgeLeader: {
    backgroundColor: HolyGraceColors.goldLight,
  },
  roleBadgeAssistant: {
    backgroundColor: HolyGraceColors.blueLight,
  },
  roleBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: HolyGraceColors.textMuted,
  },
  roleBadgeTextLeader: {
    color: HolyGraceColors.goldDark,
  },
  roleBadgeTextAssistant: {
    color: HolyGraceColors.navySecondary,
  },
  deleteMemberBtn: {
    padding: 6,
    borderRadius: 6,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as const } : {}),
  },

  // Meetings Tab
  createMeetingBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: HolyGraceColors.navySecondary,
    paddingVertical: 12,
    borderRadius: 14,
    marginBottom: 16,
    ...Shadows.sm,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as const } : {}),
  },
  createMeetingBtnText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '700',
  },
  meetingCard: {
    backgroundColor: HolyGraceColors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: HolyGraceColors.border,
    ...Shadows.card,
  },
  meetingCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  meetingCardDate: {
    fontSize: 11,
    fontWeight: '700',
    color: HolyGraceColors.goldPrimary,
    textTransform: 'uppercase',
  },
  meetingCardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: HolyGraceColors.textPrimary,
    marginTop: 2,
  },
  attendanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: HolyGraceColors.blueLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  attendanceBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: HolyGraceColors.navySecondary,
  },
  meetingNotesBox: {
    backgroundColor: HolyGraceColors.surfaceSubtle,
    padding: 10,
    borderRadius: 10,
    marginBottom: 10,
  },
  meetingNotesLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: HolyGraceColors.textMuted,
    marginBottom: 2,
  },
  meetingNotesText: {
    fontSize: 12,
    color: HolyGraceColors.textSecondary,
    lineHeight: 17,
  },
  openAttendanceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: HolyGraceColors.surfaceSubtle,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: HolyGraceColors.border,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as const } : {}),
  },
  openAttendanceBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: HolyGraceColors.navySecondary,
  },

  // Attendance Tab Styles
  meetingPickerContainer: {
    backgroundColor: HolyGraceColors.surface,
    padding: 14,
    borderRadius: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: HolyGraceColors.border,
  },
  pickerLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: HolyGraceColors.textSecondary,
    textTransform: 'uppercase',
  },
  meetingPill: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: HolyGraceColors.surfaceSubtle,
    borderWidth: 1,
    borderColor: HolyGraceColors.border,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as const } : {}),
  },
  meetingPillActive: {
    backgroundColor: HolyGraceColors.navyDark,
    borderColor: HolyGraceColors.navyDark,
  },
  meetingPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: HolyGraceColors.textSecondary,
  },
  meetingPillTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
  attendanceHeaderBox: {
    marginBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: HolyGraceColors.borderLight,
    paddingBottom: 10,
  },
  attendanceMeetingTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: HolyGraceColors.textPrimary,
  },
  attendanceMeetingDate: {
    fontSize: 12,
    color: HolyGraceColors.goldPrimary,
    fontWeight: '600',
    marginTop: 2,
  },
  attendanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: HolyGraceColors.borderLight,
  },
  attendanceMemberName: {
    fontSize: 13,
    fontWeight: '700',
    color: HolyGraceColors.textPrimary,
  },
  attendanceMemberRole: {
    fontSize: 10,
    color: HolyGraceColors.textMuted,
    marginTop: 1,
  },
  statusToggleGroup: {
    flexDirection: 'row',
    gap: 4,
  },
  statusToggleBtn: {
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: HolyGraceColors.surfaceSubtle,
    borderWidth: 1,
    borderColor: HolyGraceColors.border,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as const } : {}),
  },
  statusToggleBtnPresent: {
    backgroundColor: HolyGraceColors.success,
    borderColor: HolyGraceColors.success,
  },
  statusToggleBtnExcused: {
    backgroundColor: HolyGraceColors.warning,
    borderColor: HolyGraceColors.warning,
  },
  statusToggleBtnAbsent: {
    backgroundColor: HolyGraceColors.danger,
    borderColor: HolyGraceColors.danger,
  },
  statusToggleText: {
    fontSize: 10.5,
    fontWeight: '600',
    color: HolyGraceColors.textSecondary,
  },
  statusToggleTextActive: {
    color: '#fff',
    fontWeight: '800',
  },
  saveAttendanceBtn: {
    backgroundColor: HolyGraceColors.navySecondary,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as const } : {}),
  },
  saveAttendanceBtnText: {
    color: '#fff',
    fontSize: 13.5,
    fontWeight: '700',
  },

  // Modals Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    width: '100%',
    maxWidth: 360,
    ...Shadows.lg,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: HolyGraceColors.navyPrimary,
  },
  modalSubtitle: {
    fontSize: 12,
    color: HolyGraceColors.textSecondary,
    marginBottom: 14,
    lineHeight: 17,
  },
  modalInputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: HolyGraceColors.textSecondary,
    textTransform: 'uppercase',
    marginBottom: 6,
    marginTop: 6,
  },
  modalInputSingle: {
    backgroundColor: HolyGraceColors.surfaceSubtle,
    borderWidth: 1,
    borderColor: HolyGraceColors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: HolyGraceColors.textPrimary,
    marginBottom: 10,
  },
  modalTextInput: {
    backgroundColor: HolyGraceColors.surfaceSubtle,
    borderWidth: 1,
    borderColor: HolyGraceColors.border,
    borderRadius: 10,
    padding: 10,
    fontSize: 13,
    color: HolyGraceColors.textPrimary,
    minHeight: 65,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  modalActionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: HolyGraceColors.surfaceSubtle,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as const } : {}),
  },
  modalCancelBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: HolyGraceColors.textSecondary,
  },
  modalSubmitBtn: {
    flex: 2,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: HolyGraceColors.navySecondary,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as const } : {}),
  },
  modalSubmitBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
  },

  // Empty State
  emptyCard: {
    backgroundColor: HolyGraceColors.surface,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: HolyGraceColors.borderLight,
    marginVertical: 10,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: HolyGraceColors.textPrimary,
    marginTop: 8,
    marginBottom: 2,
  },
  emptySubtitle: {
    fontSize: 11.5,
    color: HolyGraceColors.textMuted,
    textAlign: 'center',
  },
});
