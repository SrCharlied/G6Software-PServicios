import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  clearSession,
  getMe,
  getMiProveedor,
  loadStoredSession,
  logout as apiLogout,
  saveSession,
  setUnauthorizedHandler,
} from '../services/api';

const SessionContext = createContext(null);

export function SessionProvider({ children }) {
  const [user, setUser] = useState(null);
  const [providerProfile, setProviderProfile] = useState(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [chatParams, setChatParams] = useState({ userId: null, name: '' });

  const clearLocalSession = useCallback(async () => {
    await clearSession();
    setUser(null);
    setProviderProfile(null);
    setSelectedProvider(null);
    setChatParams({ userId: null, name: '' });
  }, []);

  useEffect(() => setUnauthorizedHandler(clearLocalSession), [clearLocalSession]);
  useEffect(() => { restore(); }, []);

  const restore = async () => {
    const stored = await loadStoredSession();
    if (!stored?.token) { setSessionLoading(false); return; }
    try {
      const meData = await getMe({ skipUnauthorizedHandler: true });
      const currentUser = meData.user;

      if (currentUser?.role === 'proveedor') {
        const data = await getMiProveedor();
        setProviderProfile(data.proveedor);
      } else {
        setProviderProfile(null);
      }

      setUser(currentUser);
      await saveSession(stored.token, currentUser);
    } catch {
      await clearLocalSession();
    }
    setSessionLoading(false);
  };

  const signIn = useCallback((loggedUser, profile = null) => {
    setUser(loggedUser);
    setProviderProfile(profile);
  }, []);

  const signOut = useCallback(async () => {
    await apiLogout();
    clearLocalSession();
  }, [clearLocalSession]);

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
