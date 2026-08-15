// Constantes y helpers del panel de proveedor.
//
// Se extrajeron de ProviderDashboardScreen sin cambiar su comportamiento, para
// que las tarjetas, los paneles y los modales puedan importarlos sin arrastrar
// la pantalla completa.

export const DEPARTAMENTOS_GT = [
  'Alta Verapaz', 'Baja Verapaz', 'Chimaltenango', 'Chiquimula', 'El Progreso',
  'Escuintla', 'Guatemala', 'Huehuetenango', 'Izabal', 'Jalapa', 'Jutiapa',
  'Petén', 'Quetzaltenango', 'Quiché', 'Retalhuleu', 'Sacatepéquez',
  'San Marcos', 'Santa Rosa', 'Sololá', 'Suchitepéquez', 'Totonicapán', 'Zacapa',
];

export const TIPOS_DOCUMENTO = [
  'DPI (Documento Personal de Identificacion)',
  'Pasaporte',
  'NIT (Numero de Identificacion Tributaria)',
  'Patente de Comercio',
  'Titulo Universitario',
  'Certificado de Antecedentes',
  'Otro',
];

export const DIAS = [
  { id: 0, short: 'Dom', label: 'Domingo' },
  { id: 1, short: 'Lun', label: 'Lunes' },
  { id: 2, short: 'Mar', label: 'Martes' },
  { id: 3, short: 'Mie', label: 'Miercoles' },
  { id: 4, short: 'Jue', label: 'Jueves' },
  { id: 5, short: 'Vie', label: 'Viernes' },
  { id: 6, short: 'Sab', label: 'Sabado' },
];

export const TABS = [
  { key: 'solicitudes',    label: 'Solicitudes' },
  { key: 'oportunidades',  label: 'Oportunidades' },
  { key: 'mensajes',       label: 'Mensajes' },
  { key: 'historial',      label: 'Historial' },
  { key: 'calificaciones', label: 'Calificaciones' },
  { key: 'disponibilidad', label: 'Disponibilidad' },
];

export const ESTADO_COLORES = {
  pendiente:   { bg: '#fef3c7', text: '#92400e' },
  aceptado:    { bg: '#d1fae5', text: '#065f46' },
  aprobado:    { bg: '#d1fae5', text: '#065f46' },
  en_camino:   { bg: '#dbeafe', text: '#1d4ed8' },
  en_progreso: { bg: '#ede9fe', text: '#5b21b6' },
  completado:  { bg: '#dcfce7', text: '#14532d' },
  rechazado:   { bg: '#fee2e2', text: '#991b1b' },
  cancelado:   { bg: '#f1f0eb', text: '#52525b' },
};

export const URGENCIA_CONFIG = {
  alta:  { label: 'URGENTE',  bg: '#fee2e2', text: '#991b1b', border: '#fca5a5' },
  media: { label: 'MEDIA',    bg: '#fef3c7', text: '#92400e', border: '#fde68a' },
  baja:  { label: 'BAJA',     bg: '#d1fae5', text: '#065f46', border: '#86efac' },
};

// ── Helpers ──────────────────────────────────────────────

export const getGreeting = () => {
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

export const isAvailableNow = (disponibilidad) => {
  const now = new Date();
  const today = disponibilidad?.find((x) => x.dia_semana === now.getDay());
  if (!today || !today.disponible) return false;
  const cur = now.getHours() * 60 + now.getMinutes();
  return cur >= toMin(today.hora_inicio) && cur <= toMin(today.hora_fin);
};

export const getAvailabilityText = (disponibilidad) => {
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

export const buildDisponibilidad = (items = []) =>
  DIAS.map((day) => {
    const existing = items.find((item) => Number(item.dia_semana) === day.id);
    return existing
      ? {
          dia_semana: day.id,
          disponible: Boolean(existing.disponible),
          hora_inicio: (existing.hora_inicio || '08:00').slice(0, 5),
          hora_fin: (existing.hora_fin || '17:00').slice(0, 5),
        }
      : emptyDay(day);
  });

export const formatDate = (value) => {
  if (!value) return 'Sin fecha';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('es-GT', { dateStyle: 'medium', timeStyle: 'short' });
};

export const formatCurrency = (value) => {
  if (value === null || value === undefined || value === '') return 'Sin monto';
  const number = Number(value);
  if (Number.isNaN(number)) return String(value);
  return `Q${number.toFixed(2)}`;
};

export const timeAgo = (iso) => {
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

export const getCatIcon = (nombre = '') => {
  const lower = nombre.toLowerCase();
  for (const [key, icon] of Object.entries(CATEGORIA_ICONO)) {
    if (lower.includes(key)) return icon;
  }
  return '📋';
};

/**
 * Indica si la proxima cotizacion del pedido es gratuita o cuesta 1 credito.
 * El backend manda `slots_gratis` cuando puede calcularlo; si no viene, se
 * deriva del conteo de cotizaciones con la misma regla de 3 gratis.
 */
export const getSlotIndicator = (pedido) => {
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
