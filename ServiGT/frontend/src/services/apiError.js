/**
 * Error comun del cliente HTTP (task 3.3).
 *
 * Antes cada funcion de `api.js` hacia `throw new Error(mensaje)`. El mensaje
 * llegaba a la pantalla, pero el status HTTP se perdia por completo, y sin
 * status no hay forma de distinguir los tres casos que se comportan distinto:
 *
 *   401 — la sesion ya no vale: hay que limpiarla y mandar a login.
 *   403 — la sesion vale, falta permiso: hay que CONSERVARLA y explicar.
 *   429 — hay que esperar; reintentar de inmediato empeora el bloqueo.
 *
 * Sin `status`, la app trataba los tres igual y terminaba cerrando sesion por
 * un 403, que es justo lo contrario de lo correcto.
 */
export class ApiError extends Error {
  constructor(mensaje, { status = null, errors = null, correlationId = null, retryAfter = null, cause = null } = {}) {
    super(mensaje);
    this.name = 'ApiError';
    this.status = status;
    // Errores de validacion por campo, tal como los manda Laravel (422).
    this.errors = errors;
    // Correlation id de la task 4.3: permite cruzar el error que vio el usuario
    // con la linea del log del backend.
    this.correlationId = correlationId;
    // Segundos a esperar en un 429, si el backend los declaro.
    this.retryAfter = retryAfter;
    this.cause = cause;
  }

  get esNoAutenticado() { return this.status === 401; }
  get esProhibido() { return this.status === 403; }
  get esNoEncontrado() { return this.status === 404; }
  get esValidacion() { return this.status === 422; }
  get esLimiteExcedido() { return this.status === 429; }
  /** Sin respuesta del servidor: timeout, DNS, backend caido. */
  get esDeRed() { return this.status === null; }
}

const mensajePorDefecto = (status, fallback) => {
  switch (status) {
    case 401: return 'Tu sesion expiro. Inicia sesion de nuevo.';
    case 403: return 'No tienes permiso para hacer esto.';
    case 404: return 'No se encontro lo que buscabas.';
    case 429: return 'Hiciste demasiados intentos. Espera un momento.';
    default: return fallback;
  }
};

const segundosDeEspera = (error) => {
  const cabecera = error?.response?.headers?.['retry-after'];
  const segundos = Number.parseInt(cabecera, 10);

  return Number.isFinite(segundos) ? segundos : null;
};

/**
 * Convierte cualquier error de axios en un `ApiError` con el status intacto.
 * El mensaje sigue la misma prioridad que antes (errores de validacion, luego
 * `message` del backend, luego el fallback de la funcion que llamo), asi que
 * las pantallas que solo leen `error.message` no cambian de comportamiento.
 */
export const toApiError = (error, fallback = 'Ocurrio un error inesperado.') => {
  if (error instanceof ApiError) return error;

  const status = error?.response?.status ?? null;
  const data = error?.response?.data;

  let mensaje;
  if (data?.errors) {
    const primero = Object.values(data.errors)[0];
    mensaje = Array.isArray(primero) ? primero[0] : primero;
  } else if (data?.message) {
    mensaje = data.message;
  } else if (error?.code === 'ECONNABORTED') {
    mensaje = 'La solicitud tomo demasiado tiempo. Verifica tu conexion.';
  } else if (error?.request && status === null) {
    mensaje = 'No se pudo conectar con el servidor. Verifica que el backend este corriendo.';
  }

  return new ApiError(mensaje || mensajePorDefecto(status, fallback), {
    status,
    errors: data?.errors ?? null,
    correlationId: data?.correlation_id ?? error?.response?.headers?.['x-correlation-id'] ?? null,
    retryAfter: status === 429 ? segundosDeEspera(error) : null,
    cause: error,
  });
};
