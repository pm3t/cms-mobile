import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Modal } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import LoginScreen from './src/screens/LoginScreen';
import HomeScreen from './src/screens/HomeScreen';
import GivingScreen from './src/screens/GivingScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import MediaScreen from './src/screens/MediaScreen';
import { client } from './src/api/client';
import InboxScreen from './src/screens/InboxScreen';

function MainApp() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('HOME');
  const [unreadCount, setUnreadCount] = useState(0);
  const [isInboxOpen, setIsInboxOpen] = useState(false);
  const [churchName, setChurchName] = useState('Jemaat App');
  const insets = useSafeAreaInsets();

  useEffect(() => {
    checkToken();
  }, []);

  const checkToken = async () => {
    const token = await AsyncStorage.getItem('mobile_token');
    setIsAuthenticated(!!token);
    setLoading(false);
  };

  const fetchUnreadCount = async () => {
    try {
      const res = await client.get('/notifications?page=1');
      setUnreadCount(res.data.unreadCount || 0);
    } catch (err) {
      console.log('Failed to fetch unread notification count:', err);
    }
  };

  const fetchProfileAndTenant = async () => {
    try {
      const res = await client.get('/profile');
      if (res.data?.tenant?.name) {
        setChurchName(res.data.tenant.name);
        await AsyncStorage.setItem('cached_church_name', res.data.tenant.name);
      }
    } catch (err) {
      console.log('Failed to fetch profile/tenant info:', err);
      const cached = await AsyncStorage.getItem('cached_church_name');
      if (cached) setChurchName(cached);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchUnreadCount();
      fetchProfileAndTenant();
      // Fetch every 30 seconds for updates
      const interval = setInterval(fetchUnreadCount, 30000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </SafeAreaView>
    );
  }

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }} edges={['top', 'left', 'right', 'bottom']}>
        <LoginScreen onLogin={checkToken} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Top Sticky Header */}
      <View style={styles.topHeader}>
        <View>
          <Text style={styles.headerAppTitle}>CMS Eklesia</Text>
          <Text style={styles.headerAppSubtitle}>{churchName}</Text>
        </View>
        <TouchableOpacity style={styles.bellButton} onPress={() => setIsInboxOpen(true)}>
          <Ionicons name="notifications-outline" size={22} color="#1e293b" />
          {unreadCount > 0 && (
            <View style={styles.badgeContainer}>
              <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {tab === 'HOME' && <HomeScreen />}
        {tab === 'MEDIA' && <MediaScreen />}
        {tab === 'GIVING' && <GivingScreen />}
        {tab === 'PROFILE' && <ProfileScreen onLogout={checkToken} />}
      </View>
      
      <View style={[styles.tabBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <TouchableOpacity style={styles.tabItem} onPress={() => setTab('HOME')}>
          <Ionicons name={tab === 'HOME' ? 'home' : 'home-outline'} size={20} color={tab === 'HOME' ? '#3b82f6' : '#64748b'} />
          <Text style={[styles.tabText, tab === 'HOME' && styles.tabActive]}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabItem} onPress={() => setTab('MEDIA')}>
          <Ionicons name={tab === 'MEDIA' ? 'play-circle' : 'play-circle-outline'} size={20} color={tab === 'MEDIA' ? '#3b82f6' : '#64748b'} />
          <Text style={[styles.tabText, tab === 'MEDIA' && styles.tabActive]}>Media</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabItem} onPress={() => setTab('GIVING')}>
          <Ionicons name={tab === 'GIVING' ? 'heart' : 'heart-outline'} size={20} color={tab === 'GIVING' ? '#3b82f6' : '#64748b'} />
          <Text style={[styles.tabText, tab === 'GIVING' && styles.tabActive]}>Giving</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabItem} onPress={() => setTab('PROFILE')}>
          <Ionicons name={tab === 'PROFILE' ? 'person' : 'person-outline'} size={20} color={tab === 'PROFILE' ? '#3b82f6' : '#64748b'} />
          <Text style={[styles.tabText, tab === 'PROFILE' && styles.tabActive]}>Profile</Text>
        </TouchableOpacity>
      </View>

      <Modal
        visible={isInboxOpen}
        animationType="slide"
        onRequestClose={() => {
          setIsInboxOpen(false);
          fetchUnreadCount();
        }}
      >
        <InboxScreen onClose={() => {
          setIsInboxOpen(false);
          fetchUnreadCount();
        }} />
      </Modal>
    </SafeAreaView>
  );
}


export default function App() {
  return (
    <SafeAreaProvider>
      <MainApp />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' },
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { flex: 1 },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    backgroundColor: '#fff',
  },
  headerAppTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
  },
  headerAppSubtitle: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
    marginTop: 1,
  },
  bellButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  badgeContainer: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  badgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  tabBar: { 
    flexDirection: 'row', 
    backgroundColor: '#fff', 
    borderTopWidth: 1, 
    borderColor: '#e2e8f0', 
    paddingTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 8,
  },
  tabItem: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  tabText: { fontSize: 10, color: '#64748b', fontWeight: 'bold', marginTop: 4 },
  tabActive: { color: '#3b82f6' }
});

