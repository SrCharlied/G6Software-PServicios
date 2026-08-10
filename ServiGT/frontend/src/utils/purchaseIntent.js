// Ciclo de vida de la clave de idempotencia de una compra de creditos.
//
// El backend (POST /api/creditos/comprar) reconoce una compra ya acreditada por
// su idempotency_key y la devuelve sin volver a acreditar. Esa proteccion solo
// sirve si el cliente REUTILIZA la clave en los reintentos.
//
// El caso que esto evita: el envio se acredita en el backend pero la respuesta
// se pierde por timeout, la pantalla muestra un fallo, y el proveedor vuelve a
// confirmar. Con una clave nueva el backend no encuentra fila previa y acredita
// por segunda vez. Con la misma clave devuelve la compra original.
//
// Regla: una clave por intencion de compra, no por envio. La intencion se abre
// al entrar al checkout de un paquete, sobrevive a los fallos, y se cierra solo
// cuando el backend confirma que la compra quedo registrada.

/** Clave nueva: marca temporal en ms mas 8 caracteres aleatorios. */
export const nuevaClaveCompra = () =>
  `web-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

/** Intento cerrado: no hay compra en curso. */
export const INTENTO_VACIO = { paqueteId: null, key: null };

/**
 * Intento vigente al abrir el checkout de un paquete.
 * Reutiliza la clave si la intencion ya estaba abierta para ese mismo paquete,
 * de modo que cerrar el modal tras un fallo y reabrirlo no cambie la clave.
 *
 * @param {{paqueteId: ?number, key: ?string}} actual intento en curso
 * @param {number} paqueteId paquete que se va a comprar
 * @param {() => string} generar inyectable para pruebas deterministas
 */
export const abrirIntento = (actual, paqueteId, generar = nuevaClaveCompra) => {
  if (actual && actual.key && actual.paqueteId === paqueteId) {
    return actual;
  }
  return { paqueteId, key: generar() };
};

/** Cierra la intencion. Se llama cuando el backend confirma la compra. */
export const cerrarIntento = () => ({ ...INTENTO_VACIO });
