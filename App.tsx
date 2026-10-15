import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Modal, Platform, Alert } from 'react-native';
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
import { HolyGraceColors, Shadows } from './src/theme/colors';

if (Platform.OS === 'web') {
  Alert.alert = (title, message, buttons) => {
    const text = message ? `${title}\n\n${message}` : title;
    if (buttons && buttons.length > 1) {
      const confirm = window.confirm(text);
      if (confirm) {
        const positiveButton = buttons.find(b => b.style !== 'cancel');
        if (positiveButton && positiveButton.onPress) {
          positiveButton.onPress();
        }
      } else {
        const negativeButton = buttons.find(b => b.style === 'cancel');
        if (negativeButton && negativeButton.onPress) {
          negativeButton.onPress();
        }
      }
    } else {
      window.alert(text);
      if (buttons && buttons[0] && buttons[0].onPress) {
        buttons[0].onPress();
      }
    }
  };
}

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
        <View style={styles.brandRow}>
          <View style={styles.logoBadge}>
            <Ionicons name="sparkles" size={16} color={HolyGraceColors.goldPrimary} />
          </View>
          <View style={styles.brandTextContainer}>
            <View style={styles.titleRow}>
              <Text style={styles.headerAppTitle}>Eklesia</Text>
              <View style={styles.mobilePill}>
                <Text style={styles.mobilePillText}>JEMAAT</Text>
              </View>
            </View>
            <Text style={styles.headerAppSubtitle} numberOfLines={1}>
              {churchName}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.bellButton}
          onPress={() => setIsInboxOpen(true)}
          activeOpacity={0.7}
        >
          <Ionicons name="notifications-outline" size={20} color={HolyGraceColors.navyPrimary} />
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

      {/* Floating Modern Tab Bar */}
      <View style={[styles.tabBar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
        <TouchableOpacity
          style={[styles.tabItem, tab === 'HOME' && styles.tabItemActive]}
          onPress={() => setTab('HOME')}
          activeOpacity={0.7}
        >
          <Ionicons
            name={tab === 'HOME' ? 'home' : 'home-outline'}
            size={20}
            color={tab === 'HOME' ? HolyGraceColors.navySecondary : HolyGraceColors.textMuted}
          />
          <Text style={[styles.tabText, tab === 'HOME' && styles.tabActive]}>Home</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, tab === 'MEDIA' && styles.tabItemActive]}
          onPress={() => setTab('MEDIA')}
          activeOpacity={0.7}
        >
          <Ionicons
            name={tab === 'MEDIA' ? 'play-circle' : 'play-circle-outline'}
            size={20}
            color={tab === 'MEDIA' ? HolyGraceColors.navySecondary : HolyGraceColors.textMuted}
          />
          <Text style={[styles.tabText, tab === 'MEDIA' && styles.tabActive]}>Media</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, tab === 'GIVING' && styles.tabItemActive]}
          onPress={() => setTab('GIVING')}
          activeOpacity={0.7}
        >
          <Ionicons
            name={tab === 'GIVING' ? 'heart' : 'heart-outline'}
            size={20}
            color={tab === 'GIVING' ? HolyGraceColors.navySecondary : HolyGraceColors.textMuted}
          />
          <Text style={[styles.tabText, tab === 'GIVING' && styles.tabActive]}>Giving</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, tab === 'PROFILE' && styles.tabItemActive]}
          onPress={() => setTab('PROFILE')}
          activeOpacity={0.7}
        >
          <Ionicons
            name={tab === 'PROFILE' ? 'person' : 'person-outline'}
            size={20}
            color={tab === 'PROFILE' ? HolyGraceColors.navySecondary : HolyGraceColors.textMuted}
          />
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
        <InboxScreen
          onClose={() => {
            setIsInboxOpen(false);
            fetchUnreadCount();
          }}
        />
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
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: HolyGraceColors.background,
  },
  container: {
    flex: 1,
    backgroundColor: HolyGraceColors.background,
  },
  content: { flex: 1 },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: HolyGraceColors.borderLight,
    backgroundColor: HolyGraceColors.surface,
    ...Shadows.sm,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  logoBadge: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: HolyGraceColors.goldLight,
    borderWidth: 1,
    borderColor: HolyGraceColors.goldBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandTextContainer: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerAppTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: HolyGraceColors.navyPrimary,
    letterSpacing: -0.3,
  },
  mobilePill: {
    backgroundColor: HolyGraceColors.blueLight,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  mobilePillText: {
    fontSize: 9,
    fontWeight: '800',
    color: HolyGraceColors.blueAccent,
    letterSpacing: 0.5,
  },
  headerAppSubtitle: {
    fontSize: 12,
    color: HolyGraceColors.textSecondary,
    fontWeight: '500',
    marginTop: 1,
  },
  bellButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: HolyGraceColors.surface,
    borderWidth: 1,
    borderColor: HolyGraceColors.border,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as const } : {}),
  },
  badgeContainer: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: HolyGraceColors.danger,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: HolyGraceColors.surface,
  },
  badgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: HolyGraceColors.surface,
    borderTopWidth: 1,
    borderColor: HolyGraceColors.borderLight,
    paddingTop: 8,
    paddingHorizontal: 12,
    ...Shadows.md,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    borderRadius: 12,
    marginHorizontal: 3,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as const } : {}),
  },
  tabItemActive: {
    backgroundColor: HolyGraceColors.blueLight,
  },
  tabText: {
    fontSize: 11,
    color: HolyGraceColors.textMuted,
    fontWeight: '600',
    marginTop: 3,
  },
  tabActive: {
    color: HolyGraceColors.navySecondary,
    fontWeight: '700',
  },
});

