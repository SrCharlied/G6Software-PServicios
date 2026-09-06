import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import {
  alInvalidarSesion,
  clearPrivateData,
  clearSession,
  getMe,
  getMiProveedor,
  inicializarSesion,
  loadStoredSession,
  logout as apiLogout,
} from '../services/api';

const SessionContext = createContext(null);

export function SessionProvider({ children }) {
  const [user, setUser] = useState(null);
  const [providerProfile, setProviderProfile] = useState(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [chatParams, setChatParams] = useState({ userId: null, name: '' });
  // Publicacion elegida en el perfil publico antes de abrir el formulario de
  // solicitud (task 5.6). Es contexto de navegacion, no una fuente de verdad:
  // el backend deriva proveedor, categoria y precio de la fila real.
  const [selectedPublicacion, setSelectedPublicacion] = useState(null);

  // Se limpia el estado en memoria cuando el interceptor detecta un 401.
  // `api.js` ya garantiza que esto se dispara una sola vez aunque varias
  // peticiones fallen a la vez, asi que aqui no hace falta otro candado.
  const limpiarEstado = useCallback(() => {
    setUser(null);
    setProviderProfile(null);
    setSelectedProvider(null);
    setSelectedPublicacion(null);
    setChatParams({ userId: null, name: '' });
  }, []);

  const limpiarEstadoRef = useRef(limpiarEstado);
  limpiarEstadoRef.current = limpiarEstado;

  useEffect(() => alInvalidarSesion(() => limpiarEstadoRef.current()), []);

  useEffect(() => { restore(); }, []);

  /**
   * Restauracion de sesion (task 3.3).
   *
   * Antes esto confiaba en el `user` guardado en el dispositivo: bastaba con
   * editar `servigt_user` en localStorage y poner `role: "admin"` para que la
   * app montara el dashboard de administrador. Las peticiones al backend
   * seguian fallando, pero la navegacion y la UI ya se habian abierto.
   *
   * Ahora el rol se vuelve a pedir a `/me` en cada arranque: el dispositivo
   * solo aporta el token, y quien decide quien eres es el backend.
   */
  const restore = async () => {
    // El token vive en SecureStore/AsyncStorage en nativo (task 3.4), que son
    // asincronos: hay que hidratar antes de leer nada.
    await inicializarSesion();

    const stored = loadStoredSession();
    if (!stored) { setSessionLoading(false); return; }

    try {
      const { user: usuarioVerificado } = await getMe();

      if (usuarioVerificado?.role === 'proveedor') {
        try {
          const data = await getMiProveedor();
          setProviderProfile(data.proveedor);
        } catch (error) {
          // Un proveedor recien registrado puede no tener perfil todavia: eso
          // es un 404 esperado y no debe cerrar la sesion. Cualquier otra cosa
          // si se propaga al catch de afuera.
          if (error?.status !== 404) throw error;
          setProviderProfile(null);
        }
      }

      setUser(usuarioVerificado);
    } catch {
      // El interceptor ya limpio el almacenamiento si fue un 401; esto cubre
      // el resto de fallos (red, 500) dejando la app en estado desconectado en
      // vez de con una sesion a medias.
      clearSession();
      limpiarEstado();
    }

    setSessionLoading(false);
  };

  const signIn = useCallback((loggedUser, profile = null) => {
    setUser(loggedUser);
    setProviderProfile(profile);
  }, []);

  const signOut = useCallback(async () => {
    // `apiLogout` ya borra token, perfil y cache de chat aunque falle la red.
    await apiLogout();
    await clearPrivateData();
    limpiarEstado();
  }, [limpiarEstado]);

  return (
    <SessionContext.Provider value={{
      user,
      providerProfile,
      setProviderProfile,
      sessionLoading,
      signIn,
      signOut,
      selectedProvider,
      setSelectedProvider,
      selectedPublicacion,
      setSelectedPublicacion,
      chatParams,
      setChatParams,
    }}>
      {children}
    </SessionContext.Provider>
  );
}

export const useSession = () => {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession debe usarse dentro de SessionProvider');
  return ctx;
};
