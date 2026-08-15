import { useEffect, useState, useCallback } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { getMisConversaciones } from '../services/api';
import { useToast } from '../context/ToastContext';
import { T } from '../theme';
import ChatScreen from './ChatScreen';

export default function ChatListScreen({ navigation, user }) {
  const toast = useToast();
  const { width } = useWindowDimensions();
  // Los dos paneles solo se justifican cuando el chat conserva ancho util:
  // por debajo de 1024px el panel de la lista se comia la conversacion.
  const isDesktop = width >= 1024;
  const [conversaciones, setConversaciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState(null);

  const fetchConversaciones = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getMisConversaciones();
      const items = data.conversaciones || [];
      setConversaciones(items);
      if (isDesktop && !selectedUserId && items.length > 0) {
        const primera = getOtraPersona(items[0], user);
        setSelectedUserId(primera?.id ?? null);
      }
    } catch (error) {
      toast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [isDesktop, selectedUserId, toast, user]);

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

  const openConversation = (otraPersona) => {
    if (!otraPersona) return;
    if (isDesktop) {
      setSelectedUserId(otraPersona.id);
      return;
    }
    navigation.navigate('ChatDetail', { userId: otraPersona.id, name: otraPersona.name });
  };

  const renderItem = ({ item }) => {
    const otraPersona = getOtraPersona(item, user);
    const esMio = item.emisor_id === user.id;
    const noLeido = !esMio && !item.leido;
    const active = isDesktop && otraPersona?.id === selectedUserId;

    return (
      <TouchableOpacity
        style={[styles.chatCard, active && styles.chatCardActive]}
        onPress={() => openConversation(otraPersona)}
        activeOpacity={0.78}
      >
        <View style={[styles.avatar, noLeido && styles.avatarUnread]}>
          <Text style={styles.avatarText}>
            {otraPersona?.name ? otraPersona.name.charAt(0).toUpperCase() : '?'}
          </Text>
        </View>
        <View style={styles.chatInfo}>
          <View style={styles.chatHeader}>
            <Text style={[styles.chatName, noLeido && styles.textBold]} numberOfLines={1}>
              {otraPersona?.name || 'Usuario'}
            </Text>
            <Text style={[styles.chatTime, noLeido && styles.timeUnread]}>
              {formatTime(item.created_at)}
            </Text>
          </View>
          <View style={styles.chatFooter}>
            {esMio ? (
              <Text style={[styles.checkMarks, item.leido ? styles.checkRead : styles.checkUnread]}>
                {item.leido ? '✓✓ ' : '✓ '}
              </Text>
            ) : null}
            <Text
              style={[styles.chatSnippet, noLeido && styles.textBold, noLeido && styles.textUnread]}
              numberOfLines={1}
            >
              {item.contenido}
            </Text>
            {noLeido ? (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadBadgeText}>1</Text>
              </View>
            ) : null}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const selectedConversation = conversaciones.find((item) => {
    const otraPersona = getOtraPersona(item, user);
    return otraPersona?.id === selectedUserId;
  });
  const selectedPersona = selectedConversation ? getOtraPersona(selectedConversation, user) : null;

  if (loading && conversaciones.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={T.blue} />
        <Text style={styles.loadingText}>Cargando mensajes...</Text>
      </View>
    );
  }

  const list = (
    <FlatList
      data={conversaciones}
      keyExtractor={(item) => String(item.id)}
      renderItem={renderItem}
      contentContainerStyle={styles.listContent}
      refreshing={loading}
      onRefresh={fetchConversaciones}
      ListEmptyComponent={
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>Bandeja vacia</Text>
          <Text style={styles.emptyDesc}>
            Las conversaciones iniciadas apareceran aqui.
          </Text>
        </View>
      }
    />
  );

  return (
    <View style={styles.container}>
      <View style={[styles.header, isDesktop && styles.headerDesktop]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.navigate('Home')}>
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerCopy}>
          <Text style={styles.headerTitle}>Mensajes</Text>
          <Text style={styles.headerSubtitle}>Conversaciones de servicios y cotizaciones</Text>
        </View>
        <TouchableOpacity style={styles.refreshBtn} onPress={fetchConversaciones}>
          <Text style={styles.refreshBtnText}>↻</Text>
        </TouchableOpacity>
      </View>

      {isDesktop ? (
        <View style={styles.desktopShell}>
          <View style={styles.desktopListPane}>{list}</View>
          <View style={styles.desktopChatPane}>
            {selectedPersona ? (
              <ChatScreen
                navigation={navigation}
                user={user}
                chatWithUserId={selectedPersona.id}
                chatWithName={selectedPersona.name}
                embedded
              />
            ) : (
              <View style={styles.desktopEmpty}>
                <Text style={styles.desktopEmptyTitle}>Selecciona una conversacion</Text>
                <Text style={styles.desktopEmptyText}>
                  El detalle del chat aparecera aqui en pantallas grandes.
                </Text>
              </View>
            )}
          </View>
        </View>
      ) : (
        list
      )}
    </View>
  );
}

