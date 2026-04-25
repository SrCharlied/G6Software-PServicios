import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { getConversacion, sendMensaje } from '../services/api';

export default function ChatScreen({
  navigation,
  user,
  chatWithUserId,
  chatWithName,
}) {
  const [mensajes, setMensajes] = useState([]);
  const [texto, setTexto] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const flatListRef = useRef(null);
  const pollRef = useRef(null);

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
    setLoading(true);
    try {
      const data = await getConversacion(chatWithUserId);
      setMensajes(data.mensajes || []);
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const loadMensajesSilencioso = async () => {
    try {
      const data = await getConversacion(chatWithUserId);
      setMensajes(data.mensajes || []);
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
      setMensajes((prev) =>
        prev.map((m) => (m.id === tempMsg.id ? data.mensaje : m))
      );
    } catch (error) {
      // Revertir mensaje temporal en caso de error
      setMensajes((prev) => prev.filter((m) => m.id !== tempMsg.id));
      Alert.alert('Error', error.message);
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
          <Text style={[styles.bubbleTime, esMio ? styles.bubbleTimeMio : styles.bubbleTimeOtro]}>
            {formatTime(item.created_at)}
            {esMio && (item.leido ? ' ✓✓' : ' ✓')}
          </Text>
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
        <TextInput
          style={styles.textInput}
          placeholder="Escribe un mensaje..."
          placeholderTextColor="#999"
          value={texto}
          onChangeText={setTexto}
          multiline
          maxLength={2000}
          onSubmitEditing={handleSend}
          returnKeyType="send"
          blurOnSubmit
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!texto.trim() || sending) && styles.sendBtnDisabled]}
          onPress={handleSend}
          disabled={!texto.trim() || sending}
        >
          {sending ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.sendBtnText}>Enviar</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0eee9' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0e1424',
    paddingTop: 20,
    paddingBottom: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  backBtn: { padding: 4 },
  backText: { color: '#fff', fontSize: 22, fontWeight: 'bold' },
  headerInfo: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  avatarSmall: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center', alignItems: 'center',
  },
  avatarSmallText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  headerName: { color: '#fff', fontWeight: '700', fontSize: 16 },
  headerStatus: { color: 'rgba(255,255,255,0.75)', fontSize: 12 },

  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  backHomeBtn: {
    marginTop: 16,
    backgroundColor: '#4589d4',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  backHomeBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  listContent: { padding: 16, paddingBottom: 8 },
  emptyContainer: { paddingTop: 60, alignItems: 'center' },
  emptyText: { color: '#999', fontSize: 14, textAlign: 'center' },

  bubbleContainer: { marginBottom: 8, maxWidth: '80%' },
  bubbleLeft: { alignSelf: 'flex-start' },
  bubbleRight: { alignSelf: 'flex-end' },
  bubble: { borderRadius: 16, paddingHorizontal: 14, paddingVertical: 9 },
  bubbleMio: { backgroundColor: '#4589d4', borderBottomRightRadius: 4 },
  bubbleOtro: { backgroundColor: '#fff', borderBottomLeftRadius: 4, elevation: 1 },
  bubbleText: { fontSize: 15, lineHeight: 20 },
  bubbleTextMio: { color: '#fff' },
  bubbleTextOtro: { color: '#333' },
  bubbleTime: { fontSize: 11, marginTop: 4, textAlign: 'right' },
  bubbleTimeMio: { color: 'rgba(255,255,255,0.7)' },
  bubbleTimeOtro: { color: '#999' },

  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#f6f4ee',
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    gap: 8,
  },
  textInput: {
    flex: 1,
    backgroundColor: '#f7f9fc',
    borderWidth: 1,
    borderColor: '#d9e2ef',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 9,
    fontSize: 15,
    color: '#333',
    maxHeight: 100,
  },
  sendBtn: {
    backgroundColor: '#4589d4',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 72,
  },
  sendBtnDisabled: { backgroundColor: '#b0c4de' },
  sendBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
