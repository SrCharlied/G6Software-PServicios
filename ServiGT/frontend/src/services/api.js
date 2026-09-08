import axios from 'axios';
import {
  clearPrivateSessionStorage,
  migrateLegacySession,
  sessionStorage,
  STORAGE_KEYS,
} from './sessionStorage';

const DEFAULT_API_URL = process.env.NODE_ENV === 'production'
  ? '/api'
  : 'http://localhost:8080/api';
const BASE_URL = process.env.EXPO_PUBLIC_API_URL || DEFAULT_API_URL;

const TOKEN_KEY = STORAGE_KEYS.token;
const USER_KEY  = STORAGE_KEYS.user;

// ── Instancia Axios ───────────────────────────────────────────────────────

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000,
});

// Interceptor de request: inyectar token Bearer si existe
api.interceptors.request.use(async (config) => {
  const token = await sessionStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Manejo centralizado de errores ────────────────────────────────────────

export class ApiError extends Error {
  constructor(message, { status = null, data = null, retryAfter = null, cause = null } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
    this.retryAfter = retryAfter;
    this.cause = cause;
    this.isApiError = true;
  }
}

let unauthorizedHandler = null;
let handlingUnauthorized = false;

export const setUnauthorizedHandler = (handler) => {
  unauthorizedHandler = typeof handler === 'function' ? handler : null;
  return () => {
    if (unauthorizedHandler === handler) unauthorizedHandler = null;
  };
};

const getRetryAfter = (responseData, headers = {}) =>
  headers['retry-after'] ?? headers['Retry-After'] ?? responseData?.retry_after ?? responseData?.retryAfter ?? null;

export const normalizeApiError = (error, fallbackMessage = 'Ocurrio un error inesperado.') => {
  if (error?.isApiError) return error;

  const response = error?.response;
  const data = response?.data ?? null;
  const status = response?.status ?? null;
  let message = fallbackMessage;

  if (error?.response?.data?.errors) {
    const first = Object.values(error.response.data.errors)[0];
    message = Array.isArray(first) ? first[0] : first;
  } else if (error?.response?.data?.message) {
    message = error.response.data.message;
  } else if (error?.code === 'ECONNABORTED') {
    message = 'La solicitud tomo demasiado tiempo. Verifica tu conexion.';
  } else if (error?.request) {
    message = 'No se pudo conectar con el servidor. Verifica que el backend este corriendo.';
  }

  return new ApiError(message, {
    status,
    data,
    retryAfter: getRetryAfter(data, response?.headers),
    cause: error,
  });
};

const throwApiError = (error, fallbackMessage) => {
  throw normalizeApiError(error, fallbackMessage);
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const apiError = normalizeApiError(error);
    const skipUnauthorizedHandler = error?.config?.skipUnauthorizedHandler === true;
    if (apiError.status === 401 && !skipUnauthorizedHandler && unauthorizedHandler && !handlingUnauthorized) {
      handlingUnauthorized = true;
      try {
        await unauthorizedHandler(apiError);
      } finally {
        handlingUnauthorized = false;
      }
    }
    return Promise.reject(apiError);
  }
);

// ── Token helpers (exportados para App.js) ────────────────────────────────

export const saveSession = async (token, user) => {
  await sessionStorage.setItem(TOKEN_KEY, token);
  await sessionStorage.setItem(USER_KEY, JSON.stringify(user));
};

export const clearSession = async () => {
  await clearPrivateSessionStorage();
};

export const loadStoredSession = async () => {
  await migrateLegacySession();
  const token = await sessionStorage.getItem(TOKEN_KEY);
  const raw   = await sessionStorage.getItem(USER_KEY);
  if (!token) return null;
  if (!raw) return { token, user: null };
  try {
    return { token, user: JSON.parse(raw) };
  } catch {
    return { token, user: null };
  }
};

// Convierte una ruta relativa de storage (/storage/fotos/...) a URL completa.
// Necesario porque APP_URL del contenedor difiere del puerto expuesto al host.
export const storageUrl = (path) => {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  return BASE_URL.replace('/api', '') + path;
};

// ── Autenticacion ─────────────────────────────────────────────────────────

export const login = async (email, password) => {
  try {
    const response = await api.post('/login', { email, password });
    const { user, token } = response.data;
    await saveSession(token, user);
    return response.data;
  } catch (error) {
    throwApiError(error, 'No se pudo iniciar sesion.');
  }
};

export const register = async (name, email, password, role) => {
  try {
    const response = await api.post('/register', { name, email, password, role });
    const { user, token } = response.data;
    await saveSession(token, user);
    return response.data;
  } catch (error) {
    throwApiError(error, 'No se pudo registrar el usuario.');
  }
};

export const logout = async () => {
  try {
    await api.post('/logout');
  } catch { /* ignorar errores de red en logout */ }
  finally {
    await clearSession();
  }
};

export const getMe = async (config = {}) => {
  try {
    const response = await api.get('/me', config);
    return response.data;
  } catch (error) {
    throwApiError(error, 'No se pudo obtener el usuario.');
  }
};

// ── Categorias ────────────────────────────────────────────────────────────

export const getCategorias = async () => {
  try {
    const response = await api.get('/categorias');
    return response.data;
  } catch (error) {
    throwApiError(error, 'No se pudieron cargar las categorias.');
  }
};

// ── Proveedores ───────────────────────────────────────────────────────────

export const getProviders = async () => {
  try {
    const response = await api.get('/providers');
    return response.data;
  } catch (error) {
    throwApiError(error, 'No se pudo cargar la lista de proveedores.');
  }
};

export const getProvider = async (id) => {
  try {
    const response = await api.get(`/providers/${id}`);
    return response.data;
  } catch (error) {
    throwApiError(error, 'No se pudo cargar el proveedor.');
  }
};

// Perfil propio derivado de la sesion. Sustituye a getProviderByUser como via
// normal: el backend ya no acepta consultar el perfil de otro usuario por id.
export const getMiProveedor = async () => {
  try {
    const response = await api.get('/providers/me');
    return response.data;
  } catch (error) {
    throwApiError(error, 'No se encontro tu perfil de proveedor.');
  }
};

export const getProviderByUser = async (userId) => {
  try {
    const response = await api.get(`/providers/user/${userId}`);
    return response.data;
  } catch (error) {
    throwApiError(error, 'No se encontro el perfil de proveedor.');
  }
};

export const createProvider = async (data) => {
  try {
    const response = await api.post('/providers', data);
    return response.data;
  } catch (error) {
    throwApiError(error, 'No se pudo crear el perfil de proveedor.');
  }
};

export const updateProvider = async (id, data) => {
  try {
    const response = await api.put(`/providers/${id}`, data);
    return response.data;
  } catch (error) {
    throwApiError(error, 'No se pudo actualizar el perfil.');
  }
};

// ── Documentos ────────────────────────────────────────────────────────────

export const getDocumentos = async (proveedorId) => {
  try {
    const response = await api.get(`/providers/${proveedorId}/documentos`);
    return response.data;
  } catch (error) {
    throwApiError(error, 'No se pudieron cargar los documentos.');
  }
};

// La ruta del archivo es privada y requiere Bearer: no se puede enlazar como
// una URL publica (a diferencia de foto_perfil/portada), hay que pasar por el
// interceptor de axios para que adjunte el token.
export const descargarDocumento = async (proveedorId, documentoId) => {
  try {
    const response = await api.get(
      `/providers/${proveedorId}/documentos/${documentoId}/descargar`,
      { responseType: 'blob' }
    );
    return response.data;
  } catch (error) {
    throwApiError(error, 'No se pudo descargar el documento.');
  }
};

export const uploadFotoPerfil = async (proveedorId, file) => {
  try {
    const formData = new FormData();
    formData.append('foto', file);
    const response = await api.post(`/providers/${proveedorId}/foto`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  } catch (error) {
    throwApiError(error, 'No se pudo subir la foto de perfil.');
  }
};

export const uploadPortada = async (proveedorId, file) => {
  try {
    const formData = new FormData();
    formData.append('portada', file);
    const response = await api.post(`/providers/${proveedorId}/portada`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  } catch (error) {
    throwApiError(error, 'No se pudo subir la portada.');
  }
};

export const deletePortada = async (proveedorId) => {
  try {
    const response = await api.delete(`/providers/${proveedorId}/portada`);
    return response.data;
  } catch (error) {
    throwApiError(error, 'No se pudo quitar la portada.');
  }
};

export const uploadDocumento = async (proveedorId, file, tipoDocumento) => {
  try {
    const formData = new FormData();
    formData.append('documento', file);
    formData.append('tipo_documento', tipoDocumento);

    const response = await api.post(`/providers/${proveedorId}/documentos`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  } catch (error) {
    throwApiError(error, 'No se pudo subir el documento.');
  }
};

// ── Servicios ─────────────────────────────────────────────────────────────

export const createServicio = async (data) => {
  try {
    const response = await api.post('/servicios', data);
    return response.data;
  } catch (error) {
    throwApiError(error, 'No se pudo enviar la solicitud.');
  }
};

export const getServicio = async (id) => {
  try {
    const response = await api.get(`/servicios/${id}`);
    return response.data;
  } catch (error) {
    throwApiError(error, 'No se pudo cargar el servicio.');
  }
};

export const getSolicitudesProveedor = async (estado = null) => {
  try {
    const params = estado ? { estado } : {};
    const response = await api.get('/servicios/proveedor', { params });
    return response.data;
  } catch (error) {
    throwApiError(error, 'No se pudieron cargar las solicitudes.');
  }
};

export const getSolicitudesCliente = async (estado = null) => {
  try {
    const params = estado ? { estado } : {};
    const response = await api.get('/servicios/cliente', { params });
    return response.data;
  } catch (error) {
    throwApiError(error, 'No se pudieron cargar tus solicitudes.');
  }
};

export const aceptarServicio = async (id) => {
  try {
    const response = await api.post(`/servicios/${id}/aceptar`);
    return response.data;
  } catch (error) {
    throwApiError(error, 'No se pudo aceptar la solicitud.');
  }
};

export const iniciarServicio = async (id, codigo) => {
  try {
    const response = await api.post(`/servicios/${id}/iniciar`, { codigo });
    return response.data;
  } catch (error) {
    throwApiError(error, 'No se pudo iniciar el servicio.');
  }
};

export const finalizarServicio = async (id) => {
  try {
    const response = await api.post(`/servicios/${id}/finalizar`);
    return response.data;
  } catch (error) {
    throwApiError(error, 'No se pudo finalizar el servicio.');
  }
};

export const confirmarFinServicio = async (id, codigo) => {
  try {
    const response = await api.post(`/servicios/${id}/confirmar-fin`, { codigo });
    return response.data;
  } catch (error) {
    throwApiError(error, 'No se pudo confirmar la finalizacion.');
  }
};

export const rechazarServicio = async (id, motivo = '') => {
  try {
    const response = await api.post(`/servicios/${id}/rechazar`, { motivo });
    return response.data;
  } catch (error) {
    throwApiError(error, 'No se pudo rechazar la solicitud.');
  }
};

export const actualizarEstadoServicio = async (id, estado) => {
  try {
    const response = await api.put(`/servicios/${id}/estado`, { estado });
    return response.data;
  } catch (error) {
    throwApiError(error, 'No se pudo actualizar el estado.');
  }
};

// ── Disponibilidad ────────────────────────────────────────────────────────

export const getDisponibilidadProveedor = async (proveedorId) => {
  try {
    const response = await api.get(`/providers/${proveedorId}/disponibilidad`);
    return response.data;
  } catch (error) {
    throwApiError(error, 'No se pudo cargar la disponibilidad.');
  }
};

export const getMiDisponibilidad = async () => {
  try {
    const response = await api.get('/disponibilidad/mia');
    return response.data;
  } catch (error) {
    throwApiError(error, 'No se pudo cargar tu disponibilidad.');
  }
};

export const saveDisponibilidad = async (disponibilidad) => {
  try {
    const response = await api.post('/disponibilidad', { disponibilidad });
    return response.data;
  } catch (error) {
    throwApiError(error, 'No se pudo guardar la disponibilidad.');
  }
};

// ── Calificaciones ────────────────────────────────────────────────────────

export const createCalificacion = async (data) => {
  try {
    const response = await api.post('/calificaciones', data);
    return response.data;
  } catch (error) {
    throwApiError(error, 'No se pudo enviar la calificacion.');
  }
};

export const calificarServicio = async (servicioId, data) => {
  try {
    const response = await api.post(`/servicios/${servicioId}/calificar`, data);
    return response.data;
  } catch (error) {
    throwApiError(error, 'No se pudo enviar la calificacion.');
  }
};

export const getCalificacionesProveedor = async (proveedorId) => {
  try {
    const response = await api.get(`/providers/${proveedorId}/calificaciones`);
    return response.data;
  } catch (error) {
    throwApiError(error, 'No se pudieron cargar las calificaciones.');
  }
};

// ── Mensajes / Chat ───────────────────────────────────────────────────────

export const sendMensaje = async (receptorId, contenido, servicioId = null) => {
  try {
    const payload = { receptor_id: receptorId, contenido };
    if (servicioId) payload.servicio_id = servicioId;
    const response = await api.post('/mensajes', payload);
    return response.data;
  } catch (error) {
    throwApiError(error, 'No se pudo enviar el mensaje.');
  }
};

export const getConversacion = async (otroUsuarioId, lastId = null) => {
  try {
    const params = lastId ? { last_id: lastId } : {};
    const response = await api.get(`/mensajes/conversacion/${otroUsuarioId}`, { params });
    return response.data;
  } catch (error) {
    throwApiError(error, 'No se pudo cargar la conversacion.');
  }
};

export const getMisConversaciones = async () => {
  try {
    const response = await api.get('/mensajes/conversaciones');
    return response.data;
  } catch (error) {
    throwApiError(error, 'No se pudieron cargar las conversaciones.');
  }
};

// ── Notificaciones ────────────────────────────────────────────────────────

export const getNotificaciones = async () => {
  try {
    const response = await api.get('/notificaciones');
    return response.data;
  } catch (error) {
    throwApiError(error, 'No se pudieron cargar las notificaciones.');
  }
};

export const getUnreadNotificationsCount = async () => {
  try {
    const response = await api.get('/notificaciones');
    return response.data.no_leidas || 0;
  } catch (error) {
    throwApiError(error, 'No se pudo cargar el conteo de notificaciones.');
  }
};

export const marcarNotificacionLeida = async (id) => {
  try {
    const response = await api.put(`/notificaciones/${id}/leer`);
    return response.data;
  } catch (error) {
    throwApiError(error, 'No se pudo marcar como leida.');
  }
};

export const marcarTodasLeidas = async () => {
  try {
    const response = await api.put('/notificaciones/leer-todas');
    return response.data;
  } catch (error) {
    throwApiError(error, 'No se pudo actualizar las notificaciones.');
  }
};

// ── Pedidos (Marketplace de Demanda) ─────────────────────────────────────

export const crearPedido = async (data) => {
  try {
    const response = await api.post('/pedidos', data);
    return response.data;
  } catch (error) {
    throwApiError(error, 'No se pudo publicar el pedido.');
  }
};

export const getPedidosAbiertos = async ({ categoriaId = null, page = 1 } = {}) => {
  try {
    const params = { page };
    if (categoriaId) params.categoria_id = categoriaId;
    const response = await api.get('/pedidos/abiertos', { params });
    return response.data;
  } catch (error) {
    throwApiError(error, 'No se pudieron cargar los pedidos.');
  }
};

export const getMiCredito = async () => {
  try {
    const response = await api.get('/mi-credito');
    return response.data;
  } catch (error) {
    throwApiError(error, 'No se pudo obtener el saldo.');
  }
};

export const getCreditosPaquetes = async () => {
  try {
    const response = await api.get('/creditos/paquetes');
    return response.data;
  } catch (error) {
    throwApiError(error, 'No se pudieron cargar los paquetes de creditos.');
  }
};

export const comprarCreditos = async ({ paqueteId, idempotencyKey }) => {
  try {
    const response = await api.post('/creditos/comprar', {
      paquete_id: paqueteId,
      idempotency_key: idempotencyKey,
    });
    return response.data;
  } catch (error) {
    throwApiError(error, 'No se pudo completar la compra simulada.');
  }
};

export const getCreditosTransacciones = async ({ page = 1, perPage = 15 } = {}) => {
  try {
    const response = await api.get('/creditos/transacciones', {
      params: { page, per_page: perPage },
    });
    return response.data;
  } catch (error) {
    throwApiError(error, 'No se pudo cargar el historial de creditos.');
  }
};

export const getPremiumMiEstado = async () => {
  try {
    const response = await api.get('/premium/mi-estado');
    return response.data;
  } catch (error) {
    throwApiError(error, 'No se pudo cargar el estado Premium.');
  }
};

export const activarPremium = async () => {
  try {
    const response = await api.post('/premium/activar');
    return response.data;
  } catch (error) {
    throwApiError(error, 'No se pudo activar Premium.');
  }
};

export const getPedidoDetalle = async (id) => {
  try {
    const response = await api.get(`/pedidos/${id}`);
    return response.data;
  } catch (error) {
    throwApiError(error, 'No se pudo cargar el pedido.');
  }
};

export const enviarCotizacion = async (pedidoId, { monto, mensaje }) => {
  try {
    const response = await api.post(`/pedidos/${pedidoId}/cotizaciones`, { monto, mensaje });
    return response.data;
  } catch (error) {
    throwApiError(error, 'No se pudo enviar la cotización.');
  }
};

export const editarCotizacion = async (pedidoId, cotizacionId, { monto, mensaje }) => {
  try {
    const response = await api.put(`/pedidos/${pedidoId}/cotizaciones/${cotizacionId}`, { monto, mensaje });
    return response.data;
  } catch (error) {
    throwApiError(error, 'No se pudo actualizar la cotización.');
  }
};

export const aceptarCotizacion = async (pedidoId, cotizacionId) => {
  try {
    const response = await api.post(`/pedidos/${pedidoId}/cotizaciones/${cotizacionId}/aceptar`);
    return response.data;
  } catch (error) {
    throwApiError(error, 'No se pudo aceptar la cotización.');
  }
};

export const getMisPedidos = async ({ page = 1 } = {}) => {
  try {
    const response = await api.get('/pedidos/mios', { params: { page } });
    return response.data;
  } catch (error) {
    throwApiError(error, 'No se pudieron cargar tus pedidos.');
  }
};

// ── Publicaciones de servicios ───────────────────────────────────────────

export const getMisPublicaciones = async () => {
  try {
    const response = await api.get('/publicaciones/mias');
    return response.data;
  } catch (error) {
    throwApiError(error, 'No se pudieron cargar tus publicaciones.');
  }
};

const buildPublicacionFormData = ({
  titulo, descripcion, categoriaId, precioReferencial, estado, imagen, eliminarImagen,
}) => {
  const formData = new FormData();
  if (titulo !== undefined) formData.append('titulo', titulo);
  if (descripcion !== undefined) formData.append('descripcion', descripcion);
  if (categoriaId !== undefined && categoriaId !== null && categoriaId !== '') {
    formData.append('categoria_id', categoriaId);
  }
  if (precioReferencial !== undefined && precioReferencial !== null && precioReferencial !== '') {
    formData.append('precio_referencial', precioReferencial);
  }
  if (estado !== undefined) formData.append('estado', estado);
  if (imagen) formData.append('imagen', imagen);
  if (eliminarImagen) formData.append('eliminar_imagen', '1');
  return formData;
};

export const crearPublicacion = async (datos) => {
  try {
    const formData = buildPublicacionFormData(datos);
    const response = await api.post('/publicaciones', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  } catch (error) {
    throwApiError(error, 'No se pudo crear la publicacion.');
  }
};

// PUT con archivo no llega bien a PHP en la mayoria de clientes HTTP, asi que
// se envia como POST con _method=PUT (spoofing que Laravel soporta nativo)
// para que multipart/form-data funcione igual que en crearPublicacion.
export const actualizarPublicacion = async (id, datos) => {
  try {
    const formData = buildPublicacionFormData(datos);
    formData.append('_method', 'PUT');
    const response = await api.post(`/publicaciones/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  } catch (error) {
    throwApiError(error, 'No se pudo actualizar la publicacion.');
  }
};

export const activarPublicacion = async (id) => {
  try {
    const response = await api.post(`/publicaciones/${id}/activar`);
    return response.data;
  } catch (error) {
    throwApiError(error, 'No se pudo activar la publicacion.');
  }
};

export const desactivarPublicacion = async (id) => {
  try {
    const response = await api.post(`/publicaciones/${id}/desactivar`);
    return response.data;
  } catch (error) {
    throwApiError(error, 'No se pudo desactivar la publicacion.');
  }
};

export const eliminarPublicacion = async (id) => {
  try {
    const response = await api.delete(`/publicaciones/${id}`);
    return response.data;
  } catch (error) {
    throwApiError(error, 'No se pudo eliminar la publicacion.');
  }
};

// ── Admin ─────────────────────────────────────────────────────────────────

export const getAdminStats = async () => {
  try {
    const response = await api.get('/admin/stats');
    return response.data;
  } catch (error) {
    throwApiError(error, 'No se pudieron cargar las metricas.');
  }
};

export const getAdminUsuarios = async (role = null) => {
  try {
    const params = role ? { role } : {};
    const response = await api.get('/admin/usuarios', { params });
    return response.data;
  } catch (error) {
    throwApiError(error, 'No se pudieron cargar los usuarios.');
  }
};

export const getAdminProveedores = async () => {
  try {
    const response = await api.get('/admin/proveedores');
    return response.data;
  } catch (error) {
    throwApiError(error, 'No se pudieron cargar los proveedores.');
  }
};

export const recargarCreditosProveedor = async (proveedorId, { monto, motivo }) => {
  try {
    const response = await api.post(`/admin/proveedores/${proveedorId}/creditos`, { monto, motivo });
    return response.data;
  } catch (error) {
    throwApiError(error, 'No se pudo agregar creditos al proveedor.');
  }
};

export const getAdminCreditosPremium = async ({ estado = null } = {}) => {
  try {
    const params = estado ? { estado } : {};
    const response = await api.get('/admin/creditos-premium', { params });
    return response.data;
  } catch (error) {
    throwApiError(error, 'No se pudieron cargar creditos y Premium.');
  }
};

export default api;
