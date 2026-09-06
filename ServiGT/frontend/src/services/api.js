import axios from 'axios';
import { ApiError, toApiError } from './apiError';
import {
  TOKEN_KEY,
  USER_KEY,
  borrar,
  guardar,
  hidratarStorage,
  leer,
  limpiarDatosPrivados,
} from './storage';

const DEFAULT_API_URL = 'http://localhost:8080/api';
const BASE_URL = process.env.EXPO_PUBLIC_API_URL || DEFAULT_API_URL;

// ── Instancia Axios ───────────────────────────────────────────────────────

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000,
});

// Interceptor de request: inyectar token Bearer si existe.
// La lectura es sincrona porque `hidratarStorage()` ya cargo el token a memoria
// antes del primer render (task 3.4).
api.interceptors.request.use((config) => {
  const token = leer(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Manejo centralizado de errores (task 3.3) ─────────────────────────────
//
// Un unico interceptor de respuesta traduce el error de axios a `ApiError`,
// que conserva el status. Antes cada funcion hacia `throw new Error(mensaje)`
// y el status se perdia, asi que la app no podia distinguir un 401 (limpiar
// sesion) de un 403 (conservarla) ni de un 429 (esperar).

// Suscriptores a la invalidacion de sesion. `SessionContext` se registra aqui
// para limpiar su estado y redirigir. Es una lista y no un callback unico
// porque durante el arranque puede haber mas de un consumidor montado.
const suscriptoresSesionInvalida = new Set();

// Un 401 puede llegar de varias peticiones en paralelo. Sin este candado cada
// una dispararia su propia limpieza y su propia redireccion, y la app entraria
// en un bucle de navegacion. Se avisa una sola vez y se rearma cuando alguien
// vuelve a iniciar sesion.
let sesionYaInvalidada = false;

export const alInvalidarSesion = (callback) => {
  suscriptoresSesionInvalida.add(callback);
  return () => suscriptoresSesionInvalida.delete(callback);
};

const invalidarSesionUnaVez = () => {
  if (sesionYaInvalidada) return;
  sesionYaInvalidada = true;

  clearSession();
  suscriptoresSesionInvalida.forEach((callback) => {
    try {
      callback();
    } catch { /* un suscriptor roto no debe impedir que se avise a los demas */ }
  });
};

// Un 401 de /login o /register significa "credenciales incorrectas", no "tu
// sesion expiro": disparar la invalidacion ahi mandaria al usuario a la
// pantalla de login desde la pantalla de login.
const esRutaDeAutenticacion = (url = '') =>
  typeof url === 'string' && (url.endsWith('/login') || url.endsWith('/register'));

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const apiError = toApiError(error);

    // 401: la credencial ya no vale. Se limpia una sola vez.
    // 403: la sesion es valida y se conserva; solo falta permiso.
    // 429: no se toca la sesion; la pantalla decide si muestra la espera.
    if (apiError.status === 401 && !esRutaDeAutenticacion(error?.config?.url)) {
      invalidarSesionUnaVez();
    }

    return Promise.reject(apiError);
  }
);

// ── Token helpers (exportados para App.js) ────────────────────────────────

export const inicializarSesion = () => hidratarStorage();

export const saveSession = (token, user) => {
  sesionYaInvalidada = false;
  guardar(TOKEN_KEY, token);
  guardar(USER_KEY, JSON.stringify(user));
};

export const clearSession = () => {
  borrar(TOKEN_KEY);
  borrar(USER_KEY);
};

/**
 * Limpieza completa al cerrar sesion (task 3.4): token, perfil, parametros de
 * navegacion y cache de conversaciones.
 */
export const clearPrivateData = () => limpiarDatosPrivados();

export const loadStoredSession = () => {
  const token = leer(TOKEN_KEY);
  const raw = leer(USER_KEY);
  if (!token || !raw) return null;
  try {
    return { token, user: JSON.parse(raw) };
  } catch {
    return null;
  }
};

// Convierte una ruta relativa de storage (/storage/fotos/...) a URL completa.
// Necesario porque APP_URL del contenedor difiere del puerto expuesto al host.
export const storageUrl = (path) => {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  return BASE_URL.replace('/api', '') + path;
};

export { ApiError };

// ── Autenticacion ─────────────────────────────────────────────────────────

export const login = async (email, password) => {
  try {
    const response = await api.post('/login', { email, password });
    const { user, token } = response.data;
    saveSession(token, user);
    return response.data;
  } catch (error) {
    throw toApiError(error, 'No se pudo iniciar sesion.');
  }
};

export const register = async (name, email, password, role) => {
  try {
    const response = await api.post('/register', { name, email, password, role });
    const { user, token } = response.data;
    saveSession(token, user);
    return response.data;
  } catch (error) {
    throw toApiError(error, 'No se pudo registrar el usuario.');
  }
};

export const logout = async () => {
  try {
    await api.post('/logout');
  } catch { /* la red puede fallar; el dispositivo se limpia igual */ }
  finally {
    // Se borra todo lo privado, no solo el token: perfil, parametros de
    // navegacion y cache de conversaciones (task 3.4).
    await clearPrivateData();
  }
};

export const getMe = async () => {
  try {
    const response = await api.get('/me');
    return response.data;
  } catch (error) {
    throw toApiError(error, 'No se pudo obtener el usuario.');
  }
};

// ── Categorias ────────────────────────────────────────────────────────────

export const getCategorias = async () => {
  try {
    const response = await api.get('/categorias');
    return response.data;
  } catch (error) {
    throw toApiError(error, 'No se pudieron cargar las categorias.');
  }
};

// ── Proveedores ───────────────────────────────────────────────────────────

export const getProviders = async () => {
  try {
    const response = await api.get('/providers');
    return response.data;
  } catch (error) {
    throw toApiError(error, 'No se pudo cargar la lista de proveedores.');
  }
};

export const getProvider = async (id) => {
  try {
    const response = await api.get(`/providers/${id}`);
    return response.data;
  } catch (error) {
    throw toApiError(error, 'No se pudo cargar el proveedor.');
  }
};

// Perfil propio derivado de la sesion. Sustituye a getProviderByUser como via
// normal: el backend ya no acepta consultar el perfil de otro usuario por id.
export const getMiProveedor = async () => {
  try {
    const response = await api.get('/providers/me');
    return response.data;
  } catch (error) {
    throw toApiError(error, 'No se encontro tu perfil de proveedor.');
  }
};

export const getProviderByUser = async (userId) => {
  try {
    const response = await api.get(`/providers/user/${userId}`);
    return response.data;
  } catch (error) {
    throw toApiError(error, 'No se encontro el perfil de proveedor.');
  }
};

export const createProvider = async (data) => {
  try {
    const response = await api.post('/providers', data);
    return response.data;
  } catch (error) {
    throw toApiError(error, 'No se pudo crear el perfil de proveedor.');
  }
};

export const updateProvider = async (id, data) => {
  try {
    const response = await api.put(`/providers/${id}`, data);
    return response.data;
  } catch (error) {
    throw toApiError(error, 'No se pudo actualizar el perfil.');
  }
};

// ── Documentos ────────────────────────────────────────────────────────────

export const getDocumentos = async (proveedorId) => {
  try {
    const response = await api.get(`/providers/${proveedorId}/documentos`);
    return response.data;
  } catch (error) {
    throw toApiError(error, 'No se pudieron cargar los documentos.');
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
    throw toApiError(error, 'No se pudo descargar el documento.');
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
    throw toApiError(error, 'No se pudo subir la foto de perfil.');
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
    throw toApiError(error, 'No se pudo subir la portada.');
  }
};

export const deletePortada = async (proveedorId) => {
  try {
    const response = await api.delete(`/providers/${proveedorId}/portada`);
    return response.data;
  } catch (error) {
    throw toApiError(error, 'No se pudo quitar la portada.');
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
    throw toApiError(error, 'No se pudo subir el documento.');
  }
};

// ── Publicaciones de servicios ofrecidos ──────────────────────────────────
//
// El limite de publicaciones activas (1 gratis / 3 Premium) NO se calcula aqui:
// viene resuelto en `cupos` desde el backend, que es quien lo aplica bajo
// transaccion (task 5.3). El frontend solo lo muestra.

export const getPublicaciones = async ({ categoriaId = null, proveedorId = null, page = 1 } = {}) => {
  try {
    const params = { page };
    if (categoriaId) params.categoria_id = categoriaId;
    if (proveedorId) params.proveedor_id = proveedorId;

    const response = await api.get('/publicaciones', { params });
    return response.data;
  } catch (error) {
    throw toApiError(error, 'No se pudieron cargar las publicaciones.');
  }
};

export const getPublicacion = async (id) => {
  try {
    const response = await api.get(`/publicaciones/${id}`);
    return response.data;
  } catch (error) {
    throw toApiError(error, 'No se pudo cargar la publicacion.');
  }
};

export const getMisPublicaciones = async () => {
  try {
    const response = await api.get('/publicaciones/mias');
    return response.data;
  } catch (error) {
    throw toApiError(error, 'No se pudieron cargar tus publicaciones.');
  }
};

// Se manda multipart siempre que haya imagen; el backend valida mime, extension
// y tamano por su cuenta, asi que aqui no se filtra nada "por adelantado".
const cuerpoPublicacion = ({ titulo, descripcion, categoriaId, precioReferencial, estado, imagen, eliminarImagen }) => {
  const campos = {
    titulo,
    descripcion,
    categoria_id: categoriaId ?? '',
    precio_referencial: precioReferencial ?? '',
    estado,
    eliminar_imagen: eliminarImagen ? '1' : undefined,
  };

  if (!imagen) {
    const plano = {};
    Object.entries(campos).forEach(([clave, valor]) => {
      if (valor !== undefined && valor !== null) plano[clave] = valor;
    });
    return { data: plano, headers: undefined };
  }

  const form = new FormData();
  Object.entries(campos).forEach(([clave, valor]) => {
    if (valor !== undefined && valor !== null) form.append(clave, String(valor));
  });
  form.append('imagen', imagen);

  return { data: form, headers: { 'Content-Type': 'multipart/form-data' } };
};

export const crearPublicacion = async (datos) => {
  try {
    const { data, headers } = cuerpoPublicacion(datos);
    const response = await api.post('/publicaciones', data, headers ? { headers } : undefined);
    return response.data;
  } catch (error) {
    throw toApiError(error, 'No se pudo crear la publicacion.');
  }
};

export const actualizarPublicacion = async (id, datos) => {
  try {
    const { data, headers } = cuerpoPublicacion(datos);

    // Laravel no lee el body de un PUT multipart, asi que cuando hay archivo se
    // usa POST con `_method=PUT`. Sin esto, editar la imagen llegaria al
    // backend con todos los campos vacios.
    if (headers) {
      data.append('_method', 'PUT');
      const response = await api.post(`/publicaciones/${id}`, data, { headers });
      return response.data;
    }

    const response = await api.put(`/publicaciones/${id}`, data);
    return response.data;
  } catch (error) {
    throw toApiError(error, 'No se pudo actualizar la publicacion.');
  }
};

export const activarPublicacion = async (id) => {
  try {
    const response = await api.post(`/publicaciones/${id}/activar`);
    return response.data;
  } catch (error) {
    throw toApiError(error, 'No se pudo activar la publicacion.');
  }
};

export const desactivarPublicacion = async (id) => {
  try {
    const response = await api.post(`/publicaciones/${id}/desactivar`);
    return response.data;
  } catch (error) {
    throw toApiError(error, 'No se pudo desactivar la publicacion.');
  }
};

export const eliminarPublicacion = async (id) => {
  try {
    const response = await api.delete(`/publicaciones/${id}`);
    return response.data;
  } catch (error) {
    throw toApiError(error, 'No se pudo eliminar la publicacion.');
  }
};

// ── Servicios ─────────────────────────────────────────────────────────────

export const createServicio = async (data) => {
  try {
    const response = await api.post('/servicios', data);
    return response.data;
  } catch (error) {
    throw toApiError(error, 'No se pudo enviar la solicitud.');
  }
};

export const getServicio = async (id) => {
  try {
    const response = await api.get(`/servicios/${id}`);
    return response.data;
  } catch (error) {
    throw toApiError(error, 'No se pudo cargar el servicio.');
  }
};

export const getSolicitudesProveedor = async (estado = null) => {
  try {
    const params = estado ? { estado } : {};
    const response = await api.get('/servicios/proveedor', { params });
    return response.data;
  } catch (error) {
    throw toApiError(error, 'No se pudieron cargar las solicitudes.');
  }
};

export const getSolicitudesCliente = async (estado = null) => {
  try {
    const params = estado ? { estado } : {};
    const response = await api.get('/servicios/cliente', { params });
    return response.data;
  } catch (error) {
    throw toApiError(error, 'No se pudieron cargar tus solicitudes.');
  }
};

export const aceptarServicio = async (id) => {
  try {
    const response = await api.post(`/servicios/${id}/aceptar`);
    return response.data;
  } catch (error) {
    throw toApiError(error, 'No se pudo aceptar la solicitud.');
  }
};

export const iniciarServicio = async (id, codigo) => {
  try {
    const response = await api.post(`/servicios/${id}/iniciar`, { codigo });
    return response.data;
  } catch (error) {
    throw toApiError(error, 'No se pudo iniciar el servicio.');
  }
};

export const finalizarServicio = async (id) => {
  try {
    const response = await api.post(`/servicios/${id}/finalizar`);
    return response.data;
  } catch (error) {
    throw toApiError(error, 'No se pudo finalizar el servicio.');
  }
};

export const confirmarFinServicio = async (id, codigo) => {
  try {
    const response = await api.post(`/servicios/${id}/confirmar-fin`, { codigo });
    return response.data;
  } catch (error) {
    throw toApiError(error, 'No se pudo confirmar la finalizacion.');
  }
};

export const rechazarServicio = async (id, motivo = '') => {
  try {
    const response = await api.post(`/servicios/${id}/rechazar`, { motivo });
    return response.data;
  } catch (error) {
    throw toApiError(error, 'No se pudo rechazar la solicitud.');
  }
};

export const actualizarEstadoServicio = async (id, estado) => {
  try {
    const response = await api.put(`/servicios/${id}/estado`, { estado });
    return response.data;
  } catch (error) {
    throw toApiError(error, 'No se pudo actualizar el estado.');
  }
};

// ── Disponibilidad ────────────────────────────────────────────────────────

export const getDisponibilidadProveedor = async (proveedorId) => {
  try {
    const response = await api.get(`/providers/${proveedorId}/disponibilidad`);
    return response.data;
  } catch (error) {
    throw toApiError(error, 'No se pudo cargar la disponibilidad.');
  }
};

export const getMiDisponibilidad = async () => {
  try {
    const response = await api.get('/disponibilidad/mia');
    return response.data;
  } catch (error) {
    throw toApiError(error, 'No se pudo cargar tu disponibilidad.');
  }
};

export const saveDisponibilidad = async (disponibilidad) => {
  try {
    const response = await api.post('/disponibilidad', { disponibilidad });
    return response.data;
  } catch (error) {
    throw toApiError(error, 'No se pudo guardar la disponibilidad.');
  }
};

// ── Calificaciones ────────────────────────────────────────────────────────

export const createCalificacion = async (data) => {
  try {
    const response = await api.post('/calificaciones', data);
    return response.data;
  } catch (error) {
    throw toApiError(error, 'No se pudo enviar la calificacion.');
  }
};

export const calificarServicio = async (servicioId, data) => {
  try {
    const response = await api.post(`/servicios/${servicioId}/calificar`, data);
    return response.data;
  } catch (error) {
    throw toApiError(error, 'No se pudo enviar la calificacion.');
  }
};

export const getCalificacionesProveedor = async (proveedorId) => {
  try {
    const response = await api.get(`/providers/${proveedorId}/calificaciones`);
    return response.data;
  } catch (error) {
    throw toApiError(error, 'No se pudieron cargar las calificaciones.');
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
    throw toApiError(error, 'No se pudo enviar el mensaje.');
  }
};

export const getConversacion = async (otroUsuarioId, lastId = null) => {
  try {
    const params = lastId ? { last_id: lastId } : {};
    const response = await api.get(`/mensajes/conversacion/${otroUsuarioId}`, { params });
    return response.data;
  } catch (error) {
    throw toApiError(error, 'No se pudo cargar la conversacion.');
  }
};

export const getMisConversaciones = async () => {
  try {
    const response = await api.get('/mensajes/conversaciones');
    return response.data;
  } catch (error) {
    throw toApiError(error, 'No se pudieron cargar las conversaciones.');
  }
};

// ── Notificaciones ────────────────────────────────────────────────────────

export const getNotificaciones = async () => {
  try {
    const response = await api.get('/notificaciones');
    return response.data;
  } catch (error) {
    throw toApiError(error, 'No se pudieron cargar las notificaciones.');
  }
};

export const getUnreadNotificationsCount = async () => {
  try {
    const response = await api.get('/notificaciones');
    return response.data.no_leidas || 0;
  } catch (error) {
    throw toApiError(error, 'No se pudo cargar el conteo de notificaciones.');
  }
};

export const marcarNotificacionLeida = async (id) => {
  try {
    const response = await api.put(`/notificaciones/${id}/leer`);
    return response.data;
  } catch (error) {
    throw toApiError(error, 'No se pudo marcar como leida.');
  }
};

export const marcarTodasLeidas = async () => {
  try {
    const response = await api.put('/notificaciones/leer-todas');
    return response.data;
  } catch (error) {
    throw toApiError(error, 'No se pudo actualizar las notificaciones.');
  }
};

// ── Pedidos (Marketplace de Demanda) ─────────────────────────────────────

export const crearPedido = async (data) => {
  try {
    const response = await api.post('/pedidos', data);
    return response.data;
  } catch (error) {
    throw toApiError(error, 'No se pudo publicar el pedido.');
  }
};

export const getPedidosAbiertos = async ({ categoriaId = null, page = 1 } = {}) => {
  try {
    const params = { page };
    if (categoriaId) params.categoria_id = categoriaId;
    const response = await api.get('/pedidos/abiertos', { params });
    return response.data;
  } catch (error) {
    throw toApiError(error, 'No se pudieron cargar los pedidos.');
  }
};

export const getMiCredito = async () => {
  try {
    const response = await api.get('/mi-credito');
    return response.data;
  } catch (error) {
    throw toApiError(error, 'No se pudo obtener el saldo.');
  }
};

export const getCreditosPaquetes = async () => {
  try {
    const response = await api.get('/creditos/paquetes');
    return response.data;
  } catch (error) {
    throw toApiError(error, 'No se pudieron cargar los paquetes de creditos.');
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
    throw toApiError(error, 'No se pudo completar la compra simulada.');
  }
};

export const getCreditosTransacciones = async ({ page = 1, perPage = 15 } = {}) => {
  try {
    const response = await api.get('/creditos/transacciones', {
      params: { page, per_page: perPage },
    });
    return response.data;
  } catch (error) {
    throw toApiError(error, 'No se pudo cargar el historial de creditos.');
  }
};

export const getPremiumMiEstado = async () => {
  try {
    const response = await api.get('/premium/mi-estado');
    return response.data;
  } catch (error) {
    throw toApiError(error, 'No se pudo cargar el estado Premium.');
  }
};

export const activarPremium = async () => {
  try {
    const response = await api.post('/premium/activar');
    return response.data;
  } catch (error) {
    throw toApiError(error, 'No se pudo activar Premium.');
  }
};

export const getPedidoDetalle = async (id) => {
  try {
    const response = await api.get(`/pedidos/${id}`);
    return response.data;
  } catch (error) {
    throw toApiError(error, 'No se pudo cargar el pedido.');
  }
};

export const enviarCotizacion = async (pedidoId, { monto, mensaje }) => {
  try {
    const response = await api.post(`/pedidos/${pedidoId}/cotizaciones`, { monto, mensaje });
    return response.data;
  } catch (error) {
    throw toApiError(error, 'No se pudo enviar la cotización.');
  }
};

export const editarCotizacion = async (pedidoId, cotizacionId, { monto, mensaje }) => {
  try {
    const response = await api.put(`/pedidos/${pedidoId}/cotizaciones/${cotizacionId}`, { monto, mensaje });
    return response.data;
  } catch (error) {
    throw toApiError(error, 'No se pudo actualizar la cotización.');
  }
};

export const aceptarCotizacion = async (pedidoId, cotizacionId) => {
  try {
    const response = await api.post(`/pedidos/${pedidoId}/cotizaciones/${cotizacionId}/aceptar`);
    return response.data;
  } catch (error) {
    throw toApiError(error, 'No se pudo aceptar la cotización.');
  }
};

export const getMisPedidos = async ({ page = 1 } = {}) => {
  try {
    const response = await api.get('/pedidos/mios', { params: { page } });
    return response.data;
  } catch (error) {
    throw toApiError(error, 'No se pudieron cargar tus pedidos.');
  }
};

// ── Admin ─────────────────────────────────────────────────────────────────

export const getAdminStats = async () => {
  try {
    const response = await api.get('/admin/stats');
    return response.data;
  } catch (error) {
    throw toApiError(error, 'No se pudieron cargar las metricas.');
  }
};

export const getAdminUsuarios = async (role = null) => {
  try {
    const params = role ? { role } : {};
    const response = await api.get('/admin/usuarios', { params });
    return response.data;
  } catch (error) {
    throw toApiError(error, 'No se pudieron cargar los usuarios.');
  }
};

export const getAdminProveedores = async () => {
  try {
    const response = await api.get('/admin/proveedores');
    return response.data;
  } catch (error) {
    throw toApiError(error, 'No se pudieron cargar los proveedores.');
  }
};

export const recargarCreditosProveedor = async (proveedorId, { monto, motivo }) => {
  try {
    const response = await api.post(`/admin/proveedores/${proveedorId}/creditos`, { monto, motivo });
    return response.data;
  } catch (error) {
    throw toApiError(error, 'No se pudo agregar creditos al proveedor.');
  }
};

export const getAdminCreditosPremium = async ({ estado = null } = {}) => {
  try {
    const params = estado ? { estado } : {};
    const response = await api.get('/admin/creditos-premium', { params });
    return response.data;
  } catch (error) {
    throw toApiError(error, 'No se pudieron cargar creditos y Premium.');
  }
};

export default api;
