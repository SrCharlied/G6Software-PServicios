import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  aceptarServicio,
  actualizarEstadoServicio,
  finalizarServicio,
  getCalificacionesProveedor,
  getCategorias,
  getDocumentos,
  getMiDisponibilidad,
  getPedidosAbiertos,
  getProviderByUser,
  getSolicitudesProveedor,
  iniciarServicio,
  rechazarServicio,
  saveDisponibilidad,
  uploadDocumento,
} from '../services/api';
import { useToast } from '../context/ToastContext';
import { T } from '../theme';

const DEPARTAMENTOS_GT = [
  'Alta Verapaz', 'Baja Verapaz', 'Chimaltenango', 'Chiquimula', 'El Progreso',
  'Escuintla', 'Guatemala', 'Huehuetenango', 'Izabal', 'Jalapa', 'Jutiapa',
  'Petén', 'Quetzaltenango', 'Quiché', 'Retalhuleu', 'Sacatepéquez',
  'San Marcos', 'Santa Rosa', 'Sololá', 'Suchitepéquez', 'Totonicapán', 'Zacapa',
];

const TIPOS_DOCUMENTO = [
  'DPI (Documento Personal de Identificacion)',
  'Pasaporte',
  'NIT (Numero de Identificacion Tributaria)',
  'Patente de Comercio',
  'Titulo Universitario',
  'Certificado de Antecedentes',
  'Otro',
];

const DIAS = [
  { id: 0, short: 'Dom', label: 'Domingo' },
  { id: 1, short: 'Lun', label: 'Lunes' },
  { id: 2, short: 'Mar', label: 'Martes' },
  { id: 3, short: 'Mie', label: 'Miercoles' },
  { id: 4, short: 'Jue', label: 'Jueves' },
  { id: 5, short: 'Vie', label: 'Viernes' },
  { id: 6, short: 'Sab', label: 'Sabado' },
];

const TABS = [
  { key: 'solicitudes',   label: 'Solicitudes' },
  { key: 'oportunidades', label: 'Oportunidades' },
  { key: 'mensajes',      label: 'Mensajes' },
  { key: 'historial',     label: 'Historial' },
  { key: 'calificaciones',label: 'Calificaciones' },
  { key: 'disponibilidad',label: 'Disponibilidad' },
];

const ESTADO_COLORES = {
  pendiente:   { bg: '#fef3c7', text: '#92400e' },
  aceptado:    { bg: '#d1fae5', text: '#065f46' },
  aprobado:    { bg: '#d1fae5', text: '#065f46' },
  en_camino:   { bg: '#dbeafe', text: '#1d4ed8' },
  en_progreso: { bg: '#ede9fe', text: '#5b21b6' },
  completado:  { bg: '#dcfce7', text: '#14532d' },
  rechazado:   { bg: '#fee2e2', text: '#991b1b' },
  cancelado:   { bg: '#f1f0eb', text: '#52525b' },
};

// ── Helpers ──────────────────────────────────────────────
const getGreeting = () => {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return 'Buenos días';
  if (h >= 12 && h < 19) return 'Buenas tardes';
  return 'Buenas noches';
};

const toMin = (hhmm) => {
  if (!hhmm) return 0;
  const [h, m] = String(hhmm).split(':').map((n) => Number(n));
  return (h || 0) * 60 + (m || 0);
};

const isAvailableNow = (disponibilidad) => {
  const now = new Date();
  const today = disponibilidad?.find((x) => x.dia_semana === now.getDay());
  if (!today || !today.disponible) return false;
  const cur = now.getHours() * 60 + now.getMinutes();
  return cur >= toMin(today.hora_inicio) && cur <= toMin(today.hora_fin);
};

const getAvailabilityText = (disponibilidad) => {
  const now = new Date();
  const today = disponibilidad?.find((x) => x.dia_semana === now.getDay());
  if (!today || !today.disponible) return 'No disponible hoy';
  const ini = (today.hora_inicio || '').slice(0, 5);
  const fin = (today.hora_fin || '').slice(0, 5);
  return isAvailableNow(disponibilidad)
    ? `Disponible ahora · ${ini} a ${fin}`
    : `Hoy · ${ini} a ${fin}`;
};

const emptyDay = (day) => ({
  dia_semana: day.id,
  disponible: false,
  hora_inicio: '08:00',
  hora_fin: '17:00',
});

const buildDisponibilidad = (items = []) =>
  DIAS.map((day) => {
    const existing = items.find((item) => Number(item.dia_semana) === day.id);
    return existing
      ? {
          dia_semana: day.id,
          disponible: Boolean(existing.disponible),
          hora_inicio: (existing.hora_inicio || '08:00').slice(0,5),
          hora_fin: (existing.hora_fin || '17:00').slice(0,5),
        }
      : emptyDay(day);
  });

const formatDate = (value) => {
  if (!value) return 'Sin fecha';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('es-GT', { dateStyle: 'medium', timeStyle: 'short' });
};

const formatCurrency = (value) => {
  if (value === null || value === undefined || value === '') return 'Sin monto';
  const number = Number(value);
  if (Number.isNaN(number)) return String(value);
  return `Q${number.toFixed(2)}`;
};

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

const CATEGORIA_ICONO = {
  electric: '⚡', plomeria: '🔧', fontaneria: '🔧', carpinteria: '🪚',
  pintura: '🎨', limpieza: '🧹', jardineria: '🌿', seguridad: '🔒',
  mecanica: '🔩', tecnologia: '💻', cocina: '🍳', transporte: '🚗',
  construccion: '🏗️', mudanza: '📦', ensamble: '🔨',
};

const getCatIcon = (nombre = '') => {
  const lower = nombre.toLowerCase();
  for (const [key, icon] of Object.entries(CATEGORIA_ICONO)) {
    if (lower.includes(key)) return icon;
  }
  return '📋';
};

const URGENCIA_CONFIG = {
  alta:  { label: 'URGENTE',  bg: '#fee2e2', text: '#991b1b', border: '#fca5a5' },
  media: { label: 'MEDIA',    bg: '#fef3c7', text: '#92400e', border: '#fde68a' },
  baja:  { label: 'BAJA',     bg: '#d1fae5', text: '#065f46', border: '#86efac' },
};

const getSlotIndicator = (pedido) => {
  const slotsGratis = pedido.slots_gratis;
  const slotsTotal  = pedido.slots_total ?? 3;
  if (slotsGratis != null) {
    if (slotsGratis > 0) {
      return { type: 'gratis', label: `Slot gratis (${slotsTotal - slotsGratis}/${slotsTotal})` };
    }
    return { type: 'credito', label: 'Costo: 1 crédito' };
  }
  const count = pedido.cotizaciones_count ?? 0;
  if (count < 3) {
    return { type: 'gratis', label: `Slot gratis (${count}/3)` };
  }
  return { type: 'credito', label: 'Costo: 1 crédito' };
};

const Stars = ({ value }) => (
  <View style={styles.starsRow}>
    {[1, 2, 3, 4, 5].map((star) => (
      <Text key={star} style={[styles.star, star <= value ? styles.starOn : styles.starOff]}>★</Text>
    ))}
  </View>
);

const StatusBadge = ({ estado }) => {
  const colors = ESTADO_COLORES[estado] || ESTADO_COLORES.pendiente;
  return (
    <View style={[styles.statusBadge, { backgroundColor: colors.bg }]}>
      <Text style={[styles.statusBadgeText, { color: colors.text }]}>
        {(estado || 'pendiente').replace(/_/g, ' ')}
      </Text>
    </View>
  );
};

