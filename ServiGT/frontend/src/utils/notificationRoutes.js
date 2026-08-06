// Destino de navegacion de cada notificacion que emite el backend.
//
// Los 9 tipos viven en ServicioController (7) y CotizacionController (2).
// El campo `datos` (JSONB) llega siempre como objeto: el modelo Notificacion
// lo castea a array, asi que aqui se lee como propiedades normales.
//
// Regla de mapeo: se navega al SUJETO de la notificacion, no a la accion que
// sugiere el mensaje. Una notificacion sobre un pedido abre ese pedido; una
// sobre un servicio abre el listado de solicitudes, que es la unica pantalla
// que hoy muestra servicios. Asi el destino nunca sorprende al usuario.
//
// Un tipo no registrado devuelve null: la notificacion se marca como leida
// pero no navega, en lugar de mandar al usuario a una pantalla arbitraria.

const DESTINOS = {
  // ── Flujo A: contratacion directa ───────────────────────────────────────
  // No existe ruta /servicios/[id]; SolicitudesScreen sirve a los dos roles y
  // es donde estan las acciones de aceptar, iniciar, finalizar y confirmar.
  nueva_solicitud:        () => '/solicitudes',
  solicitud_aceptada:     () => '/solicitudes',
  solicitud_rechazada:    () => '/solicitudes',
  servicio_iniciado:      () => '/solicitudes',
  servicio_por_confirmar: () => '/solicitudes',
  servicio_completado:    () => '/solicitudes',

  // Unico tipo del Flujo A con pantalla dedicada.
  servicio_calificable: (datos) =>
    datos.servicio_id ? `/calificar/${datos.servicio_id}` : '/solicitudes',

  // ── Flujo B: marketplace de demanda ────────────────────────────────────
  // Ambos tipos traen pedido_id garantizado desde CotizacionController.
  cotizacion_aceptada:  (datos) => (datos.pedido_id ? `/pedidos/${datos.pedido_id}` : null),
  cotizacion_rechazada: (datos) => (datos.pedido_id ? `/pedidos/${datos.pedido_id}` : null),
};

/**
 * Ruta a la que debe llevar una notificacion, o null si no hay destino seguro.
 * @param {{tipo?: string, datos?: object}} notificacion
 * @returns {string|null}
 */
export const destinoNotificacion = (notificacion) => {
  const tipo = notificacion?.tipo;

  // hasOwnProperty y no `DESTINOS[tipo]`: un tipo como 'toString' o
  // 'constructor' resolveria a un metodo heredado de Object.prototype y
  // devolveria una ruta inventada.
  if (!tipo || !Object.prototype.hasOwnProperty.call(DESTINOS, tipo)) return null;

  return DESTINOS[tipo](notificacion.datos || {}) || null;
};

/** Tipos con destino registrado. Util para pruebas y auditoria de cobertura. */
export const TIPOS_CON_DESTINO = Object.keys(DESTINOS);
