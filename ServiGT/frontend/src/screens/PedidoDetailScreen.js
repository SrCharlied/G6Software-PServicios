import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { getPedidoDetalle, enviarCotizacion } from '../services/api';
import { T } from '../theme';

const URGENCIA_CONFIG = {
  alta:  { label: 'URGENTE', bg: '#fee2e2', text: '#991b1b', border: '#fca5a5' },
  media: { label: 'MEDIA',   bg: '#fef3c7', text: '#92400e', border: '#fde68a' },
  baja:  { label: 'BAJA',    bg: '#d1fae5', text: '#065f46', border: '#86efac' },
};

const LETRAS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

const timeAgo = (iso) => {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'ahora mismo';
  if (m < 60) return `hace ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.floor(h / 24);
  return `hace ${d} d`;
};

const fmtDate = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-GT', { dateStyle: 'medium' });
};

const fmtMonto = (v) => {
  if (v == null) return '—';
  return `Q${Number(v).toFixed(2)}`;
};

export default function PedidoDetailScreen({ pedidoId, navigation }) {
  const [pedido, setPedido]           = useState(null);
  const [cotizaciones, setCotizaciones] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState('');

  const [showModal, setShowModal]     = useState(false);
  const [monto, setMonto]             = useState('');
  const [mensaje, setMensaje]         = useState('');
  const [submitting, setSubmitting]   = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitted, setSubmitted]     = useState(false);

  useEffect(() => { load(); }, [pedidoId]);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getPedidoDetalle(pedidoId);
      setPedido(data.pedido);
      setCotizaciones(data.cotizaciones || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const openModal = () => {
    setMonto('');
    setMensaje('');
    setSubmitError('');
    setShowModal(true);
  };

  const handleSubmit = async () => {
    const montoNum = Number(monto);
    if (!monto || isNaN(montoNum) || montoNum <= 0) {
      setSubmitError('Ingresa un monto válido mayor a Q0.');
      return;
    }
    if (mensaje.trim().length < 10) {
      setSubmitError('El mensaje debe tener al menos 10 caracteres.');
      return;
    }
    setSubmitting(true);
    setSubmitError('');
    try {
      await enviarCotizacion(pedidoId, { monto: montoNum, mensaje: mensaje.trim() });
      setSubmitted(true);
      setShowModal(false);
      setCotizaciones((prev) => [
        ...prev,
        { indice: prev.length, monto: montoNum, calificacion: 0, estado: 'enviada' },
      ]);
    } catch (e) {
      setSubmitError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={s.centered}>
        <ActivityIndicator size="large" color={T.blue} />
      </SafeAreaView>
    );
  }

  if (error || !pedido) {
    return (
      <SafeAreaView style={s.centered}>
        <Text style={s.errorText}>{error || 'No se pudo cargar el pedido.'}</Text>
        <TouchableOpacity style={s.retryBtn} onPress={load}>
          <Text style={s.retryText}>Reintentar</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const urgCfg   = URGENCIA_CONFIG[pedido.urgencia] ?? URGENCIA_CONFIG.media;
  const montos   = cotizaciones.map((c) => c.monto);
  const montoMin = montos.length ? Math.min(...montos) : null;
  const montoMax = montos.length ? Math.max(...montos) : null;

  return (
    <SafeAreaView style={s.container}>
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

        {/* Back */}
        <TouchableOpacity style={s.backRow} onPress={() => navigation.goBack()}>
          <Text style={s.backText}>← Volver</Text>
        </TouchableOpacity>

        {/* Urgency · Category · Time */}
        <View style={s.badgeRow}>
          <View style={[s.urgBadge, { backgroundColor: urgCfg.bg, borderColor: urgCfg.border }]}>
            <Text style={[s.urgText, { color: urgCfg.text }]}>{urgCfg.label}</Text>
          </View>
          <Text style={s.catText}>{pedido.categoria?.nombre || 'Sin categoría'}</Text>
          <Text style={s.timeText}>{timeAgo(pedido.created_at)}</Text>
        </View>

        {/* Description */}
        <View style={s.card}>
          <Text style={s.cardLabel}>Descripción</Text>
          <Text style={s.descText}>{pedido.descripcion}</Text>
        </View>

        {/* Meta grid */}
        <View style={s.metaGrid}>
          {pedido.direccion ? (
            <View style={s.metaItem}>
              <Text style={s.metaLabel}>📍 Dirección</Text>
              <Text style={s.metaValue}>{pedido.direccion}</Text>
            </View>
          ) : null}
          <View style={s.metaItem}>
            <Text style={s.metaLabel}>📅 Expira</Text>
            <Text style={s.metaValue}>{fmtDate(pedido.fecha_expiracion)}</Text>
          </View>
          {pedido.cliente?.name ? (
            <View style={s.metaItem}>
              <Text style={s.metaLabel}>👤 Cliente</Text>
              <Text style={s.metaValue}>{pedido.cliente.name}</Text>
            </View>
          ) : null}
        </View>

        {/* Cotizaciones */}
        <View style={s.card}>
          <View style={s.cotHeader}>
            <Text style={s.cardLabel}>Cotizaciones recibidas</Text>
            <View style={s.cotCountBadge}>
              <Text style={s.cotCountText}>{cotizaciones.length}</Text>
            </View>
          </View>

          {cotizaciones.length > 0 && montoMin != null && (
            <View style={s.rangeBar}>
              <Text style={s.rangeText}>
                Rango de ofertas: {fmtMonto(montoMin)} – {fmtMonto(montoMax)}
              </Text>
            </View>
          )}

          {cotizaciones.length === 0 ? (
            <View style={s.emptyState}>
              <Text style={s.emptyText}>Sé el primero en cotizar este pedido.</Text>
            </View>
          ) : (
            cotizaciones.map((c, i) => (
              <View key={i} style={[s.cotRow, i === cotizaciones.length - 1 && s.cotRowLast]}>
                <View style={s.cotAvatar}>
                  <Text style={s.cotAvatarText}>{LETRAS[i % 26]}</Text>
                </View>
                <View style={s.cotInfo}>
                  <Text style={s.cotName}>Proveedor {LETRAS[i % 26]}</Text>
                  <View style={s.cotMeta}>
                    {c.calificacion > 0 && (
                      <Text style={s.cotRating}>★ {Number(c.calificacion).toFixed(1)}</Text>
                    )}
                    <Text style={s.cotDot}>·</Text>
                    <Text style={s.cotAmount}>{fmtMonto(c.monto)}</Text>
                  </View>
                </View>
                <View style={[s.estadoBadge, c.estado === 'aceptada' && s.estadoAceptada]}>
                  <Text style={[s.estadoText, c.estado === 'aceptada' && s.estadoTextAceptada]}>
                    {c.estado}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* FAB */}
      <View style={s.fabWrap}>
        {submitted ? (
          <View style={s.fabSent}>
            <Text style={s.fabSentText}>✓ Cotización enviada</Text>
          </View>
        ) : (
          <TouchableOpacity style={s.fab} onPress={openModal} activeOpacity={0.88}>
            <Text style={s.fabText}>Enviar cotización</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Quote modal */}
      <Modal
        visible={showModal}
        transparent
        animationType="slide"
        onRequestClose={() => !submitting && setShowModal(false)}
      >
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <Pressable style={s.backdrop} onPress={() => !submitting && setShowModal(false)}>
            <Pressable style={s.sheet} onPress={() => {}}>
              <Text style={s.sheetTitle}>Enviar cotización</Text>
              <Text style={s.sheetSubtitle}>
                Tu nombre no será visible hasta que el cliente te seleccione.
              </Text>

              <Text style={s.inputLabel}>Monto (Q) *</Text>
              <TextInput
                style={s.input}
                value={monto}
                onChangeText={(v) => { setMonto(v.replace(/[^0-9.]/g, '')); setSubmitError(''); }}
                placeholder="Ej. 450.00"
                placeholderTextColor={T.faint}
                keyboardType="decimal-pad"
                returnKeyType="next"
              />

              <Text style={s.inputLabel}>Mensaje al cliente *</Text>
              <TextInput
                style={[s.input, s.inputMulti]}
                value={mensaje}
                onChangeText={(v) => { setMensaje(v); setSubmitError(''); }}
                placeholder="Describe tu propuesta, experiencia o tiempo estimado…"
                placeholderTextColor={T.faint}
                multiline
                numberOfLines={4}
                maxLength={500}
                textAlignVertical="top"
              />
              <Text style={s.charCount}>{mensaje.length}/500</Text>

              {submitError ? <Text style={s.submitError}>{submitError}</Text> : null}

              <View style={s.modalActions}>
                <TouchableOpacity
                  style={s.cancelBtn}
                  onPress={() => setShowModal(false)}
                  disabled={submitting}
                >
                  <Text style={s.cancelText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.sendBtn, submitting && s.sendBtnDisabled]}
                  onPress={handleSubmit}
                  disabled={submitting}
                >
                  {submitting
                    ? <ActivityIndicator color="#fff" />
                    : <Text style={s.sendText}>Enviar</Text>}
                </TouchableOpacity>
              </View>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.canvas },
  centered:  { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  content:   { padding: 20 },

  backRow:  { marginBottom: 18 },
  backText: { color: T.blue, fontWeight: '600', fontSize: 15 },

  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16, flexWrap: 'wrap' },
  urgBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, borderWidth: 1 },
  urgText:  { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  catText:  { flex: 1, fontSize: 13, color: T.deep, fontWeight: '600' },
  timeText: { fontSize: 12, color: T.faint },

  card:      { backgroundColor: T.white, borderRadius: T.rMd, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: T.border, ...T.sh1 },
  cardLabel: { fontSize: 11, fontWeight: '700', color: T.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  descText:  { fontSize: 15, color: T.text, lineHeight: 23 },

  metaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 },
  metaItem: { flex: 1, minWidth: 130, backgroundColor: T.white, borderRadius: T.rMd, padding: 14, borderWidth: 1, borderColor: T.border },
  metaLabel:{ fontSize: 11, color: T.muted, marginBottom: 4 },
  metaValue:{ fontSize: 13, fontWeight: '600', color: T.ink, lineHeight: 18 },

  cotHeader:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  cotCountBadge: { backgroundColor: T.blue, borderRadius: 999, minWidth: 28, height: 28, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 8 },
  cotCountText:  { color: '#fff', fontWeight: '800', fontSize: 13 },

  rangeBar:  { backgroundColor: '#eef4ff', borderRadius: T.rSm, padding: 10, marginBottom: 14 },
  rangeText: { fontSize: 13, color: T.deep, fontWeight: '600', textAlign: 'center' },

  emptyState: { paddingVertical: 24, alignItems: 'center', borderWidth: 1, borderColor: T.inputBorder, borderStyle: 'dashed', borderRadius: T.rMd },
  emptyText:  { fontSize: 14, color: T.muted },

  cotRow:      { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: T.paper },
  cotRowLast:  { borderBottomWidth: 0 },
  cotAvatar:   { width: 40, height: 40, borderRadius: 20, backgroundColor: T.soft, justifyContent: 'center', alignItems: 'center' },
  cotAvatarText: { fontSize: 15, fontWeight: '800', color: T.deep },
  cotInfo:     { flex: 1 },
  cotName:     { fontSize: 14, fontWeight: '700', color: T.ink, marginBottom: 3 },
  cotMeta:     { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cotRating:   { fontSize: 13, color: '#d97706', fontWeight: '700' },
  cotDot:      { fontSize: 13, color: T.faint },
  cotAmount:   { fontSize: 14, fontWeight: '700', color: T.blue },
  estadoBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, backgroundColor: T.paper, borderWidth: 1, borderColor: T.border },
  estadoAceptada:    { backgroundColor: '#d1fae5', borderColor: '#86efac' },
  estadoText:        { fontSize: 10, fontWeight: '700', color: T.muted, textTransform: 'capitalize' },
  estadoTextAceptada:{ color: '#065f46' },

  errorText: { fontSize: 15, color: T.danger, textAlign: 'center', marginBottom: 16 },
  retryBtn:  { backgroundColor: T.blue, paddingHorizontal: 24, paddingVertical: 10, borderRadius: T.rSm },
  retryText: { color: '#fff', fontWeight: '600', fontSize: 14 },

  fabWrap: { position: 'absolute', bottom: 24, left: 20, right: 20 },
  fab: {
    backgroundColor: T.blue, paddingVertical: 16,
    borderRadius: T.rLg, alignItems: 'center', ...T.sh3,
  },
  fabText:     { color: '#fff', fontWeight: '800', fontSize: 16 },
  fabSent:     { backgroundColor: '#d1fae5', paddingVertical: 16, borderRadius: T.rLg, alignItems: 'center', borderWidth: 1, borderColor: '#86efac' },
  fabSentText: { color: '#065f46', fontWeight: '700', fontSize: 15 },

  backdrop: { flex: 1, backgroundColor: 'rgba(14,20,36,0.5)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: T.white,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 24, paddingBottom: 40,
  },
  sheetTitle:    { fontSize: 18, fontWeight: '800', color: T.ink, marginBottom: 6 },
  sheetSubtitle: { fontSize: 13, color: T.muted, marginBottom: 20, lineHeight: 18 },
  inputLabel:    { fontSize: 12, fontWeight: '700', color: T.muted, marginBottom: 6, marginTop: 14 },
  input: {
    backgroundColor: T.paper, borderWidth: 1, borderColor: T.inputBorder,
    borderRadius: T.rSm, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: T.ink,
  },
  inputMulti:  { height: 110, paddingTop: 12 },
  charCount:   { fontSize: 11, color: T.faint, textAlign: 'right', marginTop: 4 },
  submitError: { color: T.danger, fontSize: 13, marginTop: 8 },
  modalActions:{ flexDirection: 'row', gap: 10, marginTop: 20 },
  cancelBtn:   { flex: 1, paddingVertical: 13, borderRadius: T.rSm, borderWidth: 1, borderColor: T.border, alignItems: 'center', backgroundColor: T.white },
  cancelText:  { color: T.text, fontWeight: '600', fontSize: 14 },
  sendBtn:     { flex: 2, paddingVertical: 13, borderRadius: T.rSm, backgroundColor: T.blue, alignItems: 'center' },
  sendBtnDisabled: { opacity: 0.6 },
  sendText:    { color: '#fff', fontWeight: '700', fontSize: 15 },
});
