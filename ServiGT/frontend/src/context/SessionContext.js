import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  clearSession,
  getMiProveedor,
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

  useEffect(() => { restore(); }, []);

  const restore = async () => {
    const stored = loadStoredSession();
    if (!stored) { setSessionLoading(false); return; }
    try {
      if (stored.user.role === 'proveedor') {
        const data = await getMiProveedor();
        setProviderProfile(data.proveedor);
      }
      setUser(stored.user);
    } catch {
      clearSession();
      setUser(null);
      setProviderProfile(null);
    }
    setSessionLoading(false);
  };

  const signIn = useCallback((loggedUser, profile = null) => {
    setUser(loggedUser);
    setProviderProfile(profile);
  }, []);

  const signOut = useCallback(async () => {
    await apiLogout();
    setUser(null);
    setProviderProfile(null);
    setSelectedProvider(null);
    setChatParams({ userId: null, name: '' });
  }, []);

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
