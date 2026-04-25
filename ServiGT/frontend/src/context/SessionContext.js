import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  clearSession,
  getProviderByUser,
  loadStoredSession,
  logout as apiLogout,
} from '../services/api';

const SessionContext = createContext(null);

export function SessionProvider({ children }) {
  const [user, setUser]                         = useState(null);
  const [providerProfile, setProviderProfile]   = useState(null);
  const [sessionLoading, setSessionLoading]     = useState(true);
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [chatParams, setChatParams]             = useState({ userId: null, name: '' });

  useEffect(() => { restore(); }, []);

  const restore = async () => {
    const stored = loadStoredSession();
    if (!stored) { setSessionLoading(false); return; }
    try {
      setUser(stored.user);
      if (stored.user.role === 'proveedor') {
        const data = await getProviderByUser(stored.user.id);
        setProviderProfile(data.proveedor);
      }
    } catch {
      clearSession();
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
