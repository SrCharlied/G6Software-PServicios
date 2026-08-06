import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
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
import { getPedidoDetalle, enviarCotizacion, editarCotizacion, aceptarCotizacion, getMiCredito, storageUrl } from '../services/api';
import { useSession } from '../context/SessionContext';
import { useToast } from '../context/ToastContext';
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

const fmtDate  = (iso) => iso ? new Date(iso).toLocaleDateString('es-GT', { dateStyle: 'medium' }) : '—';
const fmtMonto = (v)   => v != null ? `Q${Number(v).toFixed(2)}` : '—';

// ── Vista cliente: card de cotización con foto, nombre, rating, monto, mensaje ──

function CotizacionClienteRow({ cot, esMejorPrecio, esMejorCalif, isLast, puedeElegir, onElegir }) {
  const prov     = cot.proveedor;
  const nombre   = prov?.nombre   ?? 'Proveedor';
  const rating   = prov?.calificacion_promedio ?? 0;
  const photoUri = storageUrl(prov?.foto_perfil);
  const inicial  = nombre.charAt(0).toUpperCase();

  return (
    <View style={[cs.card, isLast && cs.cardLast]}>
      {/* Badges */}
      {(esMejorPrecio || esMejorCalif) && (
        <View style={cs.badgeRow}>
          {esMejorPrecio && (
            <View style={cs.badgePrecio}>
              <Text style={cs.badgePrecioText}>💰 Mejor precio</Text>
            </View>
          )}
          {esMejorCalif && (
            <View style={cs.badgeCalif}>
              <Text style={cs.badgeCaliText}>⭐ Mejor calificación</Text>
            </View>
          )}
        </View>
      )}

      {/* Header: avatar + nombre/rating + monto */}
      <View style={cs.header}>
        {photoUri ? (
          <Image source={{ uri: photoUri }} style={cs.avatar} />
        ) : (
          <View style={cs.avatarFallback}>
            <Text style={cs.avatarInitial}>{inicial}</Text>
          </View>
        )}

        <View style={cs.provInfo}>
          <Text style={cs.provNombre} numberOfLines={1}>{nombre}</Text>
          {rating > 0 ? (
            <Text style={cs.provRating}>★ {Number(rating).toFixed(1)}</Text>
          ) : (
            <Text style={cs.provSinRating}>Sin calificaciones</Text>
          )}
        </View>

        <Text style={cs.monto}>{fmtMonto(cot.monto)}</Text>
      </View>

      {/* Mensaje */}
      {cot.mensaje ? (
        <Text style={cs.mensaje} numberOfLines={4}>{cot.mensaje}</Text>
      ) : null}

      {/* Pie: tiempo */}
      <Text style={cs.tiempo}>{timeAgo(cot.created_at)}</Text>

      {/* Acción / estado */}
      {cot.estado === 'aceptada' ? (
        <View style={cs.aceptadaBadge}>
          <Text style={cs.aceptadaText}>✓ Cotización aceptada</Text>
        </View>
      ) : puedeElegir ? (
        <TouchableOpacity style={cs.elegirBtn} onPress={() => onElegir(cot)} activeOpacity={0.85}>
          <Text style={cs.elegirBtnText}>Elegir cotización</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

export default function PedidoDetailScreen({ pedidoId, navigation }) {
  const { user } = useSession();
  const toast = useToast();
  const esProveedor = user?.role === 'proveedor';

  const [pedido, setPedido]             = useState(null);
  const [cotizaciones, setCotizaciones] = useState([]);
  const [miCotizacion, setMiCotizacion] = useState(null);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState('');

  const [showModal, setShowModal]       = useState(false);
  const [saldo, setSaldo]               = useState(null);
  const [loadingSaldo, setLoadingSaldo] = useState(false);
  const [saldoError, setSaldoError]     = useState('');
  const [monto, setMonto]               = useState('');
  const [mensaje, setMensaje]           = useState('');
  const [submitting, setSubmitting]     = useState(false);
  const [submitError, setSubmitError]   = useState('');
  const [submitted, setSubmitted]       = useState(false);

  const [confirmCot, setConfirmCot]     = useState(null);
  const [aceptando, setAceptando]       = useState(false);
  const [acceptError, setAcceptError]   = useState('');

  useEffect(() => { load(); }, [pedidoId]);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getPedidoDetalle(pedidoId);
      setPedido(data.pedido);
      setCotizaciones(data.cotizaciones || []);
      setMiCotizacion(data.mi_cotizacion ?? null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  // Un fallo al consultar el saldo deja saldo en null y muestra el error real.
  // Nunca se sustituye por 0: un cero solo puede venir del backend.
  const cargarSaldo = () => {
    setLoadingSaldo(true);
    setSaldoError('');
    getMiCredito()
      .then((data) => setSaldo(data.saldo ?? 0))
      .catch((e) => { setSaldo(null); setSaldoError(e.message); })
      .finally(() => setLoadingSaldo(false));
  };

  const openModal = () => {
    setMonto(miCotizacion ? String(miCotizacion.monto) : '');
    setMensaje(miCotizacion ? miCotizacion.mensaje : '');
    setSubmitError('');
    setShowModal(true);
    // Siempre obtener saldo actualizado al abrir el modal
    cargarSaldo();
  };

  const handleSubmit = async () => {
    const montoNum = Number(monto);
    if (!monto || isNaN(montoNum) || montoNum <= 0) {
      setSubmitError('Ingresa un monto válido mayor a Q0.');
      return;
    }
    if (mensaje.trim().length < 20) {
      setSubmitError('El mensaje debe tener al menos 20 caracteres.');
      return;
    }
    setSubmitting(true);
    setSubmitError('');
    try {
      if (miCotizacion) {
        const res = await editarCotizacion(pedidoId, miCotizacion.id, { monto: montoNum, mensaje: mensaje.trim() });
        if (res.nuevo_saldo != null) setSaldo(res.nuevo_saldo);
        const updated = { ...miCotizacion, monto: montoNum, mensaje: mensaje.trim() };
        setMiCotizacion(updated);
        setCotizaciones((prev) =>
          prev.map((c) => c.indice === miCotizacion.indice ? { ...c, monto: montoNum } : c)
        );
      } else {
        await enviarCotizacion(pedidoId, { monto: montoNum, mensaje: mensaje.trim() });
        setCotizaciones((prev) => [
          ...prev,
          { indice: prev.length, monto: montoNum, calificacion: 0, estado: 'enviada' },
        ]);
      }
      setSubmitted(true);
      setShowModal(false);
    } catch (e) {
      setSubmitError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAceptar = async () => {
    if (!confirmCot) return;
    setAceptando(true);
    setAcceptError('');
    try {
      const data = await aceptarCotizacion(pedidoId, confirmCot.id);
      toast(data.message || 'Cotización aceptada. Servicio creado.', 'success');
      setConfirmCot(null);
      navigation.navigate('Solicitudes');
    } catch (e) {
      setAcceptError(e.message);
    } finally {
      setAceptando(false);
    }
  };

  // ── Loading / Error ───────────────────────────────────────────────────────
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

  // ── Calcular badges para vista cliente ───────────────────────────────────
  const urgCfg = URGENCIA_CONFIG[pedido.urgencia] ?? URGENCIA_CONFIG.media;
  const montos  = cotizaciones.map((c) => c.monto);
  const montoMin = montos.length ? Math.min(...montos) : null;
  const montoMax = montos.length ? Math.max(...montos) : null;

  const mejorPrecioIdx = !esProveedor && cotizaciones.length > 0
    ? cotizaciones.reduce((best, c, i) => c.monto < cotizaciones[best].monto ? i : best, 0)
    : -1;

  const maxCalif = !esProveedor && cotizaciones.length > 0
    ? Math.max(...cotizaciones.map((c) => c.proveedor?.calificacion_promedio ?? 0))
    : 0;
  const mejorCalifIdx = maxCalif > 0
    ? cotizaciones.findIndex((c) => (c.proveedor?.calificacion_promedio ?? 0) === maxCalif)
    : -1;

  return (
    <SafeAreaView style={s.container}>
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

        {/* Volver */}
        <TouchableOpacity style={s.backRow} onPress={() => navigation.goBack()}>
          <Text style={s.backText}>← Volver</Text>
        </TouchableOpacity>

        {/* Urgencia · Categoría · Tiempo */}
        <View style={s.badgeRow}>
          <View style={[s.urgBadge, { backgroundColor: urgCfg.bg, borderColor: urgCfg.border }]}>
            <Text style={[s.urgText, { color: urgCfg.text }]}>{urgCfg.label}</Text>
          </View>
          <Text style={s.catText}>{pedido.categoria?.nombre || 'Sin categoría'}</Text>
          <Text style={s.timeText}>{timeAgo(pedido.created_at)}</Text>
        </View>

        {/* Descripción */}
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

        {/* ── Cotizaciones ──────────────────────────────────────────────── */}
        <View style={s.card}>
          <View style={s.cotHeader}>
            <Text style={s.cardLabel}>Cotizaciones recibidas</Text>
            <View style={s.cotCountBadge}>
              <Text style={s.cotCountText}>{cotizaciones.length}</Text>
            </View>
          </View>

          {/* Rango de precios (vista proveedor) */}
          {esProveedor && cotizaciones.length > 0 && montoMin != null && (
            <View style={s.rangeBar}>
              <Text style={s.rangeText}>
                Rango de ofertas: {fmtMonto(montoMin)} – {fmtMonto(montoMax)}
              </Text>
            </View>
          )}

          {/* Estado del pedido cuando ya no está abierto (vista cliente) */}
          {!esProveedor && pedido.estado !== 'abierto' && (
            <View style={s.rangeBar}>
              <Text style={s.rangeText}>
                {pedido.estado === 'adjudicado'
                  ? 'Este pedido ya fue adjudicado.'
                  : `Este pedido está ${pedido.estado}.`}
              </Text>
            </View>
          )}

          {cotizaciones.length === 0 ? (
            <View style={s.emptyState}>
              <Text style={s.emptyText}>
                {esProveedor
                  ? 'Sé el primero en cotizar este pedido.'
                  : 'Aún no has recibido cotizaciones.'}
              </Text>
            </View>
          ) : esProveedor ? (
            /* Vista proveedor: anonimizada */
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
          ) : (
            /* Vista cliente: con foto, nombre, rating, monto, mensaje, badges */
            cotizaciones.map((c, i) => (
              <CotizacionClienteRow
                key={i}
                cot={c}
                esMejorPrecio={i === mejorPrecioIdx}
                esMejorCalif={i === mejorCalifIdx}
                isLast={i === cotizaciones.length - 1}
                puedeElegir={pedido.estado === 'abierto' && c.estado === 'enviada'}
                onElegir={setConfirmCot}
              />
            ))
          )}
        </View>

        <View style={{ height: esProveedor ? 100 : 32 }} />
      </ScrollView>

      {/* FAB — solo proveedores */}
      {esProveedor && (
        <View style={s.fabWrap}>
          {submitted && !miCotizacion ? (
            <View style={s.fabSent}>
              <Text style={s.fabSentText}>✓ Cotización enviada</Text>
            </View>
          ) : (
            <TouchableOpacity style={s.fab} onPress={openModal} activeOpacity={0.88}>
              <Text style={s.fabText}>
                {miCotizacion ? 'Editar cotización' : 'Enviar cotización'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Modal de cotización — solo proveedores */}
      <Modal
        visible={esProveedor && showModal}
        transparent
        animationType="slide"
        onRequestClose={() => !submitting && setShowModal(false)}
      >
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <Pressable style={s.backdrop} onPress={() => !submitting && setShowModal(false)}>
            <Pressable style={s.sheet} onPress={() => {}}>
              <Text style={s.sheetTitle}>
                {miCotizacion ? 'Editar cotización' : 'Enviar cotización'}
              </Text>
              <Text style={s.sheetSubtitle}>
                {miCotizacion
                  ? 'Puedes modificar tu monto o mensaje.'
                  : 'Tu nombre no será visible hasta que el cliente te seleccione.'}
              </Text>

              {/* Banner de costo al editar */}
              {miCotizacion && (
                <View style={s.creditBanner}>
                  <Text style={s.creditBannerIcon}>💳</Text>
                  <Text style={s.creditBannerText}>
                    Costo: 1 crédito{'  ·  '}
                    Saldo: {loadingSaldo ? '…' : (saldo ?? 'no disponible')}
                  </Text>
                </View>
              )}

              {/* El saldo no se pudo consultar: se muestra el motivo real en
                  lugar de un cero que el proveedor leeria como "sin creditos" */}
              {miCotizacion && !loadingSaldo && !!saldoError && (
                <View style={s.saldoErrorBox}>
                  <Text style={s.saldoErrorText}>{saldoError}</Text>
                  <Pressable onPress={cargarSaldo} hitSlop={8}>
                    <Text style={s.saldoRetry}>Reintentar</Text>
                  </Pressable>
                </View>
              )}

              {/* Sin saldo warning al editar */}
              {miCotizacion && saldo !== null && !loadingSaldo && saldo < 1 && (
                <View style={s.sinSaldoBox}>
                  <Text style={s.sinSaldoText}>
                    Sin créditos disponibles. Recarga para poder editar tu cotización.
                  </Text>
                </View>
              )}

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

              <Text style={s.inputLabel}>Mensaje al cliente * (mín. 20 caracteres)</Text>
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
                  style={[s.sendBtn, (submitting || (miCotizacion && saldo !== null && !loadingSaldo && saldo < 1)) && s.sendBtnDisabled]}
                  onPress={handleSubmit}
                  disabled={submitting || (miCotizacion && saldo !== null && !loadingSaldo && saldo < 1)}
                >
                  {submitting
                    ? <ActivityIndicator color="#fff" />
                    : <Text style={s.sendText}>{miCotizacion ? 'Guardar cambios' : 'Enviar'}</Text>}
                </TouchableOpacity>
              </View>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>

      {/* Modal de confirmación — elegir cotización (vista cliente) */}
      <Modal
        visible={!!confirmCot}
        transparent
        animationType="fade"
        onRequestClose={() => !aceptando && setConfirmCot(null)}
      >
        <View style={s.confirmOverlay}>
          <View style={s.confirmCard}>
            <Text style={s.confirmTitle}>Elegir esta cotización</Text>
            <Text style={s.confirmSubtitle}>
              {confirmCot ? `${confirmCot.proveedor?.nombre ?? 'Este proveedor'} · ${fmtMonto(confirmCot.monto)}` : ''}
            </Text>
            <Text style={s.confirmWarning}>
              Esta acción no se puede deshacer. Las demás cotizaciones se rechazarán y se creará un servicio con este proveedor.
            </Text>

            {acceptError ? <Text style={s.submitError}>{acceptError}</Text> : null}

            <View style={s.modalActions}>
              <TouchableOpacity
                style={s.cancelBtn}
                onPress={() => setConfirmCot(null)}
                disabled={aceptando}
              >
                <Text style={s.cancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.sendBtn, aceptando && s.sendBtnDisabled]}
                onPress={handleAceptar}
                disabled={aceptando}
              >
                {aceptando
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={s.sendText}>Confirmar</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ── Estilos pantalla principal ────────────────────────────────────────────────
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

  metaGrid:  { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 },
  metaItem:  { flex: 1, minWidth: 130, backgroundColor: T.white, borderRadius: T.rMd, padding: 14, borderWidth: 1, borderColor: T.border },
  metaLabel: { fontSize: 11, color: T.muted, marginBottom: 4 },
  metaValue: { fontSize: 13, fontWeight: '600', color: T.ink, lineHeight: 18 },

  cotHeader:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  cotCountBadge: { backgroundColor: T.blue, borderRadius: 999, minWidth: 28, height: 28, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 8 },
  cotCountText:  { color: '#fff', fontWeight: '800', fontSize: 13 },
  rangeBar:      { backgroundColor: '#eef4ff', borderRadius: T.rSm, padding: 10, marginBottom: 14 },
  rangeText:     { fontSize: 13, color: T.deep, fontWeight: '600', textAlign: 'center' },
  emptyState:    { paddingVertical: 24, alignItems: 'center', borderWidth: 1, borderColor: T.inputBorder, borderStyle: 'dashed', borderRadius: T.rMd },
  emptyText:     { fontSize: 14, color: T.muted },

  // Cotizaciones anonimizadas (proveedor)
  cotRow:        { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: T.paper },
  cotRowLast:    { borderBottomWidth: 0 },
  cotAvatar:     { width: 40, height: 40, borderRadius: 20, backgroundColor: T.soft, justifyContent: 'center', alignItems: 'center' },
  cotAvatarText: { fontSize: 15, fontWeight: '800', color: T.deep },
  cotInfo:       { flex: 1 },
  cotName:       { fontSize: 14, fontWeight: '700', color: T.ink, marginBottom: 3 },
  cotMeta:       { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cotRating:     { fontSize: 13, color: '#d97706', fontWeight: '700' },
  cotDot:        { fontSize: 13, color: T.faint },
  cotAmount:     { fontSize: 14, fontWeight: '700', color: T.blue },
  estadoBadge:        { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, backgroundColor: T.paper, borderWidth: 1, borderColor: T.border },
  estadoAceptada:     { backgroundColor: '#d1fae5', borderColor: '#86efac' },
  estadoText:         { fontSize: 10, fontWeight: '700', color: T.muted, textTransform: 'capitalize' },
  estadoTextAceptada: { color: '#065f46' },

  errorText: { fontSize: 15, color: T.danger, textAlign: 'center', marginBottom: 16 },
  retryBtn:  { backgroundColor: T.blue, paddingHorizontal: 24, paddingVertical: 10, borderRadius: T.rSm },
  retryText: { color: '#fff', fontWeight: '600', fontSize: 14 },

  fabWrap:     { position: 'absolute', bottom: 24, left: 20, right: 20 },
  fab:         { backgroundColor: T.blue, paddingVertical: 16, borderRadius: T.rLg, alignItems: 'center', ...T.sh3 },
  fabText:     { color: '#fff', fontWeight: '800', fontSize: 16 },
  fabSent:     { backgroundColor: '#d1fae5', paddingVertical: 16, borderRadius: T.rLg, alignItems: 'center', borderWidth: 1, borderColor: '#86efac' },
  fabSentText: { color: '#065f46', fontWeight: '700', fontSize: 15 },

  backdrop:      { flex: 1, backgroundColor: 'rgba(14,20,36,0.5)', justifyContent: 'flex-end' },
  sheet:         { backgroundColor: T.white, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 40 },
  sheetTitle:    { fontSize: 18, fontWeight: '800', color: T.ink, marginBottom: 6 },
  sheetSubtitle: { fontSize: 13, color: T.muted, marginBottom: 20, lineHeight: 18 },
  inputLabel:    { fontSize: 12, fontWeight: '700', color: T.muted, marginBottom: 6, marginTop: 14 },
  input:         { backgroundColor: T.paper, borderWidth: 1, borderColor: T.inputBorder, borderRadius: T.rSm, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: T.ink },
  inputMulti:    { height: 110, paddingTop: 12 },
  charCount:     { fontSize: 11, color: T.faint, textAlign: 'right', marginTop: 4 },
  submitError:   { color: T.danger, fontSize: 13, marginTop: 8 },
  creditBanner:  { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fef9c3', borderWidth: 1, borderColor: '#fde047', borderRadius: T.rSm, paddingHorizontal: 12, paddingVertical: 9, marginBottom: 4 },
  creditBannerIcon: { fontSize: 15 },
  creditBannerText: { fontSize: 13, fontWeight: '700', color: '#713f12', flex: 1 },
  sinSaldoBox:   { backgroundColor: '#fff7ed', borderRadius: T.rSm, padding: 12, borderWidth: 1, borderColor: '#fed7aa', marginTop: 6, marginBottom: 4 },
  sinSaldoText:  { fontSize: 13, color: '#92400e', lineHeight: 18 },
  saldoErrorBox: { backgroundColor: '#fef2f2', borderRadius: T.rSm, padding: 12, borderWidth: 1, borderColor: '#fecaca', marginTop: 6, marginBottom: 4, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  saldoErrorText: { fontSize: 13, color: '#991b1b', lineHeight: 18, flex: 1 },
  saldoRetry:    { fontSize: 13, fontWeight: '700', color: '#991b1b', textDecorationLine: 'underline' },
  modalActions:  { flexDirection: 'row', gap: 10, marginTop: 20 },
  cancelBtn:     { flex: 1, paddingVertical: 13, borderRadius: T.rSm, borderWidth: 1, borderColor: T.border, alignItems: 'center', backgroundColor: T.white },
  cancelText:    { color: T.text, fontWeight: '600', fontSize: 14 },
  sendBtn:       { flex: 2, paddingVertical: 13, borderRadius: T.rSm, backgroundColor: T.blue, alignItems: 'center' },
  sendBtnDisabled: { opacity: 0.6 },
  sendText:      { color: '#fff', fontWeight: '700', fontSize: 15 },

  confirmOverlay: { flex: 1, backgroundColor: 'rgba(14,20,36,0.5)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  confirmCard:    { width: '100%', maxWidth: 420, backgroundColor: T.paper, borderRadius: T.rMd, padding: 22, ...T.sh3 },
  confirmTitle:   { fontSize: 18, fontWeight: '800', color: T.ink, marginBottom: 6 },
  confirmSubtitle:{ fontSize: 15, fontWeight: '700', color: T.blue, marginBottom: 12 },
  confirmWarning: { fontSize: 13, color: T.muted, lineHeight: 19, marginBottom: 4 },
});

// ── Estilos CotizacionClienteRow ──────────────────────────────────────────────
const cs = StyleSheet.create({
  card: {
    paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: T.border,
  },
  cardLast: { borderBottomWidth: 0 },

  badgeRow: { flexDirection: 'row', gap: 6, marginBottom: 10, flexWrap: 'wrap' },
  badgePrecio:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: '#fef9c3', borderWidth: 1, borderColor: '#fde047' },
  badgePrecioText: { fontSize: 11, fontWeight: '700', color: '#713f12' },
  badgeCalif:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: '#fffbeb', borderWidth: 1, borderColor: '#fcd34d' },
  badgeCaliText:   { fontSize: 11, fontWeight: '700', color: '#78350f' },

  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  avatar: { width: 48, height: 48, borderRadius: 24 },
  avatarFallback: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: T.deep, justifyContent: 'center', alignItems: 'center',
  },
  avatarInitial: { fontSize: 18, fontWeight: '800', color: '#fff' },

  provInfo:     { flex: 1 },
  provNombre:   { fontSize: 15, fontWeight: '700', color: T.ink, marginBottom: 3 },
  provRating:   { fontSize: 13, color: '#d97706', fontWeight: '700' },
  provSinRating:{ fontSize: 12, color: T.faint },

  monto: { fontSize: 22, fontWeight: '800', color: T.blue },

  mensaje: { fontSize: 14, color: T.text, lineHeight: 21, marginBottom: 8 },
  tiempo:  { fontSize: 11, color: T.faint },

  elegirBtn:     { marginTop: 12, backgroundColor: T.blue, borderRadius: T.rSm, paddingVertical: 11, alignItems: 'center' },
  elegirBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  aceptadaBadge: { marginTop: 12, backgroundColor: '#d1fae5', borderWidth: 1, borderColor: '#86efac', borderRadius: T.rSm, paddingVertical: 9, alignItems: 'center' },
  aceptadaText:  { color: '#065f46', fontWeight: '700', fontSize: 13 },
});
