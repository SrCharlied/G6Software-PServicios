import axios from 'axios';

const DEFAULT_API_URL = 'http://localhost:8080/api';
const BASE_URL = process.env.EXPO_PUBLIC_API_URL || DEFAULT_API_URL;

const TOKEN_KEY = 'pservicios_token';
const USER_KEY  = 'pservicios_user';

// ── Persistencia en localStorage (solo web) ───────────────────────────────

const storage = {
  get: (key) => {
    try {
      return typeof window !== 'undefined'
        ? window.localStorage.getItem(key)
        : null;
    } catch {
      return null;
    }
  },
  set: (key, value) => {
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, value);
      }
    } catch { /* ignorar */ }
  },
  remove: (key) => {
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(key);
      }
    } catch { /* ignorar */ }
  },
};

// ── Instancia Axios ───────────────────────────────────────────────────────

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000,
});

// Interceptor de request: inyectar token Bearer si existe
api.interceptors.request.use((config) => {
  const token = storage.get(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Manejo centralizado de errores ────────────────────────────────────────

const getErrorMessage = (error, fallbackMessage) => {
  if (error.response?.data?.errors) {
    const first = Object.values(error.response.data.errors)[0];
    return Array.isArray(first) ? first[0] : first;
  }
  if (error.response?.data?.message) {
    return error.response.data.message;
  }
  if (error.code === 'ECONNABORTED') {
    return 'La solicitud tomo demasiado tiempo. Verifica tu conexion.';
  }
  if (error.request) {
    return 'No se pudo conectar con el servidor. Verifica que el backend este corriendo.';
  }
  return fallbackMessage;
};

// ── Token helpers (exportados para App.js) ────────────────────────────────

export const saveSession = (token, user) => {
  storage.set(TOKEN_KEY, token);
  storage.set(USER_KEY, JSON.stringify(user));
};

export const clearSession = () => {
  storage.remove(TOKEN_KEY);
  storage.remove(USER_KEY);
};

export const loadStoredSession = () => {
  const token = storage.get(TOKEN_KEY);
  const raw   = storage.get(USER_KEY);
  if (!token || !raw) return null;
  try {
    return { token, user: JSON.parse(raw) };
  } catch {
    return null;
  }
};

// ── Autenticacion ─────────────────────────────────────────────────────────

export const login = async (email, password) => {
  try {
    const response = await api.post('/login', { email, password });
    const { user, token } = response.data;
    saveSession(token, user);
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, 'No se pudo iniciar sesion.'));
  }
};

export const register = async (name, email, password, role) => {
  try {
    const response = await api.post('/register', { name, email, password, role });
    const { user, token } = response.data;
    saveSession(token, user);
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, 'No se pudo registrar el usuario.'));
  }
};

export const logout = async () => {
  try {
    await api.post('/logout');
  } catch { /* ignorar errores de red en logout */ }
  finally {
    clearSession();
  }
};

export const getMe = async () => {
  try {
    const response = await api.get('/me');
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, 'No se pudo obtener el usuario.'));
  }
};

// ── Categorias ────────────────────────────────────────────────────────────

export const getCategorias = async () => {
  try {
    const response = await api.get('/categorias');
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, 'No se pudieron cargar las categorias.'));
  }
};

// ── Proveedores ───────────────────────────────────────────────────────────

export const getProviders = async (categoria = '') => {
  try {
    const params = categoria?.trim() ? { categoria: categoria.trim() } : {};
    const response = await api.get('/providers', { params });
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, 'No se pudo cargar la lista de proveedores.'));
  }
};

export const getProvider = async (id) => {
  try {
    const response = await api.get(`/providers/${id}`);
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, 'No se pudo cargar el proveedor.'));
  }
};

export const getProviderByUser = async (userId) => {
  try {
    const response = await api.get(`/providers/user/${userId}`);
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, 'No se encontro el perfil de proveedor.'));
  }
};

export const createProvider = async (data) => {
  try {
    const response = await api.post('/providers', data);
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, 'No se pudo crear el perfil de proveedor.'));
  }
};

