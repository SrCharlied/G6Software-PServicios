import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { enviarMensajeContexto, getMensajesContexto, getReservaMaterial } from '../services/api';
import { Button, Input } from '../components/ui';
import { chatContextKey } from '../utils/chatContext';
import { T } from '../theme';

export default function ChatScreen({ context, chatWithUserId, ...props }) {
  const selected = context || (chatWithUserId ? { tipo: 'legacy', contraparteId: chatWithUserId } : null);
  if (!selected) return <View style={s.center}><Text>Selecciona una conversacion.</Text><Button onPress={() => props.navigation.navigate('ChatList')}>Volver a mensajes</Button></View>;
  // La identidad del componente aisla borrador, mensajes y respuestas pendientes.
  return <ChatThread key={chatContextKey(selected, props.user?.id)} context={selected} {...props} />;
}

function ChatThread({ context, user, navigation, embedded = false, onRead }) {
  const [mensajes, setMensajes] = useState([]);
  const [serverContext, setServerContext] = useState(null);
  const [counterpart, setCounterpart] = useState(null);
  const [texto, setTexto] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const [ambiguous, setAmbiguous] = useState(false);
  const active = useRef(true);
  const reading = useRef(false);
  const sendingRef = useRef(false);
  const messagesRef = useRef([]);
  const listRef = useRef(null);
  const onReadRef = useRef(onRead);
  onReadRef.current = onRead;
  const historical = context.tipo === 'legado' || context.tipo === 'legacy';
  const readOnly = historical || !serverContext || serverContext.solo_lectura || serverContext.estado === 'interrumpido_seguridad' || ambiguous;
  const merge = (items) => {
    const map = new Map(messagesRef.current.map((msg) => [msg.id, msg]));
    items.forEach((msg) => map.set(msg.id, msg));
    const merged = [...map.values()].sort((a, b) => Number(a.id) - Number(b.id));
    messagesRef.current = merged; setMensajes(merged);
  };
  const load = async (initial = false) => {
    if (reading.current) return;
    reading.current = true;
    if (initial) setLoading(true);
    try {
      const lastId = initial ? null : messagesRef.current[messagesRef.current.length - 1]?.id;
      const data = await getMensajesContexto(context, lastId);
      if (!active.current) return;
      setServerContext(data.contexto || null); setCounterpart(data.contraparte || null);
      merge(data.mensajes || []); setError(''); setAmbiguous(false);
      if (initial || (data.mensajes || []).some((msg) => msg.emisor_id !== user?.id)) onReadRef.current?.();
    } catch (err) {
      if (!active.current) return;
      if (err.status === 409 && context.tipo === 'legacy') {
        setAmbiguous(true); setError('Hay varios contextos con esta persona. Abre el hilo desde la bandeja.');
      } else {
        setError(err.message);
        if ([401, 403, 404].includes(err.status)) { messagesRef.current = []; setMensajes([]); setServerContext(null); setCounterpart(null); }
      }
    } finally { reading.current = false; if (active.current) setLoading(false); }
  };
  useEffect(() => {
    active.current = true; load(true);
    const timer = setInterval(() => load(), 5000);
    return () => { active.current = false; clearInterval(timer); };
  }, []);
  const send = async () => {
    if (!texto.trim() || readOnly || sendingRef.current) return;
    sendingRef.current = true; setSending(true); setError('');
    const contenido = texto.trim();
    try {
      const data = await enviarMensajeContexto(context, contenido);
      if (!active.current) return;
      if (!data.mensaje?.id) throw new Error('El servidor no confirmo el mensaje.');
      merge([data.mensaje]); setTexto('');
    } catch (err) {
      if (active.current) {
        setError(err.message);
        if (err.status === 409) { setServerContext((prev) => ({ ...prev, solo_lectura: true })); load(); }
      }
    } finally { sendingRef.current = false; if (active.current) setSending(false); }
  };
  const title = serverContext?.tipo === 'reserva' ? `Reserva #${serverContext.id}` : serverContext?.tipo === 'servicio' ? `Servicio #${serverContext.id}` : historical ? 'Historial anterior' : 'Conversacion';
  const openResource = async () => {
    if (serverContext?.tipo === 'servicio') { navigation.navigate('Servicios'); return; }
    try {
      const data = await getReservaMaterial(serverContext.id);
      if (!data.reserva?.publicacion?.id) throw new Error('No se encontro el lote de esta reserva.');
      if (active.current) navigation.navigate('MaterialDetail', { id: data.reserva.publicacion.id });
    } catch (err) { if (active.current) setError(err.message); }
  };
  return <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <View style={s.header}>
      {!embedded ? <TouchableOpacity accessibilityRole="button" accessibilityLabel="Volver a mensajes" onPress={() => navigation.navigate('ChatList')} style={s.back}><Feather name="arrow-left" size={22} color={T.blue} /></TouchableOpacity> : null}
      <View style={s.headerCopy}><Text style={s.name}>{counterpart?.name || 'Mensajes'}</Text><Text style={s.meta}>{title}{serverContext?.estado ? ` · ${serverContext.estado.replace(/_/g, ' ')}` : ''}</Text></View>
      {!historical && serverContext ? <Button kind="ghost" size="sm" onPress={openResource}>{serverContext.tipo === 'reserva' ? 'Ver lote' : 'Ver servicios'}</Button> : null}
    </View>
    {error ? <View style={s.notice}><Text style={s.error}>{error}</Text><Button kind="ghost" size="sm" onPress={() => ambiguous ? navigation.navigate('ChatList') : load(true)}>{ambiguous ? 'Ver hilos' : 'Reintentar'}</Button></View> : null}
    {loading ? <View style={s.center}><ActivityIndicator color={T.blue} /></View> : <FlatList
      ref={listRef} data={mensajes} keyExtractor={(item) => String(item.id)} contentContainerStyle={s.messages}
      onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
      ListEmptyComponent={<Text style={s.meta}>{error ? '' : 'Aun no hay mensajes en este hilo.'}</Text>}
      renderItem={({ item }) => <View style={[s.bubble, item.emisor_id === user?.id ? s.own : s.other]}>
        <Text style={s.message}>{item.contenido}</Text>
        <Text style={s.time}>{item.created_at ? new Date(item.created_at).toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit' }) : ''}{item.emisor_id === user?.id ? (item.leido ? ' · Leido' : ' · Enviado') : ''}</Text>
      </View>}
    />}
    {readOnly ? <Text style={s.readOnly}>{serverContext?.estado === 'interrumpido_seguridad' ? 'Servicio interrumpido por seguridad. Chat de solo lectura.' : historical ? 'Historial de solo lectura. Abre un contexto desde la bandeja para escribir.' : 'Chat de solo lectura.'}</Text> : <View style={s.composer}>
      <Input style={s.input} placeholder="Escribe un mensaje" value={texto} onChangeText={setTexto} multiline maxLength={2000} editable={!sending} />
      <TouchableOpacity style={[s.send, (!texto.trim() || sending) && s.disabled]} disabled={!texto.trim() || sending} onPress={send} accessibilityRole="button" accessibilityLabel="Enviar mensaje">
        {sending ? <ActivityIndicator color={T.white} /> : <Feather name="send" size={20} color={T.white} />}
      </TouchableOpacity>
    </View>}
  </KeyboardAvoidingView>;
}
const s = StyleSheet.create({
  container: { flex: 1, minWidth: 0, backgroundColor: T.canvas },
  header: { flexDirection: 'row', gap: T.s3, padding: T.s3, backgroundColor: T.paper, borderBottomWidth: 1, borderBottomColor: T.border, alignItems: 'center' },
  headerCopy: { flex: 1, minWidth: 0 }, back: { padding: T.s2 },
  name: { color: T.ink, fontSize: 17, fontWeight: '800' }, meta: { color: T.muted, fontSize: 13, lineHeight: 20 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' }, notice: { padding: T.s3, gap: T.s2 }, error: { color: T.danger },
  messages: { padding: T.s3, gap: T.s3 }, bubble: { maxWidth: '85%', padding: T.s3, borderRadius: T.rSm, gap: T.s1 },
  own: { alignSelf: 'flex-end', backgroundColor: T.tint }, other: { alignSelf: 'flex-start', backgroundColor: T.paper },
  message: { fontSize: 15, lineHeight: 22, color: T.text }, time: { color: T.muted, fontSize: 11, alignSelf: 'flex-end' },
  readOnly: { color: T.muted, padding: T.s3, backgroundColor: T.paper },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: T.s2, padding: T.s3, backgroundColor: T.paper },
  input: { flex: 1, minWidth: 0 }, send: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', backgroundColor: T.blue, borderRadius: T.rSm }, disabled: { opacity: 0.5 },
});
