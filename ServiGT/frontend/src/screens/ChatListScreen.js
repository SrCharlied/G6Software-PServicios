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
            <Text
              style={[styles.chatSnippet, noLeido && styles.textBold, noLeido && styles.textUnread]}
              numberOfLines={1}
            >
              {esMio ? 'Tú: ' : ''}{item.contenido}
            </Text>
            {noLeido && <View style={styles.unreadDot} />}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading && conversaciones.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1a73e8" />
        <Text style={styles.loadingText}>Cargando mensajes...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.navigate('Home')}>
          <Text style={styles.backBtnText}>← Volver</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mensajes</Text>
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
  container: { flex: 1, backgroundColor: '#f4f6f9' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    paddingTop: 16,
    paddingBottom: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e8ecf1',
    elevation: 2,
  },
  backBtn: { padding: 4 },
  backBtnText: { color: '#1a73e8', fontSize: 16, fontWeight: '600' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#0e1424' },
  refreshBtn: { padding: 4 },
  refreshBtnText: { color: '#1a73e8', fontSize: 20, fontWeight: 'bold' },

  listContent: { padding: 12 },
  chatCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 3,
    alignItems: 'center',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#e8ecf1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: { fontSize: 20, fontWeight: 'bold', color: '#1a73e8' },
  chatInfo: { flex: 1 },
  chatHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  chatName: { fontSize: 16, color: '#1a1a2e', fontWeight: '600' },
  chatTime: { fontSize: 12, color: '#9aa3af' },
  chatFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  chatSnippet: { fontSize: 14, color: '#667085', flex: 1, marginRight: 8 },
  textBold: { fontWeight: '700' },
  textUnread: { color: '#1a1a2e' },
  timeUnread: { color: '#1a73e8', fontWeight: '600' },
  unreadDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#1a73e8' },

  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, color: '#667085' },
  emptyContainer: { alignItems: 'center', paddingVertical: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 8 },
  emptyDesc: { fontSize: 14, color: '#667085', textAlign: 'center', paddingHorizontal: 30 },
});
