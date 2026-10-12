// Presentacion de los estados de la bolsa de materiales (Sprint 9).
// Los estados vienen del backend; aqui solo se traducen a etiqueta y variante
// de StatusChip. No hay reglas de negocio: las acciones permitidas de una
// reserva las calcula el backend (`reserva.acciones`).

export const LOTE_ESTADOS = {
  disponible: { label: 'Disponible', variant: 'success' },
  reservado: { label: 'Reservado', variant: 'warn' },
  vendido: { label: 'Vendido', variant: 'neutral' },
  retirado: { label: 'Retirado', variant: 'neutral' },
};

export const RESERVA_ESTADOS = {
  pendiente: { label: 'Pendiente', variant: 'warn' },
  aceptada: { label: 'Aceptada', variant: 'success' },
  rechazada: { label: 'Rechazada', variant: 'danger' },
  cancelada: { label: 'Cancelada', variant: 'neutral' },
};

// Un estado desconocido nunca se oculta ni se disfraza de otro: se muestra tal cual.
export const chipDeLote = (estado) => LOTE_ESTADOS[estado] ?? { label: String(estado ?? '—'), variant: 'neutral' };
export const chipDeReserva = (estado) => RESERVA_ESTADOS[estado] ?? { label: String(estado ?? '—'), variant: 'neutral' };

// Textos de confirmacion de cada accion sobre lotes y reservas.
export const TEXTOS_ACCION = {
  retirar: {
    titulo: 'Retirar lote',
    mensaje: 'El lote dejará de estar visible y se rechazarán las solicitudes pendientes. Esta acción no se puede deshacer.',
    confirmar: 'Sí, retirar',
    exito: 'Lote retirado.',
    kind: 'danger',
  },
  vendido: {
    titulo: 'Marcar como vendido',
    mensaje: 'El lote quedará cerrado como vendido. Esta acción no se puede deshacer.',
    confirmar: 'Sí, marcar vendido',
    exito: 'Lote marcado como vendido.',
    kind: 'success',
  },
  aceptar: {
    titulo: 'Aceptar solicitud',
    mensaje: 'El lote quedará reservado para este solicitante y se rechazarán las demás solicitudes pendientes.',
    confirmar: 'Sí, aceptar',
    exito: 'Solicitud aceptada.',
    kind: 'success',
  },
  rechazar: {
    titulo: 'Rechazar solicitud',
    mensaje: 'El solicitante no podrá volver a pedir este lote. Esta acción no se puede deshacer.',
    confirmar: 'Sí, rechazar',
    exito: 'Solicitud rechazada.',
    kind: 'danger',
  },
  cancelar: {
    titulo: 'Cancelar reserva',
    mensaje: 'Si la reserva estaba aceptada, el lote volverá a estar disponible. Se avisará a la otra parte.',
    confirmar: 'Sí, cancelar',
    exito: 'Reserva cancelada.',
    kind: 'danger',
  },
};

export const ETIQUETA_ACCION_RESERVA = {
  aceptar: 'Aceptar',
  rechazar: 'Rechazar',
  cancelar: 'Cancelar reserva',
};

export const formatoQuetzales = (valor) => `Q${Number(valor ?? 0).toFixed(2)}`;

export const ubicacionLote = (lote) => [lote?.municipio, lote?.departamento].filter(Boolean).join(', ');
