import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  Modal,
} from 'react-native';
import { client } from '../api/client';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';

interface InboxScreenProps {
  onClose: () => void;
}

export default function InboxScreen({ onClose }: InboxScreenProps) {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // QR Modal state
  const [selectedQR, setSelectedQR] = useState<string | null>(null);

  const fetchNotifications = async (pageNum: number = 1, isRefresh: boolean = false) => {
    try {
      const res = await client.get(`/notifications?page=${pageNum}`);
      const data = res.data;
      
      if (isRefresh || pageNum === 1) {
        setNotifications(data.notifications);
      } else {
        setNotifications((prev) => [...prev, ...data.notifications]);
      }
      
      setUnreadCount(data.unreadCount);
      setHasMore(data.notifications.length === 20); // API limit is 20
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchNotifications(1);
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    setPage(1);
    fetchNotifications(1, true);
  };

  const handleLoadMore = () => {
    if (!loading && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchNotifications(nextPage);
    }
  };

  const handleMarkAsRead = async (item: any) => {
    if (item.isRead) return;

    try {
      // Optimistic update
      setNotifications((prev) =>
        prev.map((n) => (n.id === item.id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));

      await client.patch(`/notifications/${item.id}/read`);
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
      // Rollback
      fetchNotifications(page, true);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      // Optimistic update
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);

      await client.patch('/notifications/read-all');
    } catch (err) {
      console.error('Failed to mark all as read:', err);
      fetchNotifications(page, true);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'APPROVAL':
        return { name: 'checkmark-circle', color: '#10b981', bg: '#ecfdf5' };
      case 'REJECTION':
        return { name: 'close-circle', color: '#ef4444', bg: '#fef2f2' };
      case 'BIRTHDAY':
        return { name: 'gift', color: '#ec4899', bg: '#fdf2f8' };
      case 'GREETING':
      case 'BULK_GREETING':
        return { name: 'sparkles', color: '#f59e0b', bg: '#fffbeb' };
      default:
        return { name: 'information-circle', color: '#3b82f6', bg: '#eff6ff' };
    }
  };

  const formatTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleString('id-ID', {
        dateStyle: 'medium',
        timeStyle: 'short',
      });
    } catch {
      return '';
    }
  };

  const renderItem = ({ item }: { item: any }) => {
    const iconConfig = getIcon(item.type);
    const hasQR = item.data?.qrContent;

    return (
      <TouchableOpacity
        style={[styles.notiCard, !item.isRead && styles.unreadCard]}
        onPress={() => handleMarkAsRead(item)}
        activeOpacity={0.7}
      >
        <View style={styles.notiHeader}>
          <View style={[styles.iconContainer, { backgroundColor: iconConfig.bg }]}>
            <Ionicons name={iconConfig.name as any} size={20} color={iconConfig.color} />
          </View>
          <View style={styles.notiContent}>
            <View style={styles.notiTitleRow}>
              <Text style={[styles.notiTitle, !item.isRead && styles.unreadTitle]}>
                {item.title}
              </Text>
              {!item.isRead && <View style={styles.unreadDot} />}
            </View>
            <Text style={styles.notiBody}>{item.body}</Text>
            <Text style={styles.notiTime}>{formatTime(item.createdAt)}</Text>

            {hasQR && (
              <TouchableOpacity
                style={styles.qrButton}
                onPress={() => setSelectedQR(item.data.qrContent)}
              >
                <Ionicons name="qr-code-outline" size={16} color="#fff" style={{ marginRight: 6 }} />
                <Text style={styles.qrButtonText}>Tampilkan QR Code Check-in</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onClose}>
          <Ionicons name="chevron-back" size={24} color="#1e293b" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Inbox & Notifikasi</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Action Bar */}
      {notifications.length > 0 && unreadCount > 0 && (
        <View style={styles.actionBar}>
          <Text style={styles.unreadLabel}>{unreadCount} pesan belum dibaca</Text>
          <TouchableOpacity style={styles.markAllBtn} onPress={handleMarkAllAsRead}>
            <Text style={styles.markAllText}>Tandai semua dibaca</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Main List */}
      {loading && page === 1 ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#3b82f6" />
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.2}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="mail-open-outline" size={64} color="#94a3b8" />
              <Text style={styles.emptyText}>Tidak ada notifikasi untuk saat ini</Text>
            </View>
          }
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        />
      )}

      {/* QR Code Modal */}
      <Modal
        visible={!!selectedQR}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSelectedQR(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.qrModalContainer}>
            <Text style={styles.qrModalTitle}>QR Code Check-in</Text>
            <Text style={styles.qrModalDesc}>Tunjukkan QR Code ini ke petugas untuk scan kehadiran acara</Text>
            
            {selectedQR && (
              <View style={styles.qrWrapper}>
                <QRCode value={selectedQR} size={200} />
              </View>
            )}
            
            <Text style={styles.qrCodeText}>ID: {selectedQR}</Text>

            <TouchableOpacity style={styles.closeModalBtn} onPress={() => setSelectedQR(null)}>
              <Text style={styles.closeModalText}>Tutup</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    backgroundColor: '#fff',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  actionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#eff6ff',
    borderBottomWidth: 1,
    borderBottomColor: '#dbeafe',
  },
  unreadLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1e40af',
  },
  markAllBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  markAllText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#3b82f6',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyText: {
    fontSize: 15,
    color: '#64748b',
    marginTop: 12,
    fontWeight: '500',
  },
  notiCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  unreadCard: {
    backgroundColor: '#f1f5f9',
    borderColor: '#cbd5e1',
  },
  notiHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  notiContent: {
    flex: 1,
  },
  notiTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingRight: 4,
  },
  notiTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
    flex: 1,
  },
  unreadTitle: {
    color: '#0f172a',
    fontWeight: '700',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3b82f6',
    marginLeft: 8,
  },
  notiBody: {
    fontSize: 13,
    color: '#475569',
    marginTop: 4,
    lineHeight: 18,
  },
  notiTime: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 8,
    fontWeight: '500',
  },
  qrButton: {
    flexDirection: 'row',
    backgroundColor: '#3b82f6',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignSelf: 'flex-start',
    alignItems: 'center',
    marginTop: 12,
  },
  qrButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  qrModalContainer: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
  },
  qrModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  qrModalDesc: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 16,
  },
  qrWrapper: {
    marginVertical: 20,
    padding: 10,
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  qrCodeText: {
    fontSize: 11,
    fontFamily: 'monospace',
    color: '#94a3b8',
    marginBottom: 20,
  },
  closeModalBtn: {
    backgroundColor: '#1e293b',
    paddingVertical: 12,
    width: '100%',
    borderRadius: 12,
    alignItems: 'center',
  },
  closeModalText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
