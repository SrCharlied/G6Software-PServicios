import { useEffect, useState, useCallback } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { getMisConversaciones } from '../services/api';
import { useToast } from '../context/ToastContext';

export default function ChatListScreen({ navigation, user }) {
  const toast = useToast();
  const [conversaciones, setConversaciones] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchConversaciones = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getMisConversaciones();
      setConversaciones(data.conversaciones || []);
    } catch (error) {
      toast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchConversaciones();
  }, [fetchConversaciones]);

  const formatTime = (iso) => {
    try {
      const date = new Date(iso);
      const hoy = new Date();
      if (date.toDateString() === hoy.toDateString()) {
        return date.toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit' });
      }
      return date.toLocaleDateString('es-GT', { day: '2-digit', month: 'short' });
    } catch {
      return '';
    }
  };

  const renderItem = ({ item }) => {
    // Determinar quién es la otra persona en la conversación
    const otraPersona = item.emisor_id === user.id ? item.receptor : item.emisor;
    const esMio = item.emisor_id === user.id;
    const noLeido = !esMio && !item.leido; // Mensaje nuevo para mi

    return (
      <TouchableOpacity
        style={styles.chatCard}
        onPress={() => navigation.navigate('ChatDetail', { userId: otraPersona.id, name: otraPersona.name })}
        activeOpacity={0.7}
      >
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {otraPersona.name ? otraPersona.name.charAt(0).toUpperCase() : '?'}
          </Text>
        </View>
        <View style={styles.chatInfo}>
          <View style={styles.chatHeader}>
            <Text style={[styles.chatName, noLeido && styles.textBold]}>
              {otraPersona.name}
            </Text>
            <Text style={[styles.chatTime, noLeido && styles.timeUnread]}>
              {formatTime(item.created_at)}
            </Text>
          </View>
          <View style={styles.chatFooter}>
            {esMio && (
              <Text style={[styles.checkMarks, item.leido ? styles.checkRead : styles.checkUnread]}>
                {item.leido ? '✓✓ ' : '✓ '}
              </Text>
            )}
            <Text
              style={[styles.chatSnippet, noLeido && styles.textBold, noLeido && styles.textUnread]}
              numberOfLines={1}
            >
              {item.contenido}
            </Text>
            {noLeido && <View style={styles.unreadBadge}><Text style={styles.unreadBadgeText}>1</Text></View>}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading && conversaciones.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#075E54" />
        <Text style={styles.loadingText}>Cargando chats...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.navigate('Home')}>
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chats</Text>
        <TouchableOpacity style={styles.refreshBtn} onPress={fetchConversaciones}>
          <Text style={styles.refreshBtnText}>↻</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={conversaciones}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        refreshing={loading}
        onRefresh={fetchConversaciones}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={styles.emptyTitle}>Bandeja vacía</Text>
            <Text style={styles.emptyDesc}>
              Aún no tienes mensajes. Las conversaciones iniciadas aparecerán aquí.
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#075E54', // WhatsApp dark green
    paddingTop: 16,
    paddingBottom: 16,
    paddingHorizontal: 8,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  backBtn: { padding: 8 },
  backBtnText: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
  headerTitle: { fontSize: 20, fontWeight: '600', color: '#fff', flex: 1, marginLeft: 8 },
  refreshBtn: { padding: 8 },
  refreshBtnText: { color: '#fff', fontSize: 22, fontWeight: 'bold' },

  listContent: { padding: 0 },
  chatCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 14,
    alignItems: 'center',
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#dfe5e7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  avatarText: { fontSize: 22, fontWeight: 'bold', color: '#075E54' },
  chatInfo: { flex: 1, borderBottomWidth: 1, borderBottomColor: '#f2f2f2', paddingBottom: 14, marginTop: 4 },
  chatHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  chatName: { fontSize: 16, color: '#000', fontWeight: '500' },
  chatTime: { fontSize: 12, color: '#888' },
  chatFooter: { flexDirection: 'row', alignItems: 'center' },
  chatSnippet: { fontSize: 15, color: '#667085', flex: 1, marginRight: 8 },
  textBold: { fontWeight: '700' },
  textUnread: { color: '#000' },
  timeUnread: { color: '#25D366', fontWeight: '600' }, // WhatsApp light green
  
  checkMarks: { fontSize: 14 },
  checkRead: { color: '#34B7F1' }, // WhatsApp Blue ticks
  checkUnread: { color: '#999' },
  
  unreadBadge: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#25D366', justifyContent: 'center', alignItems: 'center' },
  unreadBadgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },

  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, color: '#667085' },
  emptyContainer: { alignItems: 'center', paddingVertical: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 8 },
  emptyDesc: { fontSize: 14, color: '#667085', textAlign: 'center', paddingHorizontal: 30 },
});
