import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { getHilosMensajes } from '../services/api';
import { Button, ScreenHeader } from '../components/ui';
import { chatContextKey } from '../utils/chatContext';
import { T } from '../theme';
import ChatScreen from './ChatScreen';
const contextOf = (hilo) => ({ tipo: hilo.tipo, id: hilo.contexto_id, contraparteId: hilo.contraparte?.id });
export default function ChatListScreen({ navigation, user }) {
  const { width } = useWindowDimensions();
  const desktop = width >= 1200;
  const [hilos, setHilos] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedKey, setSelectedKey] = useState(null);
  const version = useRef(0);
  const load = useCallback(async (page = 1) => {
    const request = ++version.current;
    setLoading(true); setError('');
    try {
      const data = await getHilosMensajes({ page });
      if (request === version.current) { setHilos(data.hilos || []); setMeta(data.meta || null); }
    } catch (err) { if (request === version.current) setError(err.message); }
    finally { if (request === version.current) setLoading(false); }
  }, []);
  useEffect(() => { load(); return () => { version.current += 1; }; }, [load, user?.id]);
  const selected = hilos.find((hilo) => chatContextKey(contextOf(hilo), user?.id) === selectedKey);
  const list = <FlatList data={hilos} keyExtractor={(hilo) => chatContextKey(contextOf(hilo), user?.id)} contentContainerStyle={s.list}
    ListEmptyComponent={!error && !loading ? <Text style={s.empty}>Bandeja vacia</Text> : null}
    renderItem={({ item }) => {
      const key = chatContextKey(contextOf(item), user?.id);
      return <TouchableOpacity style={[s.row, selectedKey === key && s.active]} onPress={() => desktop ? setSelectedKey(key) : navigation.navigate('ChatDetail', { tipo: item.tipo, contexto: item.contexto_id, userId: item.contraparte?.id })}>
        <View style={s.rowHead}><Text style={s.name}>{item.contraparte?.name || 'Usuario'}</Text>{item.no_leidos > 0 ? <Text style={s.count}>{item.no_leidos}</Text> : null}</View>
        <Text style={s.context}>{item.tipo === 'legado' ? 'Historial anterior' : `${item.tipo === 'reserva' ? 'Reserva' : 'Servicio'} #${item.contexto_id} · ${item.contexto?.titulo || ''}`}</Text>
        {item.solo_lectura ? <Text style={s.meta}>Solo lectura</Text> : null}
        <Text style={s.meta} numberOfLines={2}>{item.ultimo_mensaje?.contenido}</Text>
      </TouchableOpacity>;
    }} />;
  return <View style={s.container}>
    <ScreenHeader title="Mensajes" right={<Button icon="refresh-cw" kind="ghost" size="sm" onPress={() => load(meta?.current_page || 1)}>Actualizar</Button>} />
    {loading ? <View style={s.loading}><ActivityIndicator color={T.blue} /><Text style={s.meta}>Cargando mensajes...</Text></View> : null}
    {error ? <View style={s.loading}><Text style={s.error}>{error}</Text><Button onPress={() => load(meta?.current_page || 1)}>Reintentar</Button></View> : null}
    <View style={s.body}>
      <View style={[s.listPane, desktop && s.desktopList]}>{list}</View>
      {desktop ? <View style={s.chatPane}>{selected ? <ChatScreen context={contextOf(selected)} user={user} navigation={navigation} embedded onRead={() => load(meta?.current_page || 1)} /> : <Text style={s.empty}>Selecciona una conversacion</Text>}</View> : null}
    </View>
    {meta?.last_page > 1 ? <View style={s.pagination}><Button kind="ghost" disabled={loading || meta.current_page <= 1} onPress={() => load(meta.current_page - 1)}>Anterior</Button><Text style={s.meta}>{`${meta.current_page} / ${meta.last_page}`}</Text><Button kind="ghost" disabled={loading || meta.current_page >= meta.last_page} onPress={() => load(meta.current_page + 1)}>Siguiente</Button></View> : null}
  </View>;
}
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.canvas, gap: T.s2 }, body: { flex: 1, flexDirection: 'row', minHeight: 0 }, listPane: { flex: 1, minWidth: 0 }, desktopList: { flexGrow: 0, flexShrink: 0, flexBasis: 300, width: 300, borderRightWidth: 1, borderRightColor: T.border },
  chatPane: { flex: 1, minWidth: 0 }, list: { padding: T.s2, gap: T.s2 }, row: { borderBottomWidth: 1, borderBottomColor: T.border, padding: T.s3, gap: T.s1 }, active: { backgroundColor: T.tint },
  rowHead: { flexDirection: 'row', justifyContent: 'space-between', gap: T.s2 }, name: { flex: 1, fontSize: 15, color: T.ink, fontWeight: '800' }, count: { color: T.white, backgroundColor: T.blue, paddingHorizontal: T.s2, borderRadius: T.rSm },
  context: { color: T.deep, fontSize: 12, fontWeight: '700' }, meta: { fontSize: 13, color: T.muted, lineHeight: 19 }, loading: { padding: T.s3, gap: T.s2, alignItems: 'center' }, empty: { color: T.muted, padding: T.s4, textAlign: 'center' }, error: { color: T.danger },
  pagination: { flexDirection: 'row', flexWrap: 'wrap', gap: T.s2, alignItems: 'center', justifyContent: 'center', padding: T.s2 },
});
