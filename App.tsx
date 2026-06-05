import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import LoginScreen from './src/screens/LoginScreen';
import HomeScreen from './src/screens/HomeScreen';
import GivingScreen from './src/screens/GivingScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import MediaScreen from './src/screens/MediaScreen';
import PrayerScreen from './src/screens/PrayerScreen';
import MinistryScreen from './src/screens/MinistryScreen';

function MainApp() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('HOME');
  const insets = useSafeAreaInsets();

  useEffect(() => {
    checkToken();
  }, []);

  const checkToken = async () => {
    const token = await AsyncStorage.getItem('mobile_token');
    setIsAuthenticated(!!token);
    setLoading(false);
  };

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
      <View style={styles.content}>
        {tab === 'HOME' && <HomeScreen />}
        {tab === 'MEDIA' && <MediaScreen />}
        {tab === 'PRAYER' && <PrayerScreen />}
        {tab === 'MINISTRY' && <MinistryScreen />}
        {tab === 'GIVING' && <GivingScreen />}
        {tab === 'PROFILE' && <ProfileScreen onLogout={checkToken} />}
      </View>
      
      <View style={[styles.tabBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <TouchableOpacity style={styles.tabItem} onPress={() => setTab('HOME')}>
          <Ionicons name={tab === 'HOME' ? 'calendar' : 'calendar-outline'} size={20} color={tab === 'HOME' ? '#3b82f6' : '#64748b'} />
          <Text style={[styles.tabText, tab === 'HOME' && styles.tabActive]}>Events</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabItem} onPress={() => setTab('MEDIA')}>
          <Ionicons name={tab === 'MEDIA' ? 'play-circle' : 'play-circle-outline'} size={20} color={tab === 'MEDIA' ? '#3b82f6' : '#64748b'} />
          <Text style={[styles.tabText, tab === 'MEDIA' && styles.tabActive]}>Media</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabItem} onPress={() => setTab('PRAYER')}>
          <Ionicons name={tab === 'PRAYER' ? 'chatbubbles' : 'chatbubbles-outline'} size={20} color={tab === 'PRAYER' ? '#3b82f6' : '#64748b'} />
          <Text style={[styles.tabText, tab === 'PRAYER' && styles.tabActive]}>Prayer</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabItem} onPress={() => setTab('MINISTRY')}>
          <Ionicons name={tab === 'MINISTRY' ? 'people' : 'people-outline'} size={20} color={tab === 'MINISTRY' ? '#3b82f6' : '#64748b'} />
          <Text style={[styles.tabText, tab === 'MINISTRY' && styles.tabActive]}>Pelayanan</Text>
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
  tabBar: { 
    flexDirection: 'row', 
    backgroundColor: '#fff', 
    borderTopWidth: 1, 
    borderColor: '#e2e8f0', 
    paddingTop: 12,
    // Add light shadow for a premium feel
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

