import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ActivityIndicator, 
  TextInput, 
  ScrollView, 
  Alert, 
  Image,
  Dimensions,
  Linking,
  Platform,
  RefreshControl,
  Modal
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import QRCode from 'react-native-qrcode-svg';
import { Ionicons } from '@expo/vector-icons';
import { client, SERVER_BASE_URL } from '../api/client';
import { HolyGraceColors, Shadows } from '../theme/colors';

const SERVER_URL = SERVER_BASE_URL;


export default function ProfileScreen({ onLogout }: { onLogout: () => void }) {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'biodata' | 'family' | 'sacraments' | 'skills' | 'certificates'>('biodata');
  const [certificates, setCertificates] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [isCardVisible, setIsCardVisible] = useState(false);

  // General Lists (fetched from backend)
  const [allFamilies, setAllFamilies] = useState<any[]>([]);
  const [allSkills, setAllSkills] = useState<any[]>([]);

  // 1. Biodata States
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [rayon, setRayon] = useState('');
  const [district, setDistrict] = useState('');
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [locationGetting, setLocationGetting] = useState(false);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [biodataSaving, setBiodataSaving] = useState(false);

  // 2. Family States
  const [newFamilyName, setNewFamilyName] = useState('');
  const [familyLoading, setFamilyLoading] = useState(false);

  // 3. Sacrament States
  const [sacramentType, setSacramentType] = useState<'BAPTISM' | 'CONFIRMATION'>('BAPTISM');
  const [sacramentDate, setSacramentDate] = useState('');
  const [sacramentLocation, setSacramentLocation] = useState('');
  const [sacramentPastor, setSacramentPastor] = useState('');
  const [sacramentLoading, setSacramentLoading] = useState(false);

  // 4. Skills States
  const [selectedSkillId, setSelectedSkillId] = useState('');
  const [customSkillName, setCustomSkillName] = useState('');
  const [skillProficiency, setSkillProficiency] = useState(3);
  const [skillLoading, setSkillLoading] = useState(false);

  const fetchProfile = async () => {
    try {
      const res = await client.get('/profile');
      setProfile(res.data);
      // Init form values
      setFirstName(res.data.firstName || '');
      setLastName(res.data.lastName || '');
      setPhone(res.data.phone || '');
      setAddress(res.data.address || '');
      setRayon(res.data.rayon || '');
      setDistrict(res.data.district || '');
      setCity(res.data.city || '');
      setPostalCode(res.data.postalCode || '');
      setLatitude(res.data.latitude !== null && res.data.latitude !== undefined ? res.data.latitude.toString() : '');
      setLongitude(res.data.longitude !== null && res.data.longitude !== undefined ? res.data.longitude.toString() : '');
    } catch (err: any) {
      console.log('Error loading profile:', err.message);
    }
  };

  const fetchFamiliesAndSkills = async () => {
    try {
      const famRes = await client.get('/families');
      setAllFamilies(famRes.data);
      const skillRes = await client.get('/skills');
      setAllSkills(skillRes.data);
    } catch (err: any) {
      console.log('Error loading lists:', err.message);
    }
  };

  const fetchCertificates = async () => {
    try {
      const res = await client.get('/certificates');
      setCertificates(res.data || []);
    } catch (err: any) {
      console.log('Error loading certificates:', err.message);
    }
  };

  const loadAll = async () => {
    setLoading(true);
    await Promise.all([fetchProfile(), fetchFamiliesAndSkills(), fetchCertificates()]);
    setLoading(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchProfile(), fetchFamiliesAndSkills(), fetchCertificates()]);
    setRefreshing(false);
  };

  useEffect(() => {
    loadAll();
  }, []);

  const handleLogout = async () => {
    await AsyncStorage.removeItem('mobile_token');
    onLogout();
  };

  // ─── PHOTO UPLOAD ─────────────────────────────────────────────────────────
  const handleUploadPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      return Alert.alert('Izin Ditolak', 'Aplikasi memerlukan akses galeri untuk mengunggah foto profil.');
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
    });

    if (result.canceled) return;

    const pickedUri = result.assets[0].uri;
    const filename = pickedUri.split('/').pop() || 'avatar.jpg';

    const formData = new FormData();
    if (Platform.OS === 'web') {
      const response = await fetch(pickedUri);
      const blob = await response.blob();
      formData.append('file', blob, filename);
    } else {
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : `image/jpeg`;
      formData.append('file', {
        uri: pickedUri,
        name: filename,
        type
      } as any);
    }

    setPhotoLoading(true);
    try {
      const uploadRes = await client.post('/profile/photo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      Alert.alert('Sukses', 'Foto profil berhasil diperbarui');
      setProfile((prev: any) => ({ ...prev, photoUrl: uploadRes.data.photoUrl }));
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error || err.message || 'Gagal mengunggah foto');
    } finally {
      setPhotoLoading(false);
    }
  };

  // ─── SAVE BIODATA ──────────────────────────────────────────────────────────
  const handleGetCurrentLocation = () => {
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      setLocationGetting(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLatitude(position.coords.latitude.toString());
          setLongitude(position.coords.longitude.toString());
          setLocationGetting(false);
          Alert.alert('Sukses', `Koordinat berhasil diambil!\nLat: ${position.coords.latitude}, Lng: ${position.coords.longitude}`);
        },
        (error) => {
          setLocationGetting(false);
          Alert.alert('Gagal Mengambil Lokasi', error.message || 'Pastikan GPS/lokasi perangkat diaktifkan.');
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
      );
    } else {
      Alert.alert('Informasi', 'Perangkat tidak mendukung pengambilan lokasi otomatis. Silakan masukkan koordinat secara manual.');
    }
  };

  const handleSaveBiodata = async () => {
    if (!firstName.trim()) return Alert.alert('Error', 'Nama depan wajib diisi');

    setBiodataSaving(true);
    try {
      const res = await client.put('/profile', {
        firstName: firstName.trim(),
        lastName: lastName.trim() || null,
        phone: phone.trim() || null,
        address: address.trim() || null,
        rayon: rayon.trim() || null,
        district: district.trim() || null,
        city: city.trim() || null,
        postalCode: postalCode.trim() || null,
        latitude: latitude.trim() ? parseFloat(latitude) : null,
        longitude: longitude.trim() ? parseFloat(longitude) : null,
      });
      setProfile((prev: any) => ({ ...prev, ...res.data }));
      Alert.alert('Sukses', 'Biodata umum berhasil disimpan');
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error || err.message || 'Gagal menyimpan biodata');
    } finally {
      setBiodataSaving(false);
    }
  };

  // ─── FAMILY ACTIONS ─────────────────────────────────────────────────────────
  const handleCreateFamily = async () => {
    if (!newFamilyName.trim()) return Alert.alert('Error', 'Nama keluarga tidak boleh kosong');
    setFamilyLoading(true);
    try {
      await client.post('/families', { name: newFamilyName.trim() });
      Alert.alert('Sukses', `Keluarga "${newFamilyName}" berhasil dibuat!`);
      setNewFamilyName('');
      await fetchProfile();
      await fetchFamiliesAndSkills();
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error || err.message);
    } finally {
      setFamilyLoading(false);
    }
  };

  const handleJoinFamily = async (familyId: string) => {
    setFamilyLoading(true);
    try {
      await client.post('/families/join', { familyId });
      Alert.alert('Sukses', 'Berhasil bergabung dengan keluarga');
      await fetchProfile();
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error || err.message);
    } finally {
      setFamilyLoading(false);
    }
  };

  const handleLeaveFamily = async () => {
    Alert.alert(
      'Konfirmasi',
      'Apakah Anda yakin ingin keluar dari keluarga ini?',
      [
        { text: 'Batal', style: 'cancel' },
        { 
          text: 'Keluar', 
          style: 'destructive',
          onPress: async () => {
            setFamilyLoading(true);
            try {
              await client.post('/families/leave');
              Alert.alert('Sukses', 'Berhasil keluar dari keluarga');
              await fetchProfile();
            } catch (err: any) {
              Alert.alert('Error', err.response?.data?.error || err.message);
            } finally {
              setFamilyLoading(false);
            }
          }
        }
      ]
    );
  };

  // ─── SACRAMENT ACTIONS ──────────────────────────────────────────────────────
  const handleAddSacrament = async () => {
    if (!sacramentDate.trim()) return Alert.alert('Error', 'Tanggal sakramen wajib diisi');
    
    sacramentLoading.valueOf();
    setSacramentLoading(true);
    try {
      await client.post('/sacraments', {
        type: sacramentType,
        date: sacramentDate,
        location: sacramentLocation.trim() || null,
        pastorName: sacramentPastor.trim() || null
      });
      Alert.alert('Sukses', 'Data sakramen berhasil ditambahkan');
      setSacramentDate('');
      setSacramentLocation('');
      setSacramentPastor('');
      await fetchProfile();
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error || err.message);
    } finally {
      setSacramentLoading(false);
    }
  };

  const handleDeleteSacrament = async (id: string) => {
    setSacramentLoading(true);
    try {
      await client.delete(`/sacraments/${id}`);
      Alert.alert('Sukses', 'Data sakramen berhasil dihapus');
      await fetchProfile();
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error || err.message);
    } finally {
      setSacramentLoading(false);
    }
  };

  // ─── SKILLS ACTIONS ────────────────────────────────────────────────────────
  const handleAddSkill = async () => {
    if (!selectedSkillId && !customSkillName.trim()) {
      return Alert.alert('Error', 'Pilih keahlian atau ketik keahlian kustom');
    }

    setSkillLoading(true);
    try {
      if (customSkillName.trim()) {
        await client.post('/skills/custom', {
          skillName: customSkillName.trim(),
          proficiency: skillProficiency
        });
        setCustomSkillName('');
      } else {
        await client.post('/skills', {
          skillId: selectedSkillId,
          proficiency: skillProficiency
        });
        setSelectedSkillId('');
      }
      Alert.alert('Sukses', 'Keahlian/Bakat berhasil ditambahkan');
      await fetchProfile();
      await fetchFamiliesAndSkills();
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error || err.message);
    } finally {
      setSkillLoading(false);
    }
  };

  const handleRemoveSkill = async (skillId: string) => {
    setSkillLoading(true);
    try {
      await client.delete(`/skills/${skillId}`);
      Alert.alert('Sukses', 'Bakat berhasil dihapus dari profil');
      await fetchProfile();
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error || err.message);
    } finally {
      setSkillLoading(false);
    }
  };

  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color="#3b82f6" /></View>;

  return (
    <ScrollView 
      contentContainerStyle={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <Text style={styles.header}>Biodata Jemaat</Text>

      {/* AVATAR/PROFILE PIC HEADER */}
      {profile && (
        <View style={styles.avatarCard}>
          <TouchableOpacity onPress={handleUploadPhoto} disabled={photoLoading} activeOpacity={0.8}>
            <View style={styles.avatarFrame}>
              {photoLoading ? (
                <ActivityIndicator size="large" color={HolyGraceColors.goldPrimary} />
              ) : profile.photoUrl ? (
                <Image source={{ uri: `${SERVER_URL}${profile.photoUrl}` }} style={styles.avatarImage} />
              ) : (
                <Text style={styles.avatarText}>{profile.firstName?.charAt(0).toUpperCase()}</Text>
              )}
              <View style={styles.cameraIconContainer}>
                <Ionicons name="camera" size={13} color="#fff" />
              </View>
            </View>
          </TouchableOpacity>
          <Text style={styles.profileName}>{profile.firstName} {profile.lastName || ''}</Text>
          <Text style={styles.profileEmail}>{profile.email}</Text>
          
          <TouchableOpacity 
            style={styles.memberCardBtn} 
            onPress={() => setIsCardVisible(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="qr-code-outline" size={15} color="#fff" style={{ marginRight: 6 }} />
            <Text style={styles.memberCardBtnText}>Kartu Anggota Digital</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* TABS SELECTOR */}
      <View style={styles.tabContainer}>
        {(['biodata', 'family', 'sacraments', 'skills', 'certificates'] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tabButton, activeTab === tab && styles.activeTabButton]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabButtonText, activeTab === tab && styles.activeTabButtonText]}>
              {tab === 'biodata' ? 'Umum' :
               tab === 'family' ? 'Keluarga' :
               tab === 'sacraments' ? 'Sakramen' :
               tab === 'skills' ? 'Bakat' : 'Sertifikat'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ACTIVE TAB CONTENT CONTAINER */}
      <View style={styles.card}>
        
        {/* 1. BIODATA TAB */}
        {activeTab === 'biodata' && (
          <View style={styles.tabContent}>
            <Text style={styles.sectionTitle}>Data Pribadi</Text>

            <Text style={styles.inputLabel}>Nama Depan *</Text>
            <TextInput
              style={styles.input}
              value={firstName}
              onChangeText={setFirstName}
              placeholder="Masukkan nama depan"
            />

            <Text style={styles.inputLabel}>Nama Belakang</Text>
            <TextInput
              style={styles.input}
              value={lastName}
              onChangeText={setLastName}
              placeholder="Masukkan nama belakang"
            />

            <Text style={styles.inputLabel}>No. Handphone</Text>
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              placeholder="0812xxxxxx"
              keyboardType="phone-pad"
            />

            <Text style={styles.inputLabel}>Alamat Lengkap</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={address}
              onChangeText={setAddress}
              placeholder="Alamat tempat tinggal saat ini"
              multiline
              numberOfLines={3}
            />

            <Text style={styles.inputLabel}>Rayon / Sektor Wilayah</Text>
            <TextInput
              style={styles.input}
              value={rayon}
              onChangeText={setRayon}
              placeholder="Contoh: Rayon 1 / Sektor Barat"
            />

            {/* GPS LOCATION SECTION */}
            <View style={{ marginVertical: 12, padding: 12, backgroundColor: '#f0f9ff', borderRadius: 10, borderWidth: 1, borderColor: '#bae6fd' }}>
              <Text style={{ fontSize: 13, fontWeight: 'bold', color: '#0369a1', marginBottom: 6 }}>📍 Koordinat Peta Peta (GPS)</Text>
              
              <TouchableOpacity 
                style={{ backgroundColor: '#0284c7', padding: 10, borderRadius: 8, alignItems: 'center', marginBottom: 10 }}
                onPress={handleGetCurrentLocation}
                disabled={locationGetting}
              >
                {locationGetting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 13 }}>📍 Ambil Koordinat GPS Saat Ini</Text>
                )}
              </TouchableOpacity>

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11, fontWeight: '600', color: '#334155', marginBottom: 4 }}>Latitude</Text>
                  <TextInput
                    style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 6, fontSize: 12 }}
                    value={latitude}
                    onChangeText={setLatitude}
                    placeholder="-6.2088"
                    keyboardType="numeric"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11, fontWeight: '600', color: '#334155', marginBottom: 4 }}>Longitude</Text>
                  <TextInput
                    style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 6, fontSize: 12 }}
                    value={longitude}
                    onChangeText={setLongitude}
                    placeholder="106.8456"
                    keyboardType="numeric"
                  />
                </View>
              </View>
            </View>

            <TouchableOpacity 
              style={styles.saveBtn} 
              onPress={handleSaveBiodata}
              disabled={biodataSaving}
            >
              {biodataSaving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.saveBtnText}>Simpan Biodata</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* 2. FAMILY TAB */}
        {activeTab === 'family' && (
          <View style={styles.tabContent}>
            <Text style={styles.sectionTitle}>Hubungan Keluarga</Text>

            {profile?.family ? (
              <View style={styles.familyInfoCard}>
                <Text style={styles.familyHeaderName}>🏡 {profile.family.name}</Text>
                <Text style={styles.familySub}>Anggota Keluarga:</Text>
                
                {profile.family.members?.map((m: any) => (
                  <View key={m.id} style={styles.familyMemberRow}>
                    <Text style={styles.familyMemberBullet}>•</Text>
                    <Text style={styles.familyMemberName}>
                      {m.firstName} {m.lastName || ''} 
                      {m.id === profile.id ? ' (Anda)' : ''}
                      {m.id === profile.family.headOfFamilyId ? ' 👑 Kepala' : ''}
                    </Text>
                  </View>
                ))}

                <TouchableOpacity 
                  style={styles.leaveFamilyBtn} 
                  onPress={handleLeaveFamily}
                  disabled={familyLoading}
                >
                  <Text style={styles.leaveFamilyBtnText}>Keluar dari Keluarga</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View>
                <Text style={styles.emptyText}>Anda belum terdaftar dalam grup keluarga di gereja ini.</Text>
                
                {/* Join Existing Family */}
                {allFamilies.length > 0 && (
                  <View style={styles.subSection}>
                    <Text style={styles.subTitle}>Gabung Keluarga Terdaftar:</Text>
                    <ScrollView style={styles.familiesList} nestedScrollEnabled>
                      {allFamilies.map((fam) => (
                        <TouchableOpacity
                          key={fam.id}
                          style={styles.familySelectItem}
                          onPress={() => handleJoinFamily(fam.id)}
                          disabled={familyLoading}
                        >
                          <Text style={styles.familySelectText}>🏡 {fam.name}</Text>
                          <Text style={styles.joinText}>Gabung</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}

                {/* Create New Family */}
                <View style={styles.subSection}>
                  <Text style={styles.subTitle}>Buat Keluarga Baru:</Text>
                  <TextInput
                    style={styles.input}
                    value={newFamilyName}
                    onChangeText={setNewFamilyName}
                    placeholder="Nama Keluarga (Contoh: Keluarga Panjaitan)"
                  />
                  <TouchableOpacity 
                    style={styles.actionBtn}
                    onPress={handleCreateFamily}
                    disabled={familyLoading}
                  >
                    {familyLoading ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.actionBtnText}>Buat & Gabung</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        )}

        {/* 3. SACRAMENT TAB */}
        {activeTab === 'sacraments' && (
          <View style={styles.tabContent}>
            <Text style={styles.sectionTitle}>Riwayat Sakramen</Text>

            {/* List sacraments */}
            {profile?.sacraments?.length > 0 ? (
              <View style={styles.sacramentList}>
                {profile.sacraments.map((sac: any) => (
                  <View key={sac.id} style={styles.sacramentCard}>
                    <View style={styles.sacramentHeader}>
                      <Text style={styles.sacramentTypeName}>
                        {sac.type === 'BAPTISM' ? '🌊 BAPTIS AIR' : '🕊️ SIDI / CONFIRMATION'}
                      </Text>
                      <TouchableOpacity 
                        style={styles.deleteBadge}
                        onPress={() => handleDeleteSacrament(sac.id)}
                        disabled={sacramentLoading}
                      >
                        <Text style={styles.deleteText}>Hapus</Text>
                      </TouchableOpacity>
                    </View>
                    <Text style={styles.sacDetails}>Tanggal: {new Date(sac.date).toLocaleDateString('id-ID', { dateStyle: 'long' })}</Text>
                    {sac.location && <Text style={styles.sacDetails}>Tempat: {sac.location}</Text>}
                    {sac.pastorName && <Text style={styles.sacDetails}>Pendeta: {sac.pastorName}</Text>}
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.emptyText}>Belum ada riwayat sakramen yang dicatat.</Text>
            )}

            {/* Add sacrament form */}
            <View style={styles.addForm}>
              <Text style={styles.subTitle}>Tambah Riwayat Sakramen:</Text>
              
              <Text style={styles.inputLabel}>Jenis Sakramen</Text>
              <View style={styles.sacSelector}>
                <TouchableOpacity
                  style={[styles.sacSelectBtn, sacramentType === 'BAPTISM' && styles.sacActiveSelect]}
                  onPress={() => setSacramentType('BAPTISM')}
                >
                  <Text style={[styles.sacSelectBtnText, sacramentType === 'BAPTISM' && styles.sacActiveSelectText]}>Baptis Air</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.sacSelectBtn, sacramentType === 'CONFIRMATION' && styles.sacActiveSelect]}
                  onPress={() => setSacramentType('CONFIRMATION')}
                >
                  <Text style={[styles.sacSelectBtnText, sacramentType === 'CONFIRMATION' && styles.sacActiveSelectText]}>Sidi (Confirmation)</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.inputLabel}>Tanggal Sakramen (YYYY-MM-DD) *</Text>
              <TextInput
                style={styles.input}
                value={sacramentDate}
                onChangeText={setSacramentDate}
                placeholder="Contoh: 2020-12-25"
              />

              <Text style={styles.inputLabel}>Tempat / Lokasi</Text>
              <TextInput
                style={styles.input}
                value={sacramentLocation}
                onChangeText={setSacramentLocation}
                placeholder="Nama Gereja"
              />

              <Text style={styles.inputLabel}>Nama Pendeta</Text>
              <TextInput
                style={styles.input}
                value={sacramentPastor}
                onChangeText={setSacramentPastor}
                placeholder="Pdt. John Doe"
              />

              <TouchableOpacity 
                style={styles.actionBtn}
                onPress={handleAddSacrament}
                disabled={sacramentLoading}
              >
                {sacramentLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.actionBtnText}>Tambahkan Sakramen</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* 4. SKILLS TAB */}
        {activeTab === 'skills' && (
          <View style={styles.tabContent}>
            <Text style={styles.sectionTitle}>Bakat & Karunia</Text>

            {/* List current skills */}
            {profile?.skills?.length > 0 ? (
              <View style={styles.skillChipsContainer}>
                {profile.skills.map((s: any) => (
                  <View key={s.id} style={styles.skillChip}>
                    <Text style={styles.skillChipText}>✨ {s.skill.name}</Text>
                    <Text style={styles.skillChipProficiency}>
                      {'★'.repeat(s.proficiency || 3)}{'☆'.repeat(5 - (s.proficiency || 3))}
                    </Text>
                    <TouchableOpacity 
                      style={styles.skillDeleteBtn}
                      onPress={() => handleRemoveSkill(s.skill.id)}
                      disabled={skillLoading}
                    >
                      <Text style={styles.skillDeleteText}>×</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.emptyText}>Belum ada bakat/keahlian yang ditambahkan.</Text>
            )}

            {/* Add skill form */}
            <View style={styles.addForm}>
              <Text style={styles.subTitle}>Tambahkan Bakat Baru:</Text>

              {allSkills.length > 0 && (
                <View style={styles.skillPickerArea}>
                  <Text style={styles.inputLabel}>Pilih Bakat Terdaftar:</Text>
                  <ScrollView style={styles.skillScrollView} nestedScrollEnabled>
                    {allSkills
                      .filter(sk => !profile?.skills?.some((ps: any) => ps.skill.id === sk.id))
                      .map((sk) => (
                        <TouchableOpacity
                          key={sk.id}
                          style={[
                            styles.skillSelectOption, 
                            selectedSkillId === sk.id && styles.skillSelectOptionActive
                          ]}
                          onPress={() => {
                            setSelectedSkillId(sk.id);
                            setCustomSkillName(''); // Clear custom
                          }}
                        >
                          <Text style={[
                            styles.skillOptionText,
                            selectedSkillId === sk.id && styles.skillOptionTextActive
                          ]}>🎨 {sk.name}</Text>
                        </TouchableOpacity>
                      ))}
                  </ScrollView>
                </View>
              )}

              <Text style={styles.inputLabel}>Atau Ketik Bakat Baru (Kustom):</Text>
              <TextInput
                style={styles.input}
                value={customSkillName}
                onChangeText={(text) => {
                  setCustomSkillName(text);
                  setSelectedSkillId(''); // Clear selection
                }}
                placeholder="Contoh: Bermain Biola, Desain Grafis"
              />

              <Text style={styles.inputLabel}>Tingkat Keahlian (1 - 5 Bintang)</Text>
              <View style={styles.starContainer}>
                {[1, 2, 3, 4, 5].map((num) => (
                  <TouchableOpacity 
                    key={num} 
                    onPress={() => setSkillProficiency(num)}
                  >
                    <Text style={[styles.starText, skillProficiency >= num ? styles.starActive : styles.starInactive]}>
                      ★
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity 
                style={styles.actionBtn}
                onPress={handleAddSkill}
                disabled={skillLoading}
              >
                {skillLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.actionBtnText}>Tambahkan Bakat</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* 5. CERTIFICATES TAB */}
        {activeTab === 'certificates' && (
          <View style={styles.tabContent}>
            <Text style={styles.sectionTitle}>Sertifikat Resmi</Text>
            {certificates.length === 0 ? (
              <Text style={styles.emptyText}>Belum ada sertifikat resmi yang terbit.</Text>
            ) : (
              certificates.map((cert) => (
                <View key={cert.id} style={styles.certCard}>
                  <View style={styles.certHeader}>
                    <Text style={styles.certTitle}>📜 {cert.type === 'BAPTISM' ? 'Sertifikat Baptis' :
                                                     cert.type === 'MARRIAGE' ? 'Sertifikat Pernikahan' :
                                                     cert.type === 'CONFIRMATION' ? 'Sertifikat Sidi' :
                                                     cert.type === 'DEDICATION' ? 'Sertifikat Penyerahan Anak' :
                                                     cert.type === 'MEMBERSHIP' ? 'Sertifikat Keanggotaan' : 'Sertifikat Resmi'}</Text>
                    <Text style={styles.certNumber}>{cert.certificateNumber}</Text>
                  </View>
                  
                  <View style={styles.certDetails}>
                    <Text style={styles.certText}>Penerima: <Text style={styles.certBold}>{cert.recipientName}</Text></Text>
                    <Text style={styles.certText}>Pejabat: {cert.issuedBy}</Text>
                    <Text style={styles.certText}>Tanggal Terbit: {new Date(cert.issuedDate).toLocaleDateString('id-ID', { dateStyle: 'medium' })}</Text>
                    {cert.location ? <Text style={styles.certText}>Lokasi: {cert.location}</Text> : null}
                    {cert.notes ? <Text style={styles.certNote}>Catatan: {cert.notes}</Text> : null}
                  </View>

                  {cert.fileUrl ? (
                    <TouchableOpacity 
                      style={styles.downloadBtn}
                      onPress={() => {
                        const fullUrl = cert.fileUrl.startsWith('http') ? cert.fileUrl : `${SERVER_URL}${cert.fileUrl}`;
                        Linking.openURL(fullUrl).catch(err => {
                          console.log('Failed to open cert URL:', err);
                          Alert.alert('Gagal', 'Tidak dapat membuka file sertifikat.');
                        });
                      }}
                    >
                      <Text style={styles.downloadBtnText}>Lihat / Unduh Dokumen Sertifikat ↗</Text>
                    </TouchableOpacity>
                  ) : (
                    <Text style={styles.noFileText}>File sertifikat tidak terlampir</Text>
                  )}
                </View>
              ))
            )}
          </View>
        )}

      </View>

      {/* LOGOUT BUTTON */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
        <Ionicons name="log-out-outline" size={18} color={HolyGraceColors.danger} style={{ marginRight: 8 }} />
        <Text style={styles.logoutText}>Log Out dari Akun</Text>
      </TouchableOpacity>

      {/* DIGITAL MEMBER CARD MODAL */}
      <Modal
        visible={isCardVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsCardVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.memberCardContainer}>
            {/* Card Header with Logo & Tenant Name */}
            <View style={styles.memberCardHeader}>
              <View style={styles.headerLogoRow}>
                <View style={styles.headerCrestCircle}>
                  <Ionicons name="sparkles" size={13} color={HolyGraceColors.goldAccent} />
                </View>
                <Text style={styles.memberCardTenantName} numberOfLines={1}>
                  {profile?.tenant?.name || 'Eklesia Church'}
                </Text>
              </View>
              <Text style={styles.memberCardTag}>KARTU ANGGOTA</Text>
            </View>

            {/* Card Body */}
            <View style={styles.memberCardBody}>
              {/* Photo & Details Row */}
              <View style={styles.detailsRow}>
                <View style={styles.cardAvatarFrame}>
                  {profile?.photoUrl ? (
                    <Image source={{ uri: `${SERVER_URL}${profile.photoUrl}` }} style={styles.cardAvatarImage} />
                  ) : (
                    <View style={styles.cardAvatarPlaceholder}>
                      <Text style={styles.cardAvatarPlaceholderText}>
                        {profile?.firstName?.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  )}
                </View>
                <View style={styles.cardInfoCol}>
                  <Text style={styles.cardMemberName} numberOfLines={1}>
                    {profile?.firstName} {profile?.lastName || ''}
                  </Text>
                  <Text style={styles.cardMemberLabel}>ID Anggota:</Text>
                  <Text style={styles.cardMemberId} numberOfLines={1}>{profile?.id}</Text>
                  <Text style={styles.cardMemberLabel}>Telepon:</Text>
                  <Text style={styles.cardMemberPhone} numberOfLines={1}>{profile?.phone || '-'}</Text>
                </View>
              </View>

              {/* QR Code Divider */}
              <View style={styles.cardDivider} />

              {/* QR Code Section */}
              <View style={styles.cardQrSection}>
                <QRCode value={profile?.id || 'NO-ID'} size={150} />
                <Text style={styles.cardQrInstruction}>Tunjukkan QR Code ini ke petugas saat check-in kebaktian</Text>
              </View>
            </View>

            {/* Close Button */}
            <TouchableOpacity style={styles.closeCardBtn} onPress={() => setIsCardVisible(false)}>
              <Text style={styles.closeCardBtnText}>Tutup</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: HolyGraceColors.background, padding: 16 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: HolyGraceColors.background },
  header: { fontSize: 22, fontWeight: '800', color: HolyGraceColors.navyPrimary, marginBottom: 16, marginTop: 16, letterSpacing: -0.3 },
  
  // Avatar Card Header
  avatarCard: { 
    backgroundColor: HolyGraceColors.navyDark, 
    padding: 22, 
    borderRadius: 22, 
    alignItems: 'center', 
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(217, 119, 6, 0.3)',
    ...Shadows.md,
  },
  avatarFrame: { 
    width: 88, 
    height: 88, 
    borderRadius: 44, 
    backgroundColor: 'rgba(217, 119, 6, 0.15)', 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginBottom: 12,
    position: 'relative',
    borderWidth: 2,
    borderColor: HolyGraceColors.goldPrimary,
  },
  avatarImage: { width: 84, height: 84, borderRadius: 42 },
  avatarText: { fontSize: 34, fontWeight: 'bold', color: HolyGraceColors.goldAccent },
  cameraIconContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: HolyGraceColors.navySecondary,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff'
  },
  cameraIcon: { fontSize: 13, color: '#fff' },
  profileName: { fontSize: 20, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.3 },
  profileEmail: { fontSize: 13, color: HolyGraceColors.goldAccent, marginTop: 2, fontWeight: '500' },

  // Tabs
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: HolyGraceColors.surfaceSubtle,
    padding: 4,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: HolyGraceColors.borderLight,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    borderRadius: 9,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as const } : {}),
  },
  activeTabButton: {
    backgroundColor: HolyGraceColors.surface,
    ...Shadows.sm,
  },
  tabButtonText: { fontSize: 11, fontWeight: '600', color: HolyGraceColors.textMuted },
  activeTabButtonText: { color: HolyGraceColors.navyPrimary, fontWeight: '800' },

  // Profile Card
  card: { 
    backgroundColor: HolyGraceColors.surface, 
    borderRadius: 22, 
    padding: 20, 
    borderWidth: 1, 
    borderColor: HolyGraceColors.border,
    marginBottom: 20,
    ...Shadows.card,
  },
  tabContent: {
    width: '100%'
  },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: HolyGraceColors.navyPrimary, marginBottom: 16 },
  inputLabel: { fontSize: 11, fontWeight: '700', color: HolyGraceColors.textSecondary, marginBottom: 6, marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: {
    backgroundColor: HolyGraceColors.surfaceSubtle,
    borderWidth: 1,
    borderColor: HolyGraceColors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 11,
    fontSize: 14,
    color: HolyGraceColors.textPrimary,
    marginBottom: 14
  },
  textArea: { height: 70, textAlignVertical: 'top' },
  saveBtn: {
    backgroundColor: HolyGraceColors.navySecondary,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as const } : {}),
  },
  saveBtnText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },

  // Family UI
  familyInfoCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  familyHeaderName: { fontSize: 17, fontWeight: 'bold', color: '#0f172a' },
  familySub: { fontSize: 13, fontWeight: 'bold', color: '#64748b', marginTop: 12, marginBottom: 6 },
  familyMemberRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6, paddingLeft: 6 },
  familyMemberBullet: { fontSize: 14, color: '#3b82f6', marginRight: 8 },
  familyMemberName: { fontSize: 14, color: '#334155', fontWeight: '500' },
  leaveFamilyBtn: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fee2e2',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20
  },
  leaveFamilyBtnText: { color: '#ef4444', fontSize: 13, fontWeight: 'bold' },
  
  // Selection Sections
  subSection: { marginTop: 18, borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 14 },
  subTitle: { fontSize: 14, fontWeight: 'bold', color: '#334155', marginBottom: 10 },
  familiesList: { maxHeight: 120, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, backgroundColor: '#f8fafc', padding: 8, marginBottom: 14 },
  familySelectItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: '#e2e8f0', alignItems: 'center' },
  familySelectText: { fontSize: 13, color: '#334155', fontWeight: '500' },
  joinText: { fontSize: 12, color: '#2563eb', fontWeight: 'bold' },
  
  actionBtn: { backgroundColor: '#10b981', paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  actionBtnText: { color: '#fff', fontSize: 13, fontWeight: 'bold' },
  emptyText: { fontSize: 13, color: '#64748b', lineHeight: 18, textAlign: 'center', marginVertical: 12 },

  // Sacrament UI
  sacramentList: { marginBottom: 16 },
  sacramentCard: { backgroundColor: '#f8fafc', padding: 14, borderRadius: 14, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 10 },
  sacramentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  sacramentTypeName: { fontSize: 13, fontWeight: 'bold', color: '#2563eb' },
  deleteBadge: { backgroundColor: '#fef2f2', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1, borderColor: '#fee2e2' },
  deleteText: { fontSize: 11, color: '#ef4444', fontWeight: 'bold' },
  sacDetails: { fontSize: 13, color: '#475569', marginTop: 3 },
  
  addForm: { marginTop: 14, borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 14 },
  sacSelector: { flexDirection: 'row', marginBottom: 12 },
  sacSelectBtn: { flex: 1, paddingVertical: 9, borderWidth: 1, borderColor: '#cbd5e1', alignItems: 'center', borderRadius: 8, backgroundColor: '#f8fafc', marginHorizontal: 4 },
  sacActiveSelect: { backgroundColor: '#3b82f6', borderColor: '#3b82f6' },
  sacSelectBtnText: { fontSize: 12, color: '#475569', fontWeight: '600' },
  sacActiveSelectText: { color: '#fff' },

  // Skills UI
  skillChipsContainer: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 16 },
  skillChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#bbf7d0', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, margin: 4 },
  skillChipText: { fontSize: 12, fontWeight: 'bold', color: '#166534' },
  skillChipProficiency: { fontSize: 10, color: '#15803d', marginLeft: 6, marginRight: 2 },
  skillDeleteBtn: { marginLeft: 6, paddingHorizontal: 4 },
  skillDeleteText: { fontSize: 15, color: '#dc2626', fontWeight: 'bold' },
  
  skillPickerArea: { marginBottom: 14 },
  skillScrollView: { maxHeight: 120, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, backgroundColor: '#f8fafc', padding: 8 },
  skillSelectOption: { paddingVertical: 8, paddingHorizontal: 10, borderRadius: 6, marginBottom: 4 },
  skillSelectOptionActive: { backgroundColor: '#dbeafe' },
  skillOptionText: { fontSize: 13, color: '#475569' },
  skillOptionTextActive: { color: '#1e40af', fontWeight: 'bold' },
  
  starContainer: { flexDirection: 'row', justifyContent: 'center', marginVertical: 14 },
  starText: { fontSize: 32, marginHorizontal: 6 },
  starActive: { color: '#eab308' },
  starInactive: { color: '#cbd5e1' },

  // Certificates Tab styles
  certCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  certHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#cbd5e1',
    paddingBottom: 8,
    marginBottom: 10,
  },
  certTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  certNumber: {
    fontSize: 11,
    color: '#64748b',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontWeight: '600',
  },
  certDetails: {
    marginBottom: 12,
  },
  certText: {
    fontSize: 12,
    color: '#475569',
    marginBottom: 4,
  },
  certBold: {
    fontWeight: 'bold',
    color: '#0f172a',
  },
  certNote: {
    fontSize: 11,
    fontStyle: 'italic',
    color: '#64748b',
    marginTop: 4,
  },
  downloadBtn: {
    backgroundColor: '#e0e7ff',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  downloadBtnText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#4f46e5',
  },
  noFileText: {
    fontSize: 11,
    color: '#94a3b8',
    textAlign: 'center',
    fontStyle: 'italic',
  },

  logoutBtn: { 
    marginVertical: 16, 
    padding: 14, 
    borderRadius: 14, 
    borderWidth: 1, 
    borderColor: HolyGraceColors.dangerBorder,
    backgroundColor: HolyGraceColors.dangerLight,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as const } : {}),
  },
  logoutText: { color: HolyGraceColors.dangerText, fontSize: 14, fontWeight: '700' },

  // Digital member card styles
  memberCardBtn: {
    backgroundColor: HolyGraceColors.navySecondary,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 20,
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    ...Shadows.sm,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as const } : {}),
  },
  memberCardBtnText: {
    color: '#ffffff',
    fontSize: 12.5,
    fontWeight: '700'
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  memberCardContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    width: '100%',
    maxWidth: 340,
    ...Shadows.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(217, 119, 6, 0.3)'
  },
  memberCardHeader: {
    backgroundColor: HolyGraceColors.navyDark,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(217, 119, 6, 0.3)',
  },
  headerLogoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8
  },
  headerCrestCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(217, 119, 6, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  memberCardTenantName: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: 'bold'
  },
  memberCardTag: {
    color: HolyGraceColors.goldAccent,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5
  },
  memberCardBody: {
    padding: 20
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20
  },
  cardAvatarFrame: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
    marginRight: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc'
  },
  cardAvatarImage: {
    width: '100%',
    height: '100%'
  },
  cardAvatarPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center'
  },
  cardAvatarPlaceholderText: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: 'bold'
  },
  cardInfoCol: {
    flex: 1
  },
  cardMemberName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 6
  },
  cardMemberLabel: {
    fontSize: 9,
    color: '#64748b',
    textTransform: 'uppercase',
    fontWeight: 'bold',
    letterSpacing: 0.5,
    marginTop: 4
  },
  cardMemberId: {
    fontSize: 10,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: '#3b4256',
    fontWeight: '600'
  },
  cardMemberPhone: {
    fontSize: 11,
    color: '#334155',
    fontWeight: '500'
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginBottom: 20
  },
  cardQrSection: {
    alignItems: 'center',
    justifyContent: 'center'
  },
  cardQrInstruction: {
    fontSize: 11,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 16
  },
  closeCardBtn: {
    backgroundColor: '#f1f5f9',
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9'
  },
  closeCardBtnText: {
    color: '#475569',
    fontSize: 14,
    fontWeight: 'bold'
  }
});