export const updateProvider = async (id, data) => {
  try {
    const response = await api.put(`/providers/${id}`, data);
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, 'No se pudo actualizar el perfil.'));
  }
};

// ── Documentos ────────────────────────────────────────────────────────────

export const getDocumentos = async (proveedorId) => {
  try {
    const response = await api.get(`/providers/${proveedorId}/documentos`);
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, 'No se pudieron cargar los documentos.'));
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
    throw new Error(getErrorMessage(error, 'No se pudo subir el documento.'));
  }
};

// ── Servicios / Solicitudes ───────────────────────────────────────────────

export const createServicio = async (data) => {
  try {
    const response = await api.post('/servicios', data);
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, 'No se pudo enviar la solicitud.'));
  }
};

export const getServicio = async (id) => {
  try {
    const response = await api.get(`/servicios/${id}`);
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, 'No se pudo cargar el servicio.'));
  }
};

export const getSolicitudesProveedor = async (estado = null) => {
  try {
    const params = estado ? { estado } : {};
    const response = await api.get('/servicios/proveedor', { params });
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, 'No se pudieron cargar las solicitudes.'));
  }
};

export const getSolicitudesCliente = async (estado = null) => {
  try {
    const params = estado ? { estado } : {};
    const response = await api.get('/servicios/cliente', { params });
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, 'No se pudieron cargar tus solicitudes.'));
  }
};

export const aceptarServicio = async (id) => {
  try {
    const response = await api.post(`/servicios/${id}/aceptar`);
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, 'No se pudo aceptar la solicitud.'));
  }
};

export const rechazarServicio = async (id, motivo = '') => {
  try {
    const response = await api.post(`/servicios/${id}/rechazar`, { motivo });
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, 'No se pudo rechazar la solicitud.'));
  }
};

export const actualizarEstadoServicio = async (id, estado) => {
  try {
    const response = await api.put(`/servicios/${id}/estado`, { estado });
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, 'No se pudo actualizar el estado.'));
  }
};

// ── Disponibilidad ────────────────────────────────────────────────────────

export const getDisponibilidadProveedor = async (proveedorId) => {
  try {
    const response = await api.get(`/providers/${proveedorId}/disponibilidad`);
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, 'No se pudo cargar la disponibilidad.'));
  }
};

export const getMiDisponibilidad = async () => {
  try {
    const response = await api.get('/disponibilidad/mia');
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, 'No se pudo cargar tu disponibilidad.'));
  }
};

export const saveDisponibilidad = async (disponibilidad) => {
  try {
    const response = await api.post('/disponibilidad', { disponibilidad });
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, 'No se pudo guardar la disponibilidad.'));
  }
};

// ── Calificaciones ────────────────────────────────────────────────────────

export const createCalificacion = async (data) => {
  try {
    const response = await api.post('/calificaciones', data);
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, 'No se pudo enviar la calificacion.'));
  }
};

export const getCalificacionesProveedor = async (proveedorId) => {
  try {
    const response = await api.get(`/providers/${proveedorId}/calificaciones`);
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, 'No se pudieron cargar las calificaciones.'));
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
    throw new Error(getErrorMessage(error, 'No se pudo enviar el mensaje.'));
  }
};

export const getConversacion = async (otroUsuarioId) => {
  try {
    const response = await api.get(`/mensajes/conversacion/${otroUsuarioId}`);
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, 'No se pudo cargar la conversacion.'));
  }
};

export const getMisConversaciones = async () => {
  try {
    const response = await api.get('/mensajes/conversaciones');
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, 'No se pudieron cargar las conversaciones.'));
  }
};

// ── Notificaciones ────────────────────────────────────────────────────────

export const getNotificaciones = async () => {
  try {
    const response = await api.get('/notificaciones');
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, 'No se pudieron cargar las notificaciones.'));
  }
};

export const marcarNotificacionLeida = async (id) => {
  try {
    const response = await api.put(`/notificaciones/${id}/leer`);
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, 'No se pudo marcar como leida.'));
  }
};

export const marcarTodasLeidas = async () => {
  try {
    const response = await api.put('/notificaciones/leer-todas');
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, 'No se pudo actualizar las notificaciones.'));
  }
};

export default api;
