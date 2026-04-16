import axios from 'axios';

const DEFAULT_API_URL = 'http://localhost:8080/api';
const BASE_URL = process.env.EXPO_PUBLIC_API_URL || DEFAULT_API_URL;

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

const getErrorMessage = (error, fallbackMessage) => {
  if (error.response?.data?.message) {
    return error.response.data.message;
  }

  if (error.request) {
    return 'El backend no esta disponible en este momento.';
  }

  return fallbackMessage;
};

export const login = async (email, password) => {
  try {
    const response = await api.post('/login', { email, password });
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, 'No se pudo iniciar sesion.'));
  }
};

export const register = async (name, email, password, role) => {
  try {
    const response = await api.post('/register', { name, email, password, role });
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, 'No se pudo registrar el usuario.'));
  }
};

export const getProviders = async () => {
  try {
    const response = await api.get('/providers');
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, 'No se pudo cargar la lista de proveedores.'));
  }
};

export default api;
