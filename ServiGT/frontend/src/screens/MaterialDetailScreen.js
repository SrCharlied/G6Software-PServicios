import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { getMaterialDetalle, solicitarReservaMaterial, storageUrl } from '../services/api';
import { sessionStorage } from '../services/sessionStorage';
import { Button, Input, ScreenHeader, StatusChip } from '../components/ui';
import { chipDeLote, chipDeReserva, formatoQuetzales, ubicacionLote } from '../utils/materialEstados';
import { T } from '../theme';

export default function MaterialDetailScreen({ navigation, user, materialId }) {
  const [lote, setLote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState('');
  const busy = useRef(false);
  const attempt = useRef(null);
  const generation = useRef(0);
  const allowed = user?.role === 'proveedor';
  const cargar = useCallback(async () => {
    const version = generation.current;
    setLoading(true);
    try {
      const data = await getMaterialDetalle(materialId);
      if (version === generation.current) setLote(data.publicacion);
    } catch (err) {
      if (version === generation.current) setError(err.message);
    } finally {
      if (version === generation.current) setLoading(false);
    }
  }, [materialId]);
  useEffect(() => {
    setLote(null); setError(''); setSuccess(''); setMensaje(''); attempt.current = null;
    if (allowed) cargar();
    return () => { generation.current += 1; };
  }, [allowed, cargar]);

  const solicitar = async () => {
    if (busy.current) return;
    if (!mensaje.trim()) { setError('Escribe un mensaje inicial.'); return; }
    busy.current = true;
    setSending(true); setError('');
    const version = generation.current;
    const storageKey = `chat_reserva_intento_${user.id}_${materialId}`;
    try {
      // Persistir el intento permite recuperar la misma reserva tras perder la respuesta.
      if (!attempt.current) {
        const stored = await sessionStorage.getItem(storageKey);
        attempt.current = stored ? JSON.parse(stored) : {
          idempotency_key: `reserva-${user.id}-${materialId}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          mensaje_inicial: mensaje.trim(),
        };
        await sessionStorage.setItem(storageKey, JSON.stringify(attempt.current));
      }
      const data = await solicitarReservaMaterial(materialId, attempt.current);
      if (!data.reserva?.id) throw new Error('El servidor no confirmo la reserva.');
      await sessionStorage.removeItem(storageKey);
      if (version !== generation.current) return;
      setLote((prev) => ({ ...prev, mi_reserva: data.reserva }));
      setSuccess('Solicitud enviada correctamente.');
    } catch (err) {
      if (version !== generation.current) return;
      setError(err.message);
      if (err.status === 409 || err.status === 422) await cargar();
      if (err.status && err.status < 500) {
        attempt.current = null;
        await sessionStorage.removeItem(storageKey);
      }
    } finally {
      busy.current = false;
      if (version === generation.current) setSending(false);
    }
  };
  if (!allowed) return <Text>La bolsa de materiales es exclusiva para proveedores.</Text>;
  if (loading) return <View style={s.center}><ActivityIndicator color={T.blue} /><Text>Cargando lote...</Text></View>;
  if (!lote) return <View style={s.center}><Text style={s.error}>{error}</Text><Button onPress={() => { setError(''); cargar(); }}>Reintentar</Button></View>;
  const reserva = lote.mi_reserva;
  const canReserve = !lote.es_mio && lote.estado === 'disponible' && (!reserva || reserva.estado === 'cancelada');
  const chip = chipDeLote(lote.estado);
  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <ScreenHeader title="Detalle del lote" onBack={() => navigation.goBack()} />
      <Text style={s.title}>{lote.titulo}</Text>
      <StatusChip {...chip} />
      <ScrollView horizontal contentContainerStyle={s.gallery}>{(lote.imagenes || []).map((img) => <Image key={img.id} source={{ uri: storageUrl(img.url) }} accessibilityLabel={lote.titulo} style={s.image} />)}</ScrollView>
      <Text style={s.price}>{formatoQuetzales(lote.precio_referencial)}</Text>
      <Text style={s.text}>{`${lote.cantidad} ${lote.unidad} · ${ubicacionLote(lote)}`}</Text>
      <Text style={s.text}>{lote.descripcion}</Text>
      <Text style={s.meta}>{lote.vendedor?.nombre}</Text>
      {error ? <Text style={s.error}>{error}</Text> : null}
      {success ? <Text style={s.success}>{success}</Text> : null}
      {reserva ? <View style={s.section}>
        <StatusChip {...chipDeReserva(reserva.estado)} />
        <Button kind="secondary" icon="message-circle" onPress={() => navigation.navigate('ChatContexto', { tipo: 'reserva', id: reserva.id })}>Abrir chat</Button>
      </View> : null}
      {canReserve ? <View style={s.section}>
        <Input accessibilityLabel="Mensaje inicial" placeholder="Mensaje al vendedor" multiline maxLength={1000} value={mensaje} onChangeText={setMensaje} editable={!sending} />
        <Button onPress={solicitar} loading={sending} disabled={sending}>Solicitar reserva</Button>
      </View> : null}
    </ScrollView>
  );
}
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.canvas },
  content: { padding: T.s4, gap: T.s3, width: '100%', maxWidth: 850, alignSelf: 'center', paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: T.s3, padding: T.s4 },
  gallery: { gap: T.s2 },
  image: { width: 280, height: 210, borderRadius: T.rSm },
  price: { fontSize: 24, fontWeight: '800', color: T.deep },
  title: { fontSize: 22, fontWeight: '800', color: T.ink },
  text: { color: T.text, fontSize: 15, lineHeight: 23 },
  meta: { color: T.muted, fontSize: 14 },
  error: { color: T.danger },
  success: { color: T.success },
  section: { gap: T.s3, borderTopWidth: 1, borderTopColor: T.border, paddingTop: T.s4 },
});
