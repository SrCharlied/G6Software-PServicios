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
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSession } from '../context/SessionContext';
import {
  getNotificaciones,
  getUnreadNotificationsCount,
  loadStoredSession,
  marcarNotificacionLeida,
  marcarTodasLeidas,
} from '../services/api';
import { destinoNotificacion } from '../utils/notificationRoutes';
import { T } from '../theme';

// `tone` es el color de la tinta del icono, misma convencion que ServiGTLogo:
// 'dark' para superficies claras (default), 'light' para superficies oscuras
// como el sidebar de InternalLayout.
export default function NotificationBell({ onPress, tone = 'dark' }) {
  const router = useRouter();
  const { user, sessionLoading } = useSession();
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState('');
  const [itemError, setItemError] = useState('');
  const [markingAll, setMarkingAll] = useState(false);

  useEffect(() => {
    let mounted = true;

    const loadCount = async () => {
      if (sessionLoading) return;
      if (!user || !loadStoredSession()) {
        setUnreadCount(0);
        setLoading(false);
        return;
      }

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
  }, [sessionLoading, user]);

  const badgeText = unreadCount > 99 ? '99+' : String(unreadCount);

  const loadNotifications = async () => {
    setListLoading(true);
    setListError('');
    setItemError('');

    if (!user || !loadStoredSession()) {
      setNotifications([]);
      setUnreadCount(0);
      setListLoading(false);
      setListError('No se encontro una sesion activa. Inicia sesion nuevamente.');
      return;
    }

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

  // Toque sobre una notificacion: se marca leida y se navega a su destino.
  // El marcado es optimista para que la lista responda de inmediato, y se
  // revierte si el backend falla: el badge no puede quedar mintiendo.
  const handleNotificationPress = (item) => {
    setItemError('');

    if (!item.leida) {
      setNotifications((items) =>
        items.map((n) => (n.id === item.id ? { ...n, leida: true } : n)),
      );
      setUnreadCount((count) => Math.max(0, count - 1));

      marcarNotificacionLeida(item.id).catch((error) => {
        setNotifications((items) =>
          items.map((n) => (n.id === item.id ? { ...n, leida: false } : n)),
        );
        setUnreadCount((count) => count + 1);
        setItemError(error.message);
      });
    }

    // Sin destino conocido no se navega: el panel queda abierto para que se
    // vea el cambio a leida.
    const destino = destinoNotificacion(item);
    if (destino) {
      setOpen(false);
      router.push(destino);
    }
  };

  const handleMarkAllRead = async () => {
    setMarkingAll(true);
    setListError('');
    setItemError('');
    try {
      await marcarTodasLeidas();
      setUnreadCount(0);
      setNotifications((items) => items.map((item) => ({ ...item, leida: true })));
      await loadNotifications();
    } catch (error) {
      setListError(error.message);
    } finally {
      setMarkingAll(false);
    }
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
        <Feather name="bell" size={18} color={tone === 'light' ? T.white : T.ink} />
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
              <View style={styles.headerActions}>
                {unreadCount > 0 ? (
                  <TouchableOpacity
                    onPress={handleMarkAllRead}
                    disabled={markingAll || listLoading}
                    style={styles.markAllBtn}
                  >
                    <Text style={styles.markAllText}>
                      {markingAll ? 'Marcando...' : 'Marcar leidas'}
                    </Text>
                  </TouchableOpacity>
                ) : null}
                <TouchableOpacity onPress={loadNotifications} disabled={listLoading || markingAll}>
                  <Text style={styles.refreshText}>{listLoading ? 'Cargando...' : 'Actualizar'}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {itemError ? (
              <View style={styles.itemErrorBar}>
                <Text style={styles.itemErrorText}>{itemError}</Text>
              </View>
            ) : null}

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
                {notifications.map((item) => {
                  const navegable = destinoNotificacion(item) !== null;

                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={[styles.notificationItem, !item.leida && styles.notificationUnread]}
                      onPress={() => handleNotificationPress(item)}
                      activeOpacity={0.65}
                      accessibilityRole="button"
                      accessibilityLabel={item.titulo || 'Notificacion'}
                    >
                      <View style={styles.notificationTop}>
                        <Text style={styles.notificationTitle} numberOfLines={1}>
                          {item.titulo || 'Notificacion'}
                        </Text>
                        {!item.leida ? <View style={styles.unreadDot} /> : null}
                        {/* La flecha solo aparece si el tipo tiene destino */}
                        {navegable ? <Text style={styles.chevron}>›</Text> : null}
                      </View>
                      <Text style={styles.notificationMessage} numberOfLines={3}>
                        {item.mensaje || ''}
                      </Text>
                      <Text style={styles.notificationDate}>{formatDate(item.created_at)}</Text>
                    </TouchableOpacity>
                  );
                })}
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
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: T.border,
    backgroundColor: T.inputBg,
    position: 'relative',
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexShrink: 1,
  },
  markAllBtn: {
    backgroundColor: T.tint,
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  markAllText: {
    fontSize: 11,
    fontWeight: '800',
    color: T.deep,
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
    backgroundColor: T.tint,
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
  chevron: {
    fontSize: 20,
    lineHeight: 20,
    fontWeight: '700',
    color: T.faint,
  },
  itemErrorBar: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    backgroundColor: '#fef2f2',
    borderBottomWidth: 1,
    borderBottomColor: '#fecaca',
  },
  itemErrorText: {
    fontSize: 12,
    color: '#991b1b',
    lineHeight: 17,
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