// ── Time Picker (15-min steps) ───────────────────────────
function TimePickerModal({ visible, value, onSelect, onClose }) {
  const [hh, setHh] = useState(0);
  const [mm, setMm] = useState(0);

  useEffect(() => {
    if (!visible) return;
    const [h, m] = String(value || '08:00').split(':').map((n) => Number(n));
    setHh(Number.isFinite(h) ? h : 0);
    setMm([0, 15, 30, 45].includes(m) ? m : 0);
  }, [visible, value]);

  const fmt = (n) => String(n).padStart(2, '0');
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const mins = [0, 15, 30, 45];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.tpBackdrop} onPress={onClose}>
        <Pressable style={styles.tpCard} onPress={(e) => e.stopPropagation?.()}>
          <View style={styles.tpDisplay}>
            <Text style={styles.tpDisplayText}>{fmt(hh)}</Text>
            <Text style={styles.tpDisplaySep}>:</Text>
            <Text style={styles.tpDisplayText}>{fmt(mm)}</Text>
          </View>

          <Text style={styles.tpLabel}>Hora</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tpStrip}>
            {hours.map((h) => (
              <TouchableOpacity
                key={h}
                style={[styles.tpChip, h === hh && styles.tpChipSel]}
                onPress={() => setHh(h)}
              >
                <Text style={[styles.tpChipText, h === hh && styles.tpChipTextSel]}>{fmt(h)}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={styles.tpLabel}>Minutos (cada 15)</Text>
          <View style={[styles.tpStrip, { paddingHorizontal: 0 }]}>
            {mins.map((m) => (
              <TouchableOpacity
                key={m}
                style={[styles.tpChip, m === mm && styles.tpChipSel]}
                onPress={() => setMm(m)}
              >
                <Text style={[styles.tpChipText, m === mm && styles.tpChipTextSel]}>{fmt(m)}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.tpActions}>
            <TouchableOpacity style={styles.tpCancel} onPress={onClose}>
              <Text style={styles.tpCancelText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.tpOk} onPress={() => onSelect(`${fmt(hh)}:${fmt(mm)}`)}>
              <Text style={styles.tpOkText}>Confirmar</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const filtStyles = StyleSheet.create({
  // Category chips
  chipsRow:       { flexDirection: 'row', gap: 8, paddingVertical: 4 },
  chip: {
    paddingHorizontal: 13, paddingVertical: 7,
    borderRadius: 999, borderWidth: 1,
    borderColor: T.inputBorder, backgroundColor: T.white,
  },
  chipActive:     { backgroundColor: T.blue, borderColor: T.blue },
  chipMine:       { borderColor: T.deep, borderWidth: 1.5, backgroundColor: 'rgba(27,84,153,0.06)' },
  chipText:       { fontSize: 12, color: T.muted, fontWeight: '600' },
  chipTextActive: { color: '#fff' },
  chipMineText:   { color: T.deep },

  // Dept row
  deptRow:         { flexDirection: 'row', alignItems: 'center', gap: 8 },
  deptBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 13, paddingVertical: 10,
    borderRadius: T.rSm, borderWidth: 1, borderColor: T.inputBorder,
    backgroundColor: T.white,
  },
  deptBtnActive:    { borderColor: T.blue, backgroundColor: '#eef4ff' },
  deptBtnText:      { fontSize: 13, color: T.muted, flex: 1 },
  deptBtnTextActive:{ color: T.blue, fontWeight: '600' },
  deptArrow:        { fontSize: 11, color: T.faint, marginLeft: 4 },

  // Clear btn
  clearBtn:     { paddingHorizontal: 12, paddingVertical: 10 },
  clearBtnText: { fontSize: 13, color: T.danger, fontWeight: '600' },

  // Result count
  resultCount: { fontSize: 12, color: T.faint },

  // Empty state limpiar
  emptyLimpiarBtn:  { marginTop: 12, paddingHorizontal: 20, paddingVertical: 9, borderRadius: T.rSm, borderWidth: 1, borderColor: T.inputBorder },
  emptyLimpiarText: { fontSize: 13, color: T.muted, fontWeight: '600' },

  // Dept picker modal
  deptPickerSheet: {
    width: '100%', maxWidth: 380,
    backgroundColor: T.white, borderRadius: 16,
    padding: 20, maxHeight: '75%',
    ...T.sh3,
  },
  deptPickerTitle:      { fontSize: 16, fontWeight: '700', color: T.ink, marginBottom: 14 },
  deptOption:           { paddingVertical: 13, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: T.paper },
  deptOptionActive:     { backgroundColor: '#eef4ff', borderRadius: T.rSm, paddingHorizontal: 10 },
  deptOptionText:       { fontSize: 14, color: T.text },
  deptOptionTextActive: { color: T.blue, fontWeight: '700' },
});

const ocStyles = StyleSheet.create({
  card: {
    backgroundColor: T.white,
    borderRadius: T.rLg,
    padding: 16,
    borderWidth: 1,
    borderColor: T.border,
    ...T.sh2,
  },
  topRow:  { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  urgBadge: {
    paddingHorizontal: 9, paddingVertical: 3,
    borderRadius: 6, borderWidth: 1,
  },
  urgText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.4 },

  slotBadge: {
    marginLeft: 'auto',
    paddingHorizontal: 10, paddingVertical: 3,
    borderRadius: 6, borderWidth: 1,
  },
  slotGratis:     { backgroundColor: '#d1fae5', borderColor: '#86efac' },
  slotCredito:    { backgroundColor: '#fef9c3', borderColor: '#fde047' },
  slotText:       { fontSize: 11, fontWeight: '700' },
  slotGratisText: { color: '#065f46' },
  slotCreditoText:{ color: '#713f12' },

  desc: { fontSize: 14, color: T.text, lineHeight: 20, marginBottom: 10 },

  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' },
  catChip: {
    fontSize: 12, fontWeight: '600', color: T.deep,
    backgroundColor: 'rgba(69,137,212,0.10)',
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 999, overflow: 'hidden',
  },
  locText: { fontSize: 12, color: T.muted, flex: 1 },

  footer:     { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 10, borderTopWidth: 1, borderTopColor: T.border },
  timeText:   { fontSize: 11, color: T.faint, flex: 1 },
  budgetText: { fontSize: 13, fontWeight: '700', color: T.blue },
  arrowText:  { fontSize: 12, color: T.blue, fontWeight: '600' },
});

function OpportunityCard({ pedido, onPress }) {
  const urgCfg  = URGENCIA_CONFIG[pedido.urgencia] ?? URGENCIA_CONFIG.baja;
  const slot    = getSlotIndicator(pedido);
  const catIcon = getCatIcon(pedido.categoria?.nombre);

  return (
    <TouchableOpacity style={ocStyles.card} activeOpacity={0.86} onPress={onPress}>
      {/* Top row: urgency badge + slot indicator */}
      <View style={ocStyles.topRow}>
        <View style={[ocStyles.urgBadge, { backgroundColor: urgCfg.bg, borderColor: urgCfg.border }]}>
          <Text style={[ocStyles.urgText, { color: urgCfg.text }]}>{urgCfg.label}</Text>
        </View>
        <View style={[ocStyles.slotBadge, slot.type === 'gratis' ? ocStyles.slotGratis : ocStyles.slotCredito]}>
          <Text style={[ocStyles.slotText, slot.type === 'gratis' ? ocStyles.slotGratisText : ocStyles.slotCreditoText]}>
            {slot.label}
          </Text>
        </View>
      </View>

      {/* Description */}
      <Text style={ocStyles.desc} numberOfLines={2}>{pedido.descripcion || 'Sin descripción'}</Text>

      {/* Category + location row */}
      <View style={ocStyles.metaRow}>
        <Text style={ocStyles.catChip}>{catIcon} {pedido.categoria?.nombre || 'Sin categoría'}</Text>
        {pedido.direccion ? (
          <Text style={ocStyles.locText} numberOfLines={1}>📍 {pedido.direccion}</Text>
        ) : null}
      </View>

      {/* Footer: time + arrow */}
      <View style={ocStyles.footer}>
        <Text style={ocStyles.timeText}>{timeAgo(pedido.created_at)}</Text>
        {pedido.presupuesto ? (
          <Text style={ocStyles.budgetText}>{formatCurrency(pedido.presupuesto)}</Text>
        ) : null}
        <Text style={ocStyles.arrowText}>Ver detalle →</Text>
      </View>
    </TouchableOpacity>
  );
}

function ServicioCard({ servicio, onAccept, onReject, onAdvanceStatus, onIniciar, onFinalizar, compact = false }) {
  const estado    = servicio.estado;
  const canAccept = estado === 'pendiente';
  const canStart  = estado === 'aceptado';
  const canFinish = estado === 'en_progreso';
  const porConfirmar = estado === 'por_confirmar';

  return (
    <View style={[styles.serviceCard, compact && styles.serviceCardCompact]}>
      <View style={styles.serviceTopRow}>
        <View style={styles.serviceTopInfo}>
          <Text style={styles.serviceClient}>{servicio.cliente?.name || 'Cliente'}</Text>
          <Text style={styles.serviceCategory}>{servicio.categoria?.nombre || 'Servicio sin categoria'}</Text>
        </View>
        <StatusBadge estado={estado} />
      </View>

      <Text style={styles.serviceDescription}>{servicio.descripcion}</Text>

      <View style={styles.serviceMetaGrid}>
        <Text style={styles.serviceMeta}>Fecha: {formatDate(servicio.fecha_agendada || servicio.created_at)}</Text>
        <Text style={styles.serviceMeta}>Monto: {formatCurrency(servicio.monto_acordado)}</Text>
        <Text style={styles.serviceMeta}>Direccion: {servicio.direccion || 'Sin direccion'}</Text>
      </View>

      {servicio.motivo_cancelacion ? (
        <View style={styles.reasonBox}>
          <Text style={styles.reasonLabel}>Motivo</Text>
          <Text style={styles.reasonText}>{servicio.motivo_cancelacion}</Text>
        </View>
      ) : null}

      {porConfirmar && servicio.codigo_fin ? (
        <View style={styles.codigoFinBox}>
          <Text style={styles.codigoFinLabel}>Esperando confirmacion del cliente</Text>
          <Text style={styles.codigoFinValue}>{servicio.codigo_fin}</Text>
          <Text style={styles.codigoFinHint}>
            Dale este codigo al cliente para que confirme la finalizacion del servicio.
          </Text>
        </View>
      ) : null}

      {canAccept ? (
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.acceptBtn} onPress={() => onAccept(servicio.id)}>
            <Text style={styles.acceptBtnText}>Aceptar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.rejectBtn} onPress={() => onReject(servicio.id)}>
            <Text style={styles.rejectBtnText}>Rechazar</Text>
          </TouchableOpacity>
        </View>
      ) : canStart ? (
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.advanceBtn} onPress={() => onIniciar(servicio)}>
            <Text style={styles.advanceBtnText}>Iniciar servicio</Text>
          </TouchableOpacity>
        </View>
      ) : canFinish ? (
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.advanceBtn} onPress={() => onFinalizar(servicio)}>
            <Text style={styles.advanceBtnText}>Finalizar trabajo</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
}

export default function ProviderDashboardScreen({
  navigation, user, providerProfile, setProviderProfile, onLogout,
}) {
  const toast = useToast();
  const [profile, setProfile] = useState(providerProfile);
  const [documentos, setDocumentos] = useState([]);
  const [solicitudes, setSolicitudes] = useState([]);
  const [calificaciones, setCalificaciones] = useState([]);
  const [disponibilidad, setDisponibilidad] = useState(buildDisponibilidad());
  const [activeTab, setActiveTab] = useState('solicitudes');
  const [loadingProfile, setLoadingProfile] = useState(!providerProfile);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [loadingSolicitudes, setLoadingSolicitudes] = useState(false);
  const [loadingCalificaciones, setLoadingCalificaciones] = useState(false);
  const [loadingDisponibilidad, setLoadingDisponibilidad] = useState(false);
  const [oportunidades, setOportunidades] = useState([]);
  const [loadingOportunidades, setLoadingOportunidades] = useState(false);
  const [categorias, setCategorias] = useState([]);
  const [catFiltro, setCatFiltro] = useState(null);
  const [deptFiltro, setDeptFiltro] = useState('');
  const [showDeptPicker, setShowDeptPicker] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [savingDisponibilidad, setSavingDisponibilidad] = useState(false);
  const [mutatingServiceId, setMutatingServiceId] = useState(null);
  const [tipoDocumento, setTipoDocumento] = useState(TIPOS_DOCUMENTO[0]);
  const [showTipoSelector, setShowTipoSelector] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(null); // { day, which, value } | null
  const [iniciarTarget, setIniciarTarget] = useState(null); // servicio | null
  const [codigoInput, setCodigoInput] = useState('');
  const [codigoError, setCodigoError] = useState('');
  const [iniciando, setIniciando] = useState(false);
  const [finalizarTarget, setFinalizarTarget] = useState(null); // servicio | null
  const [codigoFinGenerado, setCodigoFinGenerado] = useState('');
  const [finalizando, setFinalizando] = useState(false);
  const [, setTick] = useState(0); // refresca el header cada minuto
  const fileInputRef = useRef(null);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60000);
    return () => clearInterval(id);
  }, []);

  const pendientes = useMemo(() => solicitudes.filter((i) => i.estado === 'pendiente'), [solicitudes]);
  const activas = useMemo(() => solicitudes.filter((i) => ['aceptado','en_camino','en_progreso','por_confirmar'].includes(i.estado)), [solicitudes]);
  const historial = useMemo(() => solicitudes.filter((i) => ['completado','rechazado','cancelado'].includes(i.estado)), [solicitudes]);
  const oportunidadesFiltradas = useMemo(() => {
    let list = oportunidades;
    if (catFiltro != null) {
      list = list.filter((p) => (p.categoria_id ?? p.categoria?.id) === catFiltro);
    }
    if (deptFiltro) {
      const lower = deptFiltro.toLowerCase();
      list = list.filter((p) => p.direccion?.toLowerCase().includes(lower));
    }
    return list;
  }, [oportunidades, catFiltro, deptFiltro]);

  const reviewAverage = useMemo(() => {
    if (calificaciones.length === 0) return Number(profile?.calificacion_promedio || 0);
    const total = calificaciones.reduce((s, i) => s + Number(i.puntuacion || 0), 0);
    return total / calificaciones.length;
  }, [calificaciones, profile?.calificacion_promedio]);

  const availableNow = isAvailableNow(disponibilidad);

  useEffect(() => {
    if (providerProfile) setProfile(providerProfile);
  }, [providerProfile]);

  useEffect(() => {
    if (!profile && user) { loadProfile(); return; }
    if (profile) loadDashboardData(profile);
  }, [user, profile?.id]);

  useEffect(() => {
    const multi = profile?.categorias;
    if (multi?.length === 1) {
      setCatFiltro(multi[0].id);
    } else if (!multi?.length) {
      const catId = profile?.categoria_id ?? profile?.categoria?.id;
      if (catId) setCatFiltro(catId);
    }
    // Con múltiples categorías no se fuerza ninguna; los chips ★ orientan al proveedor
  }, [profile?.categoria_id, profile?.categorias?.length]);

  useEffect(() => {
    if (activeTab === 'oportunidades') {
      if (oportunidades.length === 0 && !loadingOportunidades) refreshOportunidades();
      if (categorias.length === 0) loadCategorias();
    }
  }, [activeTab]);

  const loadProfile = async () => {
    setLoadingProfile(true);
    try {
      const data = await getProviderByUser(user.id);
      setProfile(data.proveedor);
      setProviderProfile(data.proveedor);
    } catch { setProfile(null); }
    finally { setLoadingProfile(false); }
  };

  const loadDashboardData = async (provider) => {
    setLoadingDocs(true); setLoadingSolicitudes(true);
    setLoadingCalificaciones(true); setLoadingDisponibilidad(true);
    try {
      const [docsData, solicitudesData, calificacionesData, disponibilidadData] = await Promise.all([
        getDocumentos(provider.id),
        getSolicitudesProveedor(),
        getCalificacionesProveedor(provider.id),
        getMiDisponibilidad(),
      ]);
      setDocumentos(docsData.documentos || []);
      setSolicitudes(solicitudesData.servicios || []);
      setCalificaciones(calificacionesData.calificaciones || []);
      setDisponibilidad(buildDisponibilidad(disponibilidadData.disponibilidad || []));
    } catch (error) { toast(error.message, 'error'); }
    finally {
      setLoadingDocs(false); setLoadingSolicitudes(false);
      setLoadingCalificaciones(false); setLoadingDisponibilidad(false);
    }
  };

  const refreshSolicitudes = async () => {
    setLoadingSolicitudes(true);
    try { const data = await getSolicitudesProveedor(); setSolicitudes(data.servicios || []); }
    catch (error) { toast(error.message, 'error'); }
    finally { setLoadingSolicitudes(false); }
  };

  const refreshCalificaciones = async () => {
    if (!profile) return;
    setLoadingCalificaciones(true);
    try { const data = await getCalificacionesProveedor(profile.id); setCalificaciones(data.calificaciones || []); }
    catch (error) { toast(error.message, 'error'); }
    finally { setLoadingCalificaciones(false); }
  };

  const refreshOportunidades = async () => {
    setLoadingOportunidades(true);
    try { const data = await getPedidosAbiertos(); setOportunidades(data.pedidos || []); }
    catch (error) { toast(error.message, 'error'); }
    finally { setLoadingOportunidades(false); }
  };

  const loadCategorias = async () => {
    try {
      const data = await getCategorias();
      setCategorias(data.categorias || data || []);
    } catch { /* silent — chips simplemente no aparecen */ }
  };

  const handleFileSelect = (event) => {
    const file = event.target?.files?.[0];
    if (file) handleUpload(file);
  };

  const handleUpload = async (file) => {
    if (!profile) return;
    setUploading(true);
    try {
      const data = await uploadDocumento(profile.id, file, tipoDocumento);
      setDocumentos((prev) => [data.documento, ...prev]);
      toast(`"${file.name}" subido correctamente.`, 'success');
    } catch (error) { toast(error.message, 'error'); }
    finally { setUploading(false); }
  };

  const handleAccept = async (id) => {
    setMutatingServiceId(id);
    try { await aceptarServicio(id); toast('Solicitud aceptada.', 'success'); await refreshSolicitudes(); }
    catch (error) { toast(error.message, 'error'); }
    finally { setMutatingServiceId(null); }
  };

  const handleReject = async (id) => {
    setMutatingServiceId(id);
    try { await rechazarServicio(id); toast('Solicitud rechazada.', 'info'); await refreshSolicitudes(); }
    catch (error) { toast(error.message, 'error'); }
    finally { setMutatingServiceId(null); }
  };

  const openIniciar = (servicio) => {
    setIniciarTarget(servicio);
    setCodigoInput('');
    setCodigoError('');
  };

  const closeIniciar = () => {
    if (iniciando) return;
    setIniciarTarget(null);
    setCodigoInput('');
    setCodigoError('');
  };

  const submitIniciar = async () => {
    if (!iniciarTarget) return;
    if (!/^\d{6}$/.test(codigoInput)) {
      setCodigoError('El codigo debe tener 6 digitos.');
      return;
    }
    setIniciando(true);
    setCodigoError('');
    try {
      await iniciarServicio(iniciarTarget.id, codigoInput);
      toast('Servicio iniciado.', 'success');
      setIniciarTarget(null);
      setCodigoInput('');
      await refreshSolicitudes();
    } catch (error) {
      setCodigoError(error.message);
    } finally {
      setIniciando(false);
    }
  };

  const openFinalizar = async (servicio) => {
    setFinalizarTarget(servicio);
    setCodigoFinGenerado('');
    setFinalizando(true);
    try {
      const data = await finalizarServicio(servicio.id);
      setCodigoFinGenerado(data?.codigo_fin || '');
      await refreshSolicitudes();
    } catch (error) {
      toast(error.message, 'error');
      setFinalizarTarget(null);
    } finally {
      setFinalizando(false);
    }
  };

  const closeFinalizar = () => {
    if (finalizando) return;
    setFinalizarTarget(null);
    setCodigoFinGenerado('');
  };

  const handleAdvanceStatus = async (id, estado) => {
    setMutatingServiceId(id);
    const labels = { en_camino: 'En camino.', en_progreso: 'Servicio en progreso.', completado: 'Servicio marcado como completado.' };
    try {
      await actualizarEstadoServicio(id, estado);
      toast(labels[estado] ?? 'Estado actualizado.', 'success');
      await refreshSolicitudes();
      if (estado === 'completado') await refreshCalificaciones();
    } catch (error) { toast(error.message, 'error'); }
    finally { setMutatingServiceId(null); }
  };

  const updateDay = (dayId, changes) => {
    setDisponibilidad((prev) => prev.map((i) => i.dia_semana === dayId ? { ...i, ...changes } : i));
  };

  const handleSaveDisponibilidad = async () => {
    setSavingDisponibilidad(true);
    try { await saveDisponibilidad(disponibilidad); toast('Horario semanal guardado correctamente.', 'success'); }
    catch (error) { toast(error.message, 'error'); }
    finally { setSavingDisponibilidad(false); }
  };

  // ── Renderers ──────────────────────────────────────────
  const HeaderBlock = ({ subtitle = null }) => (
    <LinearGradient
      colors={['#1b5499', '#2d6cb8', '#4589d4']}
      start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      style={styles.header}
    >
      <Text style={styles.headerGreet}>{getGreeting()}</Text>
      <Text style={styles.headerTitle}>{subtitle ?? (profile?.nombre || 'Mi panel')}</Text>
      <View style={styles.headerRow}>
        {profile ? (
          <View style={[styles.headerStatus, !availableNow && styles.headerStatusOff]}>
            <View style={[styles.headerStatusDot, !availableNow && styles.headerStatusDotOff]} />
            <Text style={styles.headerStatusText}>{getAvailabilityText(disponibilidad)}</Text>
          </View>
        ) : <View />}
        <View style={styles.headerActions}>
          {profile ? (
            <TouchableOpacity style={styles.headerGhostBtn} onPress={() => navigation.navigate('ProviderEditProfile')}>
              <Text style={styles.headerGhostBtnText}>Editar perfil</Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity style={styles.logoutBtn} onPress={onLogout}>
            <Text style={styles.logoutBtnText}>Salir</Text>
          </TouchableOpacity>
        </View>
      </View>
    </LinearGradient>
  );

  const renderMensajes = () => {
    const seen = {};
    solicitudes.forEach((s) => {
      if (s.cliente_id && s.cliente && !seen[s.cliente_id]) {
        seen[s.cliente_id] = { userId: s.cliente_id, name: s.cliente.name || 'Cliente' };
      }
    });
    const clientes = Object.values(seen);
    return (
      <View style={styles.sectionStack}>
        <Text style={styles.sectionTitle}>Conversaciones con clientes</Text>
        {loadingSolicitudes && clientes.length === 0 ? (
          <ActivityIndicator color={T.blue} style={styles.sectionLoader} />
        ) : clientes.length === 0 ? (
          <View style={styles.emptyState}><Text style={styles.emptyStateText}>Aún no tienes conversaciones. Aparecerán aquí cuando tengas solicitudes de clientes.</Text></View>
        ) : (
          clientes.map((c) => (
            <TouchableOpacity key={c.userId} style={styles.chatClientRow} activeOpacity={0.82}
              onPress={() => navigation.navigate('Chat', { chatWithUserId: c.userId, chatWithName: c.name })}>
              <View style={styles.chatClientAvatar}><Text style={styles.chatClientAvatarText}>{c.name.charAt(0).toUpperCase()}</Text></View>
              <Text style={styles.chatClientName}>{c.name}</Text>
              <Text style={styles.chatArrow}>→</Text>
            </TouchableOpacity>
          ))
        )}
      </View>
    );
  };

  if (loadingProfile) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={T.blue} />
        <Text style={styles.loadingText}>Cargando panel...</Text>
      </View>
    );
  }

  if (!profile) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <HeaderBlock subtitle="Mi panel" />
        <View style={styles.emptyCard}>
          <Text style={styles.emptyCardTitle}>Aun no tienes perfil de proveedor</Text>
          <Text style={styles.emptyCardText}>Completa tu perfil para recibir solicitudes y administrar disponibilidad.</Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => navigation.navigate('ProviderEditProfile')}>
            <Text style={styles.primaryBtnText}>Crear perfil</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  const renderSolicitudes = () => {
    if (loadingSolicitudes && solicitudes.length === 0) return <ActivityIndicator color={T.blue} style={styles.sectionLoader} />;
    return (
      <View style={styles.sectionStack}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Solicitudes entrantes</Text>
          <TouchableOpacity onPress={refreshSolicitudes}><Text style={styles.linkText}>Actualizar</Text></TouchableOpacity>
        </View>
        {pendientes.length === 0 ? (
          <View style={styles.emptyState}><Text style={styles.emptyStateText}>No tienes solicitudes pendientes.</Text></View>
        ) : (
          pendientes.map((s) => (
            <View key={s.id} style={mutatingServiceId === s.id && styles.disabledBlock}>
              <ServicioCard servicio={s} onAccept={handleAccept} onReject={handleReject} onAdvanceStatus={handleAdvanceStatus} onIniciar={openIniciar} onFinalizar={openFinalizar} />
            </View>
          ))
        )}
        <Text style={styles.subsectionTitle}>SERVICIOS ACTIVOS</Text>
        {activas.length === 0 ? (
          <View style={styles.emptyState}><Text style={styles.emptyStateText}>No tienes servicios en curso.</Text></View>
        ) : (
          activas.map((s) => (
            <View key={s.id} style={mutatingServiceId === s.id && styles.disabledBlock}>
              <ServicioCard servicio={s} onAccept={handleAccept} onReject={handleReject} onAdvanceStatus={handleAdvanceStatus} onIniciar={openIniciar} onFinalizar={openFinalizar} />
            </View>
          ))
        )}
      </View>
    );
  };

  const renderHistorial = () => (
    <View style={styles.sectionStack}>
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>Historial</Text>
        <Text style={styles.historyCounter}>{historial.length} registro(s)</Text>
      </View>
      {loadingSolicitudes && historial.length === 0 ? (
        <ActivityIndicator color={T.blue} style={styles.sectionLoader} />
      ) : historial.length === 0 ? (
        <View style={styles.emptyState}><Text style={styles.emptyStateText}>Aun no hay servicios finalizados o rechazados.</Text></View>
      ) : (
        historial.map((s) => (
          <ServicioCard key={s.id} servicio={s} onAccept={handleAccept} onReject={handleReject} onAdvanceStatus={handleAdvanceStatus} onIniciar={openIniciar} onFinalizar={openFinalizar} compact />
        ))
      )}
    </View>
  );

  const renderCalificaciones = () => (
    <View style={styles.sectionStack}>
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>Calificaciones</Text>
        <TouchableOpacity onPress={refreshCalificaciones}><Text style={styles.linkText}>Actualizar</Text></TouchableOpacity>
      </View>
      <View style={styles.ratingSummary}>
        <Text style={styles.ratingAverage}>{reviewAverage ? reviewAverage.toFixed(1) : '0.0'}</Text>
        <View>
          <Stars value={Math.round(reviewAverage || 0)} />
          <Text style={styles.ratingSummaryText}>{calificaciones.length || profile.total_calificaciones || 0} resena(s)</Text>
        </View>
      </View>
      {loadingCalificaciones && calificaciones.length === 0 ? (
        <ActivityIndicator color={T.blue} style={styles.sectionLoader} />
      ) : calificaciones.length === 0 ? (
        <View style={styles.emptyState}><Text style={styles.emptyStateText}>Aun no recibes calificaciones.</Text></View>
      ) : (
        calificaciones.map((c) => (
          <View key={c.id} style={styles.reviewCard}>
            <View style={styles.reviewHeader}>
              <Text style={styles.reviewAuthor}>{c.autor?.name || 'Usuario'}</Text>
              <Stars value={c.puntuacion} />
            </View>
            {c.comentario ? <Text style={styles.reviewComment}>{c.comentario}</Text> : <Text style={styles.reviewMuted}>Sin comentario escrito.</Text>}
          </View>
        ))
      )}
    </View>
  );

  const renderOportunidades = () => {
    const hasFilters = catFiltro != null || deptFiltro !== '';
    const providerCatIds = new Set([
      ...(profile?.categorias?.map((c) => c.id) ?? []),
      ...(profile?.categoria_id ? [profile.categoria_id] : []),
    ]);

    return (
      <View style={styles.sectionStack}>
        {/* Header */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Pedidos abiertos</Text>
          <TouchableOpacity onPress={refreshOportunidades}>
            <Text style={styles.linkText}>Actualizar</Text>
          </TouchableOpacity>
        </View>

        {/* Category chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={filtStyles.chipsRow}
        >
          <TouchableOpacity
            style={[filtStyles.chip, catFiltro == null && filtStyles.chipActive]}
            onPress={() => setCatFiltro(null)}
          >
            <Text style={[filtStyles.chipText, catFiltro == null && filtStyles.chipTextActive]}>
              Todas
            </Text>
          </TouchableOpacity>

          {categorias.map((cat) => {
            const active = catFiltro === cat.id;
            const isProviderCat = providerCatIds.has(cat.id);
            return (
              <TouchableOpacity
                key={cat.id}
                style={[filtStyles.chip, active && filtStyles.chipActive, isProviderCat && !active && filtStyles.chipMine]}
                onPress={() => setCatFiltro(active ? null : cat.id)}
              >
                <Text style={[filtStyles.chipText, active && filtStyles.chipTextActive, isProviderCat && !active && filtStyles.chipMineText]}>
                  {getCatIcon(cat.nombre)} {cat.nombre}
                  {isProviderCat ? ' ★' : ''}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Dept row */}
        <View style={filtStyles.deptRow}>
          <TouchableOpacity
            style={[filtStyles.deptBtn, deptFiltro !== '' && filtStyles.deptBtnActive]}
            onPress={() => setShowDeptPicker(true)}
          >
            <Text style={[filtStyles.deptBtnText, deptFiltro !== '' && filtStyles.deptBtnTextActive]}>
              {deptFiltro !== '' ? `📍 ${deptFiltro}` : '📍 Departamento'}
            </Text>
            <Text style={filtStyles.deptArrow}>▾</Text>
          </TouchableOpacity>

          {hasFilters && (
            <TouchableOpacity
              style={filtStyles.clearBtn}
              onPress={() => { setCatFiltro(null); setDeptFiltro(''); }}
            >
              <Text style={filtStyles.clearBtnText}>Limpiar filtros</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Results count */}
        {!loadingOportunidades && oportunidades.length > 0 && (
          <Text style={filtStyles.resultCount}>
            {oportunidadesFiltradas.length} resultado{oportunidadesFiltradas.length !== 1 ? 's' : ''}
            {hasFilters ? ' con filtros aplicados' : ''}
          </Text>
        )}

        {/* List */}
        <FlatList
          data={oportunidadesFiltradas}
          keyExtractor={(item) => String(item.id)}
          scrollEnabled={false}
          refreshControl={
            <RefreshControl
              refreshing={loadingOportunidades}
              onRefresh={refreshOportunidades}
              colors={[T.blue]}
              tintColor={T.blue}
            />
          }
          ListEmptyComponent={
            loadingOportunidades ? (
              <ActivityIndicator color={T.blue} style={styles.sectionLoader} />
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>
                  {hasFilters
                    ? 'No hay oportunidades con los filtros seleccionados.'
                    : 'No hay oportunidades nuevas en este momento.'}
                </Text>
                {hasFilters && (
                  <TouchableOpacity
                    style={filtStyles.emptyLimpiarBtn}
                    onPress={() => { setCatFiltro(null); setDeptFiltro(''); }}
                  >
                    <Text style={filtStyles.emptyLimpiarText}>Limpiar filtros</Text>
                  </TouchableOpacity>
                )}
              </View>
            )
          }
          renderItem={({ item }) => (
            <OpportunityCard pedido={item} onPress={() => navigation.navigate('PedidoDetail', { pedidoId: item.id })} />
          )}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        />
      </View>
    );
  };

  const renderDisponibilidad = () => (
    <View style={styles.sectionStack}>
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>Disponibilidad semanal</Text>
        {loadingDisponibilidad ? <ActivityIndicator color={T.blue} size="small" /> : null}
      </View>
      {disponibilidad.map((item) => {
        const day = DIAS.find((d) => d.id === item.dia_semana);
        return (
          <View key={item.dia_semana} style={[styles.scheduleRow, item.disponible && styles.scheduleRowOn]}>
            <TouchableOpacity
              style={[styles.dayToggle, item.disponible && styles.dayToggleActive]}
              onPress={() => updateDay(item.dia_semana, { disponible: !item.disponible })}
            >
              <Text style={[styles.dayToggleText, item.disponible && styles.dayToggleTextActive]}>
                {day?.label || `Dia ${item.dia_semana}`}
              </Text>
            </TouchableOpacity>
            <View style={styles.timeInputsRow}>
              <TouchableOpacity
                style={[styles.timePicker, !item.disponible && styles.timePickerDisabled]}
                disabled={!item.disponible}
                onPress={() => setPickerOpen({ day: item.dia_semana, which: 'inicio', value: item.hora_inicio })}
              >
                <Text style={[styles.timePickerValue, !item.disponible && styles.timePickerValueDisabled]}>{item.hora_inicio}</Text>
                <Text style={styles.timePickerArrow}>▾</Text>
              </TouchableOpacity>
              <Text style={styles.timeDivider}>a</Text>
              <TouchableOpacity
                style={[styles.timePicker, !item.disponible && styles.timePickerDisabled]}
                disabled={!item.disponible}
                onPress={() => setPickerOpen({ day: item.dia_semana, which: 'fin', value: item.hora_fin })}
              >
                <Text style={[styles.timePickerValue, !item.disponible && styles.timePickerValueDisabled]}>{item.hora_fin}</Text>
                <Text style={styles.timePickerArrow}>▾</Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      })}
      <TouchableOpacity
        style={[styles.primaryBtn, savingDisponibilidad && styles.primaryBtnDisabled]}
        onPress={handleSaveDisponibilidad}
        disabled={savingDisponibilidad}
      >
        {savingDisponibilidad ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Guardar disponibilidad</Text>}
      </TouchableOpacity>
    </View>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <HeaderBlock />

      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryNumber}>{pendientes.length}</Text>
          <Text style={styles.summaryLabel}>PENDIENTES</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryNumber}>{activas.length}</Text>
          <Text style={styles.summaryLabel}>ACTIVOS</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryNumber}>{profile.total_calificaciones || 0}</Text>
          <Text style={styles.summaryLabel}>RESEÑAS</Text>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Perfil publico</Text>
          <TouchableOpacity onPress={() => navigation.navigate('ProviderDetail', { provider: profile })}>
            <Text style={styles.linkText}>Ver como cliente</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.profileName}>{profile.nombre}</Text>
        <Text style={styles.profileDescription}>{profile.descripcion}</Text>
        <View style={styles.profileMetaWrap}>
          <Text style={styles.profileMeta}>{profile.categoria?.nombre || 'Sin categoria'}</Text>
          <Text style={styles.profileMeta}>{profile.departamento}</Text>
          {profile.tarifa_hora ? <Text style={styles.profileMeta}>Hora: {formatCurrency(profile.tarifa_hora)}</Text> : null}
          {profile.tarifa_proyecto ? <Text style={styles.profileMeta}>Proyecto: {formatCurrency(profile.tarifa_proyecto)}</Text> : null}
          {profile.nivel ? <Text style={styles.profileMeta}>Nivel: {profile.nivel}</Text> : null}
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Documentos de identidad</Text>
        <Text style={styles.cardSubtitle}>Sube documentos para validar tu identidad. Formatos: PDF, JPG, PNG.</Text>
        <TouchableOpacity style={styles.tipoSelector} onPress={() => setShowTipoSelector((p) => !p)}>
          <Text style={styles.tipoSelectorLabel}>Tipo:</Text>
          <Text style={styles.tipoSelectorValue} numberOfLines={1}>{tipoDocumento}</Text>
          <Text style={styles.tipoSelectorArrow}>{showTipoSelector ? '▴' : '▾'}</Text>
        </TouchableOpacity>
        {showTipoSelector ? (
          <View style={styles.tipoList}>
            {TIPOS_DOCUMENTO.map((tipo) => (
              <TouchableOpacity key={tipo}
                style={[styles.tipoOption, tipoDocumento === tipo && styles.tipoOptionActive]}
                onPress={() => { setTipoDocumento(tipo); setShowTipoSelector(false); }}>
                <Text style={[styles.tipoOptionText, tipoDocumento === tipo && styles.tipoOptionTextActive]}>{tipo}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : null}
        {Platform.OS === 'web' ? (
          <>
            <input ref={fileInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" style={{ display: 'none' }} onChange={handleFileSelect} />
            <TouchableOpacity style={styles.uploadBtn} onPress={() => fileInputRef.current?.click()} disabled={uploading}>
              {uploading ? <ActivityIndicator color="#fff" /> : <Text style={styles.uploadBtnText}>Subir documento</Text>}
            </TouchableOpacity>
          </>
        ) : (
          <View style={styles.uploadInfo}><Text style={styles.uploadInfoText}>La carga de archivos esta disponible en la version web.</Text></View>
        )}
        {loadingDocs ? (
          <ActivityIndicator color={T.blue} style={styles.sectionLoader} />
        ) : documentos.length === 0 ? (
          <Text style={styles.emptyInlineText}>Aun no has subido documentos.</Text>
        ) : (
          documentos.map((doc) => (
            <View key={doc.id} style={styles.documentRow}>
              <View style={styles.documentInfo}>
                <Text style={styles.documentType}>{doc.tipo_documento}</Text>
                <Text style={styles.documentName}>{doc.nombre_archivo}</Text>
              </View>
              <StatusBadge estado={doc.estado_validacion} />
            </View>
          ))
        )}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsRow}>
        {TABS.map((tab) => (
          <TouchableOpacity key={tab.key}
            style={[styles.tabBtn, activeTab === tab.key && styles.tabBtnActive]}
            onPress={() => setActiveTab(tab.key)}>
            <Text style={[styles.tabBtnText, activeTab === tab.key && styles.tabBtnTextActive]}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.card}>
        {activeTab === 'solicitudes'    && renderSolicitudes()}
        {activeTab === 'oportunidades'  && renderOportunidades()}
        {activeTab === 'mensajes'       && renderMensajes()}
        {activeTab === 'historial'      && renderHistorial()}
        {activeTab === 'calificaciones' && renderCalificaciones()}
        {activeTab === 'disponibilidad' && renderDisponibilidad()}
      </View>

      <TouchableOpacity style={styles.secondaryHomeBtn} onPress={() => navigation.navigate('Home')}>
        <Text style={styles.secondaryHomeBtnText}>Ver listado de proveedores</Text>
      </TouchableOpacity>

      <TimePickerModal
        visible={!!pickerOpen}
        value={pickerOpen?.value}
        onClose={() => setPickerOpen(null)}
        onSelect={(v) => {
          if (pickerOpen) {
            updateDay(pickerOpen.day, pickerOpen.which === 'inicio' ? { hora_inicio: v } : { hora_fin: v });
          }
          setPickerOpen(null);
        }}
      />

      <Modal visible={!!iniciarTarget} transparent animationType="fade" onRequestClose={closeIniciar}>
        <Pressable style={styles.codigoBackdrop} onPress={closeIniciar}>
          <Pressable style={styles.codigoSheet} onPress={() => {}}>
            <Text style={styles.codigoTitle}>Iniciar servicio</Text>
            <Text style={styles.codigoSubtitle}>
              Pide al cliente el codigo de 6 digitos para confirmar el inicio del servicio.
            </Text>
            <TextInput
              style={[styles.codigoTextInput, codigoError && styles.codigoInputError]}
              value={codigoInput}
              onChangeText={(v) => { setCodigoInput(v.replace(/\D/g, '').slice(0, 6)); setCodigoError(''); }}
              placeholder="000000"
              placeholderTextColor="#b9c2cc"
              keyboardType="number-pad"
              maxLength={6}
              autoFocus
            />
            {codigoError ? <Text style={styles.codigoErrorText}>{codigoError}</Text> : null}
            <View style={styles.codigoActions}>
              <TouchableOpacity style={styles.codigoCancelBtn} onPress={closeIniciar} disabled={iniciando}>
                <Text style={styles.codigoCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.codigoConfirmBtn, iniciando && styles.codigoConfirmBtnDisabled]}
                onPress={submitIniciar}
                disabled={iniciando}
              >
                {iniciando ? <ActivityIndicator color="#fff" /> : <Text style={styles.codigoConfirmText}>Confirmar</Text>}
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={showDeptPicker} transparent animationType="fade" onRequestClose={() => setShowDeptPicker(false)}>
        <Pressable style={styles.codigoBackdrop} onPress={() => setShowDeptPicker(false)}>
          <Pressable style={filtStyles.deptPickerSheet} onPress={() => {}}>
            <Text style={filtStyles.deptPickerTitle}>Filtrar por departamento</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              <TouchableOpacity
                style={[filtStyles.deptOption, deptFiltro === '' && filtStyles.deptOptionActive]}
                onPress={() => { setDeptFiltro(''); setShowDeptPicker(false); }}
              >
                <Text style={[filtStyles.deptOptionText, deptFiltro === '' && filtStyles.deptOptionTextActive]}>
                  Todos los departamentos
                </Text>
              </TouchableOpacity>
              {DEPARTAMENTOS_GT.map((dept) => (
                <TouchableOpacity
                  key={dept}
                  style={[filtStyles.deptOption, deptFiltro === dept && filtStyles.deptOptionActive]}
                  onPress={() => { setDeptFiltro(dept); setShowDeptPicker(false); }}
                >
                  <Text style={[filtStyles.deptOptionText, deptFiltro === dept && filtStyles.deptOptionTextActive]}>
                    {dept}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={!!finalizarTarget} transparent animationType="fade" onRequestClose={closeFinalizar}>
        <Pressable style={styles.codigoBackdrop} onPress={closeFinalizar}>
          <Pressable style={styles.codigoSheet} onPress={() => {}}>
            <Text style={styles.codigoTitle}>Trabajo finalizado</Text>
            <Text style={styles.codigoSubtitle}>
              Dale este codigo al cliente para que confirme la finalizacion del servicio.
            </Text>
            {finalizando ? (
              <View style={styles.codigoFinModalLoader}>
                <ActivityIndicator size="large" color={T.blue} />
              </View>
            ) : codigoFinGenerado ? (
              <View style={styles.codigoFinModalBox}>
                <Text style={styles.codigoFinModalValue}>{codigoFinGenerado}</Text>
              </View>
            ) : null}
            <Text style={styles.codigoFinModalHint}>
              El servicio se marcara como completado cuando el cliente ingrese este codigo.
            </Text>
            <View style={styles.codigoActions}>
              <TouchableOpacity
                style={[styles.codigoConfirmBtn, finalizando && styles.codigoConfirmBtnDisabled]}
                onPress={closeFinalizar}
                disabled={finalizando}
              >
                <Text style={styles.codigoConfirmText}>Entendido</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.canvas },
  content: { padding: T.s4, paddingBottom: 40 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 16, color: T.muted },

  codigoBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  codigoSheet: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 16,
  },
  codigoTitle:    { fontSize: 18, fontWeight: '800', color: '#1a1a2e', marginBottom: 6 },
  codigoSubtitle: { fontSize: 13, color: '#667085', marginBottom: 18, lineHeight: 18 },
  codigoTextInput: {
    backgroundColor: '#f7f9fc',
    borderWidth: 1,
    borderColor: '#d9e2ef',
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: 8,
    textAlign: 'center',
    color: '#0e1424',
  },
  codigoInputError:  { borderColor: '#c0392b', backgroundColor: '#fff5f5' },
  codigoErrorText:   { color: '#c0392b', fontSize: 12, marginTop: 6 },
  codigoActions:     { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 18 },
  codigoCancelBtn:   { paddingVertical: 11, paddingHorizontal: 16 },
  codigoCancelText:  { color: '#667085', fontWeight: '600', fontSize: 15 },
  codigoConfirmBtn:  { backgroundColor: '#4589d4', paddingVertical: 11, paddingHorizontal: 22, borderRadius: 8, minWidth: 110, alignItems: 'center' },
  codigoConfirmBtnDisabled: { opacity: 0.6 },
  codigoConfirmText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  codigoFinModalLoader: { paddingVertical: 30, alignItems: 'center' },
  codigoFinModalBox: {
    marginTop: 6,
    backgroundColor: '#e3f0ff',
    borderRadius: 10,
    paddingVertical: 22,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  codigoFinModalValue: {
    fontSize: 40,
    fontWeight: '800',
    color: '#0e1424',
    letterSpacing: 10,
  },
  codigoFinModalHint: {
    marginTop: 14,
    fontSize: 12,
    color: '#667085',
    textAlign: 'center',
    lineHeight: 17,
  },

  codigoFinBox: {
    marginTop: 12,
    backgroundColor: '#fff4e0',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
  },
  codigoFinLabel: { fontSize: 11, color: '#b76e00', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6 },
  codigoFinValue: { fontSize: 28, fontWeight: '800', color: '#0e1424', letterSpacing: 6, marginTop: 4 },
  codigoFinHint:  { fontSize: 11, color: '#7a5200', marginTop: 6, textAlign: 'center' },

  // Header gradient
  header: {
    borderRadius: T.rLg,
    paddingHorizontal: 22,
    paddingVertical: 20,
    marginBottom: T.s4,
    overflow: 'hidden',
    ...T.sh1,
  },
  headerGreet: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.78)', letterSpacing: 0.3 },
  headerTitle: { marginTop: 4, fontSize: 24, fontWeight: '800', color: '#fff', letterSpacing: -0.4, lineHeight: 28 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 12, marginTop: 14 },
  headerStatus: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 13, paddingVertical: 7,
    borderRadius: 999, borderWidth: 1, borderColor: 'rgba(255,255,255,0.20)',
  },
  headerStatusOff: { backgroundColor: 'rgba(255,255,255,0.12)' },
  headerStatusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#22d3a8' },
  headerStatusDotOff: { backgroundColor: '#fda4af' },
  headerStatusText: { fontSize: 12, fontWeight: '600', color: '#fff' },
  headerActions: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  headerGhostBtn: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)',
    paddingHorizontal: 14, paddingVertical: 9, borderRadius: T.rSm,
  },
  headerGhostBtnText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  logoutBtn: { backgroundColor: '#fff', paddingHorizontal: 14, paddingVertical: 9, borderRadius: T.rSm },
  logoutBtnText: { color: T.deep, fontWeight: '700', fontSize: 13 },

  emptyCard: { backgroundColor: T.white, borderRadius: 12, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: T.border },
  emptyCardTitle: { fontSize: 18, fontWeight: '700', color: T.ink, marginBottom: 8 },
  emptyCardText: { fontSize: 14, color: T.muted, textAlign: 'center', marginBottom: 18, lineHeight: 20 },

  // Summary
  summaryRow: { flexDirection: 'row', gap: T.s3, marginBottom: T.s4 },
  summaryCard: { flex: 1, backgroundColor: T.white, borderRadius: T.rMd, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: T.border, ...T.sh1 },
  summaryNumber: { fontSize: 28, fontWeight: '800', color: T.blue, letterSpacing: -0.6 },
  summaryLabel: { marginTop: 6, fontSize: 11, color: T.muted, fontWeight: '700', letterSpacing: 0.5 },

  // Card
  card: { backgroundColor: T.white, borderRadius: T.rMd, padding: T.s4, marginBottom: T.s4, borderWidth: 1, borderColor: T.border, ...T.sh1 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 10 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: T.ink, letterSpacing: -0.2 },
  cardSubtitle: { fontSize: 13, color: T.muted, marginBottom: 12, lineHeight: 18 },
  linkText: { color: T.blue, fontWeight: '700', fontSize: 13 },

  // Profile
  profileName: { fontSize: 18, fontWeight: '700', color: T.ink, marginBottom: 8 },
  profileDescription: { fontSize: 14, color: T.text, lineHeight: 20, opacity: 0.78 },
  profileMetaWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  profileMeta: { backgroundColor: 'rgba(69,137,212,0.10)', color: T.deep, fontSize: 12, fontWeight: '600', paddingHorizontal: 11, paddingVertical: 6, borderRadius: 999, overflow: 'hidden' },

  // Documentos
  tipoSelector: { flexDirection: 'row', alignItems: 'center', backgroundColor: T.paper, borderWidth: 1, borderColor: T.inputBorder, borderRadius: T.rSm, paddingHorizontal: 13, paddingVertical: 11, marginBottom: 8, gap: 8 },
  tipoSelectorLabel: { fontSize: 13, fontWeight: '600', color: T.muted },
  tipoSelectorValue: { flex: 1, fontSize: 13, color: T.text },
  tipoSelectorArrow: { fontSize: 12, color: T.faint },
  tipoList: { backgroundColor: T.white, borderWidth: 1, borderColor: T.inputBorder, borderRadius: T.rSm, marginBottom: 12, overflow: 'hidden' },
  tipoOption: { paddingHorizontal: 14, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: T.paper },
  tipoOptionActive: { backgroundColor: 'rgba(69,137,212,0.08)' },
  tipoOptionText: { fontSize: 13, color: T.text },
  tipoOptionTextActive: { color: T.deep, fontWeight: '600' },
  uploadBtn: { backgroundColor: T.blue, padding: 13, borderRadius: T.rSm, alignItems: 'center', marginBottom: 16 },
  uploadBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  uploadInfo: { borderWidth: 1, borderColor: T.inputBorder, borderRadius: T.rSm, padding: 12, marginBottom: 12, backgroundColor: T.paper },
  uploadInfoText: { color: T.muted, fontSize: 13 },
  documentRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: T.paper },
  documentInfo: { flex: 1 },
  documentType: { fontSize: 12, fontWeight: '700', color: T.ink, marginBottom: 3 },
  documentName: { fontSize: 13, color: T.muted },
  emptyInlineText: { fontSize: 14, color: T.faint, textAlign: 'center', paddingVertical: 12 },

  // Tabs
  tabsRow: { gap: 8, paddingBottom: 12 },
  tabBtn: { backgroundColor: T.white, borderWidth: 1, borderColor: T.border, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 999 },
  tabBtnActive: { backgroundColor: T.blue, borderColor: T.blue, ...T.sh2 },
  tabBtnText: { color: T.muted, fontWeight: '600', fontSize: 13 },
  tabBtnTextActive: { color: '#fff' },

  // Sections
  sectionStack: { gap: 12 },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: T.ink, letterSpacing: -0.2 },
  subsectionTitle: { fontSize: 13, fontWeight: '700', color: T.muted, marginTop: 12, letterSpacing: 0.6 },
  historyCounter: { fontSize: 13, color: T.muted, fontWeight: '500' },
  sectionLoader: { marginVertical: 12 },
  emptyState: { borderWidth: 1, borderColor: T.inputBorder, borderStyle: 'dashed', borderRadius: T.rMd, padding: 20, alignItems: 'center', backgroundColor: T.white },
  emptyStateText: { fontSize: 14, color: T.muted, textAlign: 'center', lineHeight: 20 },

  // Service card
  serviceCard: { borderWidth: 1, borderColor: T.border, borderRadius: T.rMd, padding: 16, backgroundColor: T.white },
  serviceCardCompact: { backgroundColor: T.white },
  serviceTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 12 },
  serviceTopInfo: { flex: 1 },
  serviceClient: { fontSize: 15, fontWeight: '700', color: T.ink },
  serviceCategory: { fontSize: 12, color: T.muted, marginTop: 3 },
  statusBadge: { borderRadius: 999, paddingHorizontal: 11, paddingVertical: 5 },
  statusBadgeText: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize', letterSpacing: 0.2 },
  serviceDescription: { fontSize: 14, color: T.text, lineHeight: 21, marginBottom: 12, opacity: 0.82 },
  serviceMetaGrid: { gap: 4, paddingTop: 12, borderTopWidth: 1, borderTopColor: T.paper },
  serviceMeta: { fontSize: 12, color: T.muted },

  reasonBox: { marginTop: 12, padding: 12, borderRadius: T.rSm, backgroundColor: '#fef2f2', borderLeftWidth: 3, borderLeftColor: T.danger },
  reasonLabel: { fontSize: 10, fontWeight: '700', color: '#991b1b', marginBottom: 3, letterSpacing: 0.6 },
  reasonText: { fontSize: 13, color: '#991b1b', lineHeight: 18 },

  actionRow: { flexDirection: 'row', gap: 8, marginTop: 16, flexWrap: 'wrap' },
  acceptBtn: { backgroundColor: T.success, paddingHorizontal: 16, paddingVertical: 10, borderRadius: T.rSm },
  acceptBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  rejectBtn: { backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fee2e2', paddingHorizontal: 16, paddingVertical: 10, borderRadius: T.rSm },
  rejectBtnText: { color: T.danger, fontWeight: '700', fontSize: 13 },
  advanceBtn: { backgroundColor: T.blue, paddingHorizontal: 16, paddingVertical: 10, borderRadius: T.rSm },
  advanceBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  disabledBlock: { opacity: 0.6 },

  // Rating
  ratingSummary: { flexDirection: 'row', alignItems: 'center', gap: 16, padding: 20, borderRadius: T.rMd, backgroundColor: T.white, borderWidth: 1, borderColor: T.border, borderLeftWidth: 4, borderLeftColor: T.blue },
  ratingAverage: { fontSize: 42, fontWeight: '800', color: T.blue, letterSpacing: -1.4 },
  ratingSummaryText: { fontSize: 13, color: T.muted, marginTop: 4 },
  starsRow: { flexDirection: 'row', gap: 2 },
  star: { fontSize: 16, fontWeight: '700' },
  starOn: { color: T.amber },
  starOff: { color: '#cbd5e1' },

  reviewCard: { borderWidth: 1, borderColor: T.border, borderRadius: T.rMd, padding: 16, backgroundColor: T.white },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 8 },
  reviewAuthor: { fontSize: 14, fontWeight: '700', color: T.ink },
  reviewComment: { fontSize: 14, color: T.text, lineHeight: 20, opacity: 0.82 },
  reviewMuted: { fontSize: 13, color: T.faint, fontStyle: 'italic' },

  // Schedule
  scheduleRow: { borderWidth: 1, borderColor: T.border, borderRadius: T.rMd, padding: 12, gap: 10, backgroundColor: T.white },
  scheduleRowOn: { borderColor: T.soft, backgroundColor: T.white },
  dayToggle: { borderWidth: 1, borderColor: T.inputBorder, borderRadius: T.rSm, paddingVertical: 10, paddingHorizontal: 14, backgroundColor: T.white },
  dayToggleActive: { backgroundColor: '#ecfdf5', borderColor: '#86efac' },
  dayToggleText: { fontSize: 14, fontWeight: '600', color: T.muted },
  dayToggleTextActive: { color: '#065f46' },

  timeInputsRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  timePicker: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: T.white, borderWidth: 1, borderColor: T.inputBorder,
    borderRadius: T.rSm, paddingHorizontal: 12, paddingVertical: 10,
  },
  timePickerDisabled: { backgroundColor: '#f3f2ec', borderColor: T.inputBorder },
  timePickerValue: { fontSize: 14, fontWeight: '600', color: T.text },
  timePickerValueDisabled: { color: T.faint },
  timePickerArrow: { fontSize: 11, color: T.faint },
  timeDivider: { color: T.muted, fontSize: 13, fontWeight: '600' },

  primaryBtn: { backgroundColor: T.blue, padding: 14, borderRadius: T.rSm, alignItems: 'center', marginTop: 8 },
  primaryBtnDisabled: { opacity: 0.7 },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  secondaryHomeBtn: { backgroundColor: T.paper, padding: 14, borderRadius: T.rSm, alignItems: 'center', borderWidth: 1, borderColor: T.border },
  secondaryHomeBtnText: { color: T.ink, fontWeight: '700', fontSize: 14 },

  // Chat
  chatClientRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: T.white, borderRadius: T.rMd, paddingHorizontal: 16, paddingVertical: 12, borderWidth: 1, borderColor: T.border, gap: 12 },
  chatClientAvatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: T.blue, justifyContent: 'center', alignItems: 'center' },
  chatClientAvatarText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  chatClientName: { flex: 1, fontSize: 15, fontWeight: '600', color: T.ink },
  chatArrow: { fontSize: 18, color: T.blue, fontWeight: '700' },

  // Time picker modal
  tpBackdrop: { flex: 1, backgroundColor: 'rgba(14,20,36,0.45)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  tpCard: { width: '100%', maxWidth: 340, backgroundColor: T.white, borderRadius: T.rMd, padding: 20, ...T.sh3 },
  tpDisplay: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, marginBottom: 16 },
  tpDisplayText: { fontSize: 32, fontWeight: '800', color: T.ink, letterSpacing: -1 },
  tpDisplaySep: { fontSize: 32, fontWeight: '700', color: T.muted },
  tpLabel: { fontSize: 10, fontWeight: '700', color: T.muted, textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 8, marginBottom: 6 },
  tpStrip: { flexDirection: 'row', gap: 4, paddingVertical: 4 },
  tpChip: { minWidth: 44, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: T.inputBorder, backgroundColor: T.white, alignItems: 'center' },
  tpChipSel: { backgroundColor: T.blue, borderColor: T.blue },
  tpChipText: { fontSize: 13, fontWeight: '600', color: T.text },
  tpChipTextSel: { color: '#fff' },
  tpActions: { flexDirection: 'row', gap: 8, marginTop: 16 },
  tpCancel: { flex: 1, paddingVertical: 12, borderRadius: T.rSm, borderWidth: 1, borderColor: T.border, alignItems: 'center', backgroundColor: T.white },
  tpCancelText: { color: T.text, fontWeight: '600', fontSize: 14 },
  tpOk: { flex: 1, paddingVertical: 12, borderRadius: T.rSm, alignItems: 'center', backgroundColor: T.blue },
  tpOkText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});