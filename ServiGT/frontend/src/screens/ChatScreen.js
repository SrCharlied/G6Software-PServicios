import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
// La cache de conversaciones pasa por el adapter de storage (task 3.4) en vez
// de hablarle al almacenamiento directamente: asi usa el backend correcto en
// cada plataforma y, sobre todo, queda dentro del barrido que borra los datos
// privados al cerrar sesion. Antes estos mensajes sobrevivian al logout.
import { claveCacheChat, guardarCacheChat, leerCacheChat } from '../services/storage';
import { getConversacion, sendMensaje } from '../services/api';
import { useToast } from '../context/ToastContext';
import { T } from '../theme';

export default function ChatScreen({
  navigation,
  user,
  chatWithUserId,
  chatWithName,
  embedded = false,
}) {
  const toast = useToast();
  const [mensajes, setMensajes] = useState([]);
  const [texto, setTexto] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const flatListRef = useRef(null);
  const pollRef = useRef(null);
  const mensajesRef = useRef([]);

  useEffect(() => {
    mensajesRef.current = mensajes;
  }, [mensajes]);

  const getStorageKey = () => claveCacheChat(user?.id, chatWithUserId);

  useEffect(() => {
    if (!chatWithUserId) return undefined;
    loadMensajes();
    pollRef.current = setInterval(loadMensajesSilencioso, 5000);
    return () => clearInterval(pollRef.current);
  }, [chatWithUserId]);

  if (!chatWithUserId) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.emptyText}>No se encontro la conversacion seleccionada.</Text>
        <TouchableOpacity style={styles.backHomeBtn} onPress={() => navigation.navigate('Home')}>
          <Text style={styles.backHomeBtnText}>Volver al listado</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const loadMensajes = async () => {
    let locales = [];
    try {
      const localData = await leerCacheChat(getStorageKey());
      if (localData) {
        locales = JSON.parse(localData);
        setMensajes(locales);
        setLoading(false);
      }
    } catch {
      /* cache ilegible: se sigue con lo que traiga la red */
    }

    if (locales.length === 0) setLoading(true);

    try {
      let lastId = null;
      if (locales.length > 0) {
        const validIds = locales.filter((m) => !String(m.id).startsWith('temp-')).map((m) => m.id);
        if (validIds.length > 0) lastId = Math.max(...validIds);
      }

      const data = await getConversacion(chatWithUserId, lastId);
      if (data.mensajes && data.mensajes.length > 0) {
        const filtrados = locales.filter((m) => !String(m.id).startsWith('temp-'));
        const finales = [...filtrados, ...data.mensajes];
        setMensajes(finales);
        guardarCacheChat(getStorageKey(), JSON.stringify(finales));
      }
    } catch (error) {
      if (locales.length === 0) toast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadMensajesSilencioso = async () => {
    try {
      const actuales = mensajesRef.current;
      let lastId = null;
      if (actuales.length > 0) {
        const validIds = actuales.filter((m) => !String(m.id).startsWith('temp-')).map((m) => m.id);
        if (validIds.length > 0) lastId = Math.max(...validIds);
      }
      const data = await getConversacion(chatWithUserId, lastId);
      if (data.mensajes && data.mensajes.length > 0) {
        const filtrados = actuales.filter((m) => !String(m.id).startsWith('temp-'));
        const nuevos = [...filtrados, ...data.mensajes];
        setMensajes(nuevos);
        guardarCacheChat(getStorageKey(), JSON.stringify(nuevos));
      }
    } catch {
      // Evita ruido visual durante polling.
    }
  };

  const handleSend = async () => {
    if (!texto.trim()) return;

    const contenido = texto.trim();
    setTexto('');

    const tempMsg = {
      id: `temp-${Date.now()}`,
      emisor_id: user.id,
      receptor_id: chatWithUserId,
      contenido,
      leido: false,
      created_at: new Date().toISOString(),
      emisor: user,
    };
    setMensajes((prev) => [...prev, tempMsg]);

    setSending(true);
    try {
      const data = await sendMensaje(chatWithUserId, contenido);
      setMensajes((prev) => {
        const nuevos = prev.map((m) => (m.id === tempMsg.id ? data.mensaje : m));
        guardarCacheChat(getStorageKey(), JSON.stringify(nuevos));
        return nuevos;
      });
    } catch (error) {
      setMensajes((prev) => prev.filter((m) => m.id !== tempMsg.id));
      toast(error.message, 'error');
    } finally {
      setSending(false);
    }
  };

  const formatTime = (iso) => {
    try {
      return new Date(iso).toLocaleTimeString('es-GT', {
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  };

  const getCheckMark = (item) => {
    if (String(item.id).startsWith('temp-')) {
      return <Text style={[styles.checkMarks, styles.checkPending]}>...</Text>;
    }
    if (item.leido) {
      return <Text style={[styles.checkMarks, styles.checkRead]}>✓✓</Text>;
    }
    return <Text style={[styles.checkMarks, styles.checkUnread]}>✓</Text>;
  };

  const renderMensaje = ({ item }) => {
    const esMio = item.emisor_id === user.id;
    return (
      <View style={[styles.bubbleContainer, esMio ? styles.bubbleRight : styles.bubbleLeft]}>
        <View style={[styles.bubble, esMio ? styles.bubbleMio : styles.bubbleOtro]}>
          <Text style={[styles.bubbleText, esMio ? styles.bubbleTextMio : styles.bubbleTextOtro]}>
            {item.contenido}
          </Text>
          <View style={styles.timeRow}>
            <Text style={[styles.bubbleTime, esMio ? styles.bubbleTimeMio : styles.bubbleTimeOtro]}>
              {formatTime(item.created_at)}
            </Text>
            {esMio && getCheckMark(item)}
          </View>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, embedded && styles.containerEmbedded]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={80}
    >
      <View style={[styles.header, embedded && styles.headerEmbedded]}>
        {!embedded ? (
          <TouchableOpacity
            onPress={() => navigation.navigate('ChatList')}
            style={styles.backBtn}
            accessibilityRole="button"
            accessibilityLabel="Volver a mensajes"
          >
            <Text style={styles.backText}>←</Text>
            <Text style={styles.backLabel}>Mensajes</Text>
          </TouchableOpacity>
        ) : null}
        <View style={styles.headerInfo}>
          <View style={styles.avatarSmall}>
            <Text style={styles.avatarSmallText}>{(chatWithName || '?')[0].toUpperCase()}</Text>
          </View>
          <View>
            <Text style={[styles.headerName, embedded && styles.headerNameEmbedded]}>{chatWithName}</Text>
            <Text style={[styles.headerStatus, embedded && styles.headerStatusEmbedded]}>
              Conversacion activa
            </Text>
          </View>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={T.blue} />
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={mensajes}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderMensaje}
          contentContainerStyle={styles.listContent}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Inicia la conversacion con {chatWithName}.</Text>
            </View>
          }
        />
      )}

      <View style={styles.inputRow}>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.textInput}
            placeholder="Escribe un mensaje"
            placeholderTextColor={T.faint}
            value={texto}
            onChangeText={setTexto}
            multiline
            maxLength={2000}
            onSubmitEditing={handleSend}
            returnKeyType="send"
            blurOnSubmit={false}
          />
        </View>
        <TouchableOpacity
          style={[styles.sendBtn, (!texto.trim() || sending) && styles.sendBtnDisabled]}
          onPress={handleSend}
          disabled={!texto.trim() || sending}
        >
          {sending ? (
            <ActivityIndicator color={T.white} size="small" />
          ) : (
            <Text style={styles.sendBtnIcon}>›</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.canvas },
  containerEmbedded: { backgroundColor: T.white },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: T.paper,
    paddingTop: 20,
    paddingBottom: 12,
    paddingHorizontal: T.s3,
    gap: T.s2,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
  },
  headerEmbedded: { paddingTop: T.s4, paddingHorizontal: T.s4, backgroundColor: T.white },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: T.s2, paddingRight: T.s2 },
  backText: { color: T.blue, fontSize: 22, fontWeight: '900' },
  backLabel: { color: T.blue, fontSize: 13, fontWeight: '700' },
  headerInfo: { flexDirection: 'row', alignItems: 'center', gap: T.s3, flex: 1 },
  avatarSmall: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#eef4ff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: T.inputBorder,
  },
  avatarSmallText: { color: T.deep, fontWeight: '900', fontSize: 17 },
  headerName: { color: T.ink, fontWeight: '900', fontSize: 17 },
  headerNameEmbedded: { fontSize: 18 },
  headerStatus: { color: T.muted, fontSize: 12, marginTop: 1 },
  headerStatusEmbedded: { color: T.muted },

  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  backHomeBtn: {
    marginTop: T.s4,
    backgroundColor: T.blue,
    paddingHorizontal: T.s4,
    paddingVertical: 10,
    borderRadius: T.rSm,
  },
  backHomeBtnText: { color: T.white, fontWeight: '800', fontSize: 14 },
  listContent: { padding: T.s4, paddingBottom: T.s5 },
  emptyContainer: { paddingTop: 60, alignItems: 'center', paddingHorizontal: 40 },
  emptyText: {
    color: T.muted,
    fontSize: 14,
    textAlign: 'center',
    backgroundColor: T.paper,
    padding: T.s3,
    borderRadius: T.rSm,
  },

  bubbleContainer: { marginBottom: 12, maxWidth: '82%' },
  bubbleLeft: { alignSelf: 'flex-start' },
  bubbleRight: { alignSelf: 'flex-end' },
  bubble: {
    borderRadius: T.rMd,
    paddingHorizontal: T.s3,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: T.border,
  },
  bubbleMio: { backgroundColor: '#eef4ff', borderTopRightRadius: 4 },
  bubbleOtro: { backgroundColor: T.paper, borderTopLeftRadius: 4 },
  bubbleText: { fontSize: 15, lineHeight: 21 },
  bubbleTextMio: { color: T.deep },
  bubbleTextOtro: { color: T.text },
  timeRow: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginTop: 5, gap: 5 },
  bubbleTime: { fontSize: 11 },
  bubbleTimeMio: { color: T.muted },
  bubbleTimeOtro: { color: T.muted },
  checkMarks: { fontSize: 11, fontWeight: '800' },
  checkRead: { color: T.blue },
  checkUnread: { color: T.faint },
  checkPending: { color: T.faint, fontSize: 10 },

  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: T.paper,
    borderTopWidth: 1,
    borderTopColor: T.border,
    paddingHorizontal: T.s3,
    paddingVertical: T.s3,
    gap: T.s2,
  },
  inputContainer: {
    flex: 1,
    backgroundColor: T.white,
    borderRadius: T.rSm,
    minHeight: 46,
    justifyContent: 'center',
    paddingHorizontal: T.s3,
    borderWidth: 1,
    borderColor: T.inputBorder,
  },
  textInput: {
    fontSize: 15,
    color: T.text,
    maxHeight: 120,
    paddingTop: 11,
    paddingBottom: 11,
  },
  sendBtn: {
    backgroundColor: T.blue,
    width: 46,
    height: 46,
    borderRadius: T.rSm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnDisabled: { backgroundColor: T.soft },
  sendBtnIcon: { color: T.white, fontSize: 28, fontWeight: '900', lineHeight: 28 },
});
