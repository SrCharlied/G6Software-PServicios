// Presentacion del Centro de seguridad (Sprint 9). Los estados vienen del
// backend; aqui solo se traducen a etiqueta y variante de StatusChip. El
// estado del REPORTE y el del SERVICIO son conceptos distintos y nunca se
// mezclan en una misma etiqueta.

export const REPORTE_ESTADOS = {
  recibido: { label: 'Recibido', variant: 'warn' },
  en_revision: { label: 'En revisión', variant: 'info' },
  resuelto: { label: 'Resuelto', variant: 'success' },
  descartado: { label: 'Descartado', variant: 'neutral' },
};

export const SERVICIO_ESTADOS = {
  pendiente: { label: 'Pendiente', variant: 'neutral' },
  aceptado: { label: 'Aceptado', variant: 'info' },
  en_camino: { label: 'En camino', variant: 'info' },
  en_progreso: { label: 'En progreso', variant: 'info' },
  por_confirmar: { label: 'Por confirmar', variant: 'warn' },
  completado: { label: 'Completado', variant: 'success' },
  cancelado: { label: 'Cancelado', variant: 'neutral' },
  rechazado: { label: 'Rechazado', variant: 'neutral' },
  interrumpido_seguridad: { label: 'Interrumpido por seguridad', variant: 'danger' },
};

export const CATEGORIAS = {
  amenaza_o_acoso: 'Amenaza o acoso',
  conducta_inapropiada: 'Conducta inapropiada',
  robo_o_dano: 'Robo o daño',
  emergencia: 'Emergencia',
  otro: 'Otro',
};

export const FILTROS_ESTADO = [
  { key: null, label: 'Todos' },
  { key: 'recibido', label: 'Recibido' },
  { key: 'en_revision', label: 'En revisión' },
  { key: 'resuelto', label: 'Resuelto' },
  { key: 'descartado', label: 'Descartado' },
];

export const ETIQUETA_TRANSICION = {
  en_revision: 'Pasar a en revisión',
  resuelto: 'Marcar como resuelto',
  descartado: 'Descartar reporte',
};

// Un estado desconocido nunca se oculta ni se disfraza de otro: se muestra tal cual.
export const chipDeReporte = (estado) => REPORTE_ESTADOS[estado] ?? { label: String(estado ?? '—'), variant: 'neutral' };
export const chipDeServicio = (estado) => SERVICIO_ESTADOS[estado] ?? { label: String(estado ?? '—'), variant: 'neutral' };
export const etiquetaCategoria = (categoria) => CATEGORIAS[categoria] ?? String(categoria ?? '—');

export const formatoFecha = (valor) => {
  if (!valor) return 'Sin fecha';
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return 'Sin fecha';
  return fecha.toLocaleString('es-GT', { dateStyle: 'medium', timeStyle: 'short' });
};

export const formatoTamano = (bytes) => {
  const n = Number(bytes || 0);
  if (n >= 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(n / 1024))} KB`;
};