function getOtraPersona(item, user) {
  if (!item || !user) return null;
  return item.emisor_id === user.id ? item.receptor : item.emisor;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.canvas },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: T.paper,
    paddingTop: 16,
    paddingBottom: 14,
    paddingHorizontal: T.s3,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
    gap: T.s2,
  },
  headerDesktop: { paddingHorizontal: T.s5 },
  backBtn: { width: 38, height: 38, borderRadius: T.rSm, alignItems: 'center', justifyContent: 'center' },
  backBtnText: { color: T.blue, fontSize: 24, fontWeight: '900' },
  headerCopy: { flex: 1 },
  headerTitle: { fontSize: 21, fontWeight: '900', color: T.ink },
  headerSubtitle: { fontSize: 12, color: T.muted, marginTop: 1 },
  refreshBtn: {
    width: 38,
    height: 38,
    borderRadius: T.rSm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: T.white,
    borderWidth: 1,
    borderColor: T.inputBorder,
  },
  refreshBtnText: { color: T.blue, fontSize: 20, fontWeight: '900' },

  desktopShell: {
    flex: 1,
    flexDirection: 'row',
    width: '100%',
    maxWidth: 1180,
    alignSelf: 'center',
    padding: T.s4,
    gap: T.s4,
  },
  desktopListPane: {
    // Antes eran 360px fijos: a 1024px dejaban la conversacion sin espacio.
    // Ahora la lista cede ancho y nunca baja de 260px ni pasa de 360px.
    flex: 2,
    minWidth: 260,
    maxWidth: 360,
    backgroundColor: T.paper,
    borderRadius: T.rMd,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: T.border,
  },
  desktopChatPane: {
    flex: 3,
    minWidth: 0,
    backgroundColor: T.white,
    borderRadius: T.rMd,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: T.border,
  },

  listContent: { padding: T.s2 },
  chatCard: {
    flexDirection: 'row',
    backgroundColor: T.white,
    borderRadius: T.rSm,
    padding: T.s3,
    alignItems: 'center',
    marginBottom: T.s2,
    borderWidth: 1,
    borderColor: T.border,
  },
  chatCardActive: { borderColor: T.blue, backgroundColor: '#eef4ff' },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#eef4ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: T.s3,
    borderWidth: 1,
    borderColor: T.inputBorder,
  },
  avatarUnread: { backgroundColor: T.blue, borderColor: T.blue },
  avatarText: { fontSize: 19, fontWeight: '900', color: T.deep },
  chatInfo: { flex: 1, minWidth: 0 },
  chatHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: T.s2 },
  chatName: { fontSize: 15, color: T.ink, fontWeight: '800', flex: 1 },
  chatTime: { fontSize: 11, color: T.faint, fontWeight: '700' },
  chatFooter: { flexDirection: 'row', alignItems: 'center', marginTop: 5 },
  chatSnippet: { fontSize: 13, color: T.muted, flex: 1, marginRight: T.s2 },
  textBold: { fontWeight: '900' },
  textUnread: { color: T.ink },
  timeUnread: { color: T.blue },
  checkMarks: { fontSize: 12, fontWeight: '900' },
  checkRead: { color: T.blue },
  checkUnread: { color: T.faint },
  unreadBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: T.blue,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 5,
  },
  unreadBadgeText: { color: T.white, fontSize: 10, fontWeight: '900' },

  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: T.canvas },
  loadingText: { marginTop: T.s3, color: T.muted },
  emptyContainer: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: T.s5 },
  emptyTitle: { fontSize: 18, fontWeight: '900', color: T.ink, marginBottom: 8 },
  emptyDesc: { fontSize: 14, color: T.muted, textAlign: 'center' },
  desktopEmpty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: T.s6 },
  desktopEmptyTitle: { fontSize: 20, fontWeight: '900', color: T.ink, marginBottom: 6 },
  desktopEmptyText: { fontSize: 14, color: T.muted, textAlign: 'center' },
});
