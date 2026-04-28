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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getConversacion, sendMensaje } from '../services/api';
import { useToast } from '../context/ToastContext';

export default function ChatScreen({
  navigation,
  user,
  chatWithUserId,
  chatWithName,
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

  const getStorageKey = () => `chat_${user?.id}_${chatWithUserId}`;

  useEffect(() => {
    if (!chatWithUserId) return undefined;
    loadMensajes();
    // Polling cada 5 segundos para nuevos mensajes
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
      const localData = await AsyncStorage.getItem(getStorageKey());
      if (localData) {
        locales = JSON.parse(localData);
        setMensajes(locales);
        setLoading(false); // Mostramos los locales instantaneamente
      }
    } catch (e) { console.log('Error AsyncStorage', e); }

    if (locales.length === 0) setLoading(true);

    try {
      let lastId = null;
      if (locales.length > 0) {
        const validIds = locales.filter(m => !String(m.id).startsWith('temp-')).map(m => m.id);
        if (validIds.length > 0) lastId = Math.max(...validIds);
      }

      const data = await getConversacion(chatWithUserId, lastId);
      if (data.mensajes && data.mensajes.length > 0) {
        const filtrados = locales.filter(m => !String(m.id).startsWith('temp-'));
        const finales = [...filtrados, ...data.mensajes];
        setMensajes(finales);
        AsyncStorage.setItem(getStorageKey(), JSON.stringify(finales));
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
        const validIds = actuales.filter(m => !String(m.id).startsWith('temp-')).map(m => m.id);
        if (validIds.length > 0) lastId = Math.max(...validIds);
      }
      const data = await getConversacion(chatWithUserId, lastId);
      if (data.mensajes && data.mensajes.length > 0) {
        const filtrados = actuales.filter(m => !String(m.id).startsWith('temp-'));
        const nuevos = [...filtrados, ...data.mensajes];
        setMensajes(nuevos);
        AsyncStorage.setItem(getStorageKey(), JSON.stringify(nuevos));
      }
    } catch { /* ignorar */ }
  };

  const handleSend = async () => {
    if (!texto.trim()) return;

    const contenido = texto.trim();
    setTexto('');

    // Optimistic update
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
        AsyncStorage.setItem(getStorageKey(), JSON.stringify(nuevos));
        return nuevos;
      });
    } catch (error) {
      // Revertir mensaje temporal en caso de error
      setMensajes((prev) => prev.filter((m) => m.id !== tempMsg.id));
      toast(error.message, 'error');
    } finally {
      setSending(false);
    }
  };

  const formatTime = (iso) => {
    try {
      return new Date(iso).toLocaleTimeString('es-GT', {
        hour: '2-digit', minute: '2-digit',
      });
    } catch { return ''; }
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
            {esMio && (
              <Text style={[styles.checkMarks, item.leido ? styles.checkRead : styles.checkUnread]}>
                {item.leido ? ' ✓✓' : ' ✓'}
              </Text>
            )}
          </View>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={80}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.navigate('Home')} style={styles.backBtn}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <View style={styles.avatarSmall}>
            <Text style={styles.avatarSmallText}>
              {(chatWithName || '?')[0].toUpperCase()}
            </Text>
          </View>
          <View>
            <Text style={styles.headerName}>{chatWithName}</Text>
            <Text style={styles.headerStatus}>En linea</Text>
          </View>
        </View>
      </View>

      {/* Messages */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4589d4" />
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
              <Text style={styles.emptyText}>
                Inicia la conversacion con {chatWithName}.
              </Text>
            </View>
          }
        />
      )}

      {/* Input */}
      <View style={styles.inputRow}>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.textInput}
            placeholder="Mensaje"
            placeholderTextColor="#999"
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
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.sendBtnIcon}>➤</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ece5dd' }, // WhatsApp background color

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#075E54', // WhatsApp dark green
    paddingTop: 20,
    paddingBottom: 12,
    paddingHorizontal: 8,
    gap: 8,
    elevation: 3,
  },
  backBtn: { padding: 8 },
  backText: { color: '#fff', fontSize: 22, fontWeight: 'bold' },
  headerInfo: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  avatarSmall: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#dfe5e7',
    justifyContent: 'center', alignItems: 'center',
  },
  avatarSmallText: { color: '#075E54', fontWeight: 'bold', fontSize: 18 },
  headerName: { color: '#fff', fontWeight: '600', fontSize: 17 },
  headerStatus: { color: 'rgba(255,255,255,0.8)', fontSize: 13 },

  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  backHomeBtn: {
    marginTop: 16,
    backgroundColor: '#075E54',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  backHomeBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  listContent: { padding: 12, paddingBottom: 16 },
  emptyContainer: { paddingTop: 60, alignItems: 'center', paddingHorizontal: 40 },
  emptyText: { color: '#555', fontSize: 15, textAlign: 'center', backgroundColor: '#fff', padding: 12, borderRadius: 8, elevation: 1 },

  bubbleContainer: { marginBottom: 12, maxWidth: '85%' },
  bubbleLeft: { alignSelf: 'flex-start' },
  bubbleRight: { alignSelf: 'flex-end' },
  bubble: { 
    borderRadius: 12, 
    paddingHorizontal: 12, 
    paddingVertical: 8, 
    elevation: 1,
    shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 1, shadowOffset: { width: 0, height: 1 } 
  },
  bubbleMio: { backgroundColor: '#dcf8c6', borderTopRightRadius: 0 },
  bubbleOtro: { backgroundColor: '#fff', borderTopLeftRadius: 0 },
  bubbleText: { fontSize: 15, lineHeight: 20 },
  bubbleTextMio: { color: '#111' },
  bubbleTextOtro: { color: '#111' },
  timeRow: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginTop: 4, gap: 4 },
  bubbleTime: { fontSize: 11 },
  bubbleTimeMio: { color: 'rgba(0,0,0,0.45)' },
  bubbleTimeOtro: { color: 'rgba(0,0,0,0.45)' },
  checkMarks: { fontSize: 12 },
  checkRead: { color: '#34B7F1' }, // WhatsApp Blue ticks
  checkUnread: { color: 'rgba(0,0,0,0.3)' },

  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: 'transparent',
    paddingHorizontal: 8,
    paddingVertical: 8,
    gap: 8,
  },
  inputContainer: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 24,
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: 16,
    elevation: 1,
  },
  textInput: {
    fontSize: 16,
    color: '#000',
    maxHeight: 120,
    paddingTop: 12,
    paddingBottom: 12,
  },
  sendBtn: {
    backgroundColor: '#128C7E',
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 1,
  },
  sendBtnDisabled: { backgroundColor: '#a5d6d1' },
  sendBtnIcon: { color: '#fff', fontSize: 20, paddingLeft: 2 },
});
