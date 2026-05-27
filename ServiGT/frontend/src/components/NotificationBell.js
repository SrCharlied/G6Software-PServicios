import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { getNotificaciones, getUnreadNotificationsCount } from '../services/api';
import { T } from '../theme';

export default function NotificationBell({ onPress }) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState('');

  useEffect(() => {
    let mounted = true;

    const loadCount = async () => {
      try {
        const count = await getUnreadNotificationsCount();
        if (mounted) setUnreadCount(count);
      } catch {
        if (mounted) setUnreadCount(0);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadCount();

    return () => { mounted = false; };
  }, []);

  const badgeText = unreadCount > 99 ? '99+' : String(unreadCount);

  const loadNotifications = async () => {
    setListLoading(true);
    setListError('');
    try {
      const data = await getNotificaciones();
      setNotifications(data.notificaciones || []);
      setUnreadCount(data.no_leidas || 0);
    } catch (error) {
      setListError(error.message);
    } finally {
      setListLoading(false);
    }
  };

  const handlePress = () => {
    onPress?.();
    setOpen(true);
    loadNotifications();
  };

  const formatDate = (value) => {
    if (!value) return '';
    try {
      return new Date(value).toLocaleDateString('es-GT', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  };

  return (
    <>
      <TouchableOpacity
        style={styles.button}
        onPress={handlePress}
        activeOpacity={0.75}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <View style={styles.bellIcon}>
          <View style={styles.bellBody} />
          <View style={styles.bellBase} />
          <View style={styles.bellClapper} />
        </View>
        {loading ? (
          <View style={styles.loader}>
            <ActivityIndicator size="small" color={T.blue} />
          </View>
        ) : unreadCount > 0 ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badgeText}</Text>
          </View>
        ) : null}
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.panel} onPress={(event) => event.stopPropagation?.()}>
            <View style={styles.panelHeader}>
              <Text style={styles.panelTitle}>Notificaciones</Text>
              <TouchableOpacity onPress={loadNotifications} disabled={listLoading}>
                <Text style={styles.refreshText}>{listLoading ? 'Cargando...' : 'Actualizar'}</Text>
              </TouchableOpacity>
            </View>

            {listLoading && notifications.length === 0 ? (
              <View style={styles.stateBox}>
                <ActivityIndicator color={T.blue} />
                <Text style={styles.stateText}>Cargando notificaciones...</Text>
              </View>
            ) : listError ? (
              <View style={styles.stateBox}>
                <Text style={styles.errorText}>{listError}</Text>
              </View>
            ) : notifications.length === 0 ? (
              <View style={styles.stateBox}>
                <Text style={styles.emptyTitle}>Sin notificaciones</Text>
                <Text style={styles.stateText}>Tus avisos apareceran aqui.</Text>
              </View>
            ) : (
              <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
                {notifications.map((item) => (
                  <View
                    key={item.id}
                    style={[styles.notificationItem, !item.leida && styles.notificationUnread]}
                  >
                    <View style={styles.notificationTop}>
                      <Text style={styles.notificationTitle} numberOfLines={1}>
                        {item.titulo || 'Notificacion'}
                      </Text>
                      {!item.leida ? <View style={styles.unreadDot} /> : null}
                    </View>
                    <Text style={styles.notificationMessage} numberOfLines={3}>
                      {item.mensaje || ''}
                    </Text>
                    <Text style={styles.notificationDate}>{formatDate(item.created_at)}</Text>
                  </View>
                ))}
              </ScrollView>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  bellIcon: {
    width: 18,
    height: 20,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  bellBody: {
    width: 16,
    height: 14,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,
    borderWidth: 2,
    borderColor: T.ink,
    borderBottomWidth: 0,
  },
  bellBase: {
    width: 20,
    height: 2,
    borderRadius: 2,
    backgroundColor: T.ink,
  },
  bellClapper: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: T.ink,
    marginTop: 1,
  },
  loader: {
    position: 'absolute',
    top: -2,
    right: -2,
    transform: [{ scale: 0.55 }],
  },
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    minWidth: 17,
    height: 17,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: T.danger,
    borderWidth: 1,
    borderColor: T.paper,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(14,20,36,0.28)',
    alignItems: 'flex-end',
    paddingTop: 58,
    paddingRight: 12,
  },
  panel: {
    width: 320,
    maxWidth: '94%',
    maxHeight: 430,
    backgroundColor: T.paper,
    borderRadius: T.rMd,
    borderWidth: 1,
    borderColor: T.border,
    overflow: 'hidden',
    ...T.sh3,
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
  },
  panelTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: T.ink,
  },
  refreshText: {
    fontSize: 12,
    fontWeight: '700',
    color: T.blue,
  },
  stateBox: {
    padding: 22,
    alignItems: 'center',
    gap: 8,
  },
  stateText: {
    fontSize: 13,
    color: T.muted,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 13,
    color: T.danger,
    textAlign: 'center',
    lineHeight: 18,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: T.ink,
  },
  list: {
    maxHeight: 360,
  },
  listContent: {
    paddingVertical: 6,
  },
  notificationItem: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
    backgroundColor: T.paper,
  },
  notificationUnread: {
    backgroundColor: '#eef4ff',
  },
  notificationTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  notificationTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '800',
    color: T.ink,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: T.blue,
  },
  notificationMessage: {
    marginTop: 5,
    fontSize: 13,
    color: T.text,
    lineHeight: 18,
  },
  notificationDate: {
    marginTop: 6,
    fontSize: 11,
    color: T.faint,
    fontWeight: '600',
  },
});
