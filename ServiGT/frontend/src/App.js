import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { registerRootComponent } from 'expo';
import { mockProviders } from './data/mockProviders';
import {
  buildAppPath,
  getBasePath,
  getCurrentRoute,
  parseRouteFromPath,
} from './router/routes';
import AdminDashboardScreen from './screens/AdminDashboardScreen';
import ChatScreen from './screens/ChatScreen';
import HomeScreen from './screens/HomeScreen';
import LoginScreen from './screens/LoginScreen';
import ProviderDashboardScreen from './screens/ProviderDashboardScreen';
import ProviderDetailScreen from './screens/ProviderDetailScreen';
import ProviderEditProfileScreen from './screens/ProviderEditProfileScreen';
import RegisterScreen from './screens/RegisterScreen';
import SolicitudFormScreen from './screens/SolicitudFormScreen';
import {
  clearSession,
  getProviderByUser,
  getProviders,
  loadStoredSession,
  logout,
} from './services/api';

const normalizeText = (value) =>
  (value || '')
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

const homeForRole = (role) => {
  if (role === 'admin') return 'AdminDashboard';
  if (role === 'proveedor') return 'ProviderDashboard';
  return 'Home';
};

export default function App() {
  const [basePath] = useState(() => {
    if (typeof window === 'undefined') return '';
    return getBasePath(window.location.pathname);
  });
  const [route, setRoute] = useState(() => getCurrentRoute(basePath));
  const [user, setUser] = useState(null);
  const [providerProfile, setProviderProfile] = useState(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [proveedores, setProveedores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoria, setCategoria] = useState('');
  const [categoriaAplicada, setCategoriaAplicada] = useState('');
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [chatWithUserId, setChatWithUserId] = useState(null);
  const [chatWithName, setChatWithName] = useState('');

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const handlePopState = () => {
      setRoute(getCurrentRoute(basePath));
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [basePath]);

  useEffect(() => {
    restoreSession();
    loadProviders('');
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') return;

    const titles = {
      home: 'ServiGT | Inicio',
      login: 'ServiGT | Login',
      register: 'ServiGT | Registro',
      providerdashboard: 'ServiGT | Panel del proveedor',
      providereditprofile: 'ServiGT | Editar perfil',
      admindashboard: 'ServiGT | Panel de administrador',
      providerdetail: 'ServiGT | Perfil del proveedor',
      solicitudform: 'ServiGT | Solicitar servicio',
      chat: 'ServiGT | Chat',
      notfound: 'ServiGT | Pagina no encontrada',
    };

    document.title = titles[route.name] || 'ServiGT';
  }, [route.name]);

  useEffect(() => {
    if (sessionLoading) return;

    if (route.name === 'root') {
      navigate(user ? homeForRole(user.role) : 'Login', {}, { replace: true });
      return;
    }

    if (!user && route.name === 'home') {
      navigate('Login', {}, { replace: true });
      return;
    }

    const providerOnlyRoutes = ['providerdashboard', 'providereditprofile'];
    if (providerOnlyRoutes.includes(route.name) && (!user || user.role !== 'proveedor')) {
      navigate('Login', {}, { replace: true });
      return;
    }

    if (route.name === 'admindashboard' && (!user || user.role !== 'admin')) {
      navigate('Login', {}, { replace: true });
      return;
    }

    const authRequiredRoutes = ['solicitudform', 'chat'];
    if (authRequiredRoutes.includes(route.name) && !user) {
      navigate('Login', {}, { replace: true });
      return;
    }

    if (user && ['login', 'register'].includes(route.name)) {
      navigate(homeForRole(user.role), {}, { replace: true });
      return;
    }

    if (!user && route.name === 'providerdetail') {
      navigate('Login', {}, { replace: true });
    }
  }, [route.name, sessionLoading, user]);

  const syncRoute = (path, { replace = false } = {}) => {
    if (typeof window !== 'undefined') {
      const currentPath = `${window.location.pathname}${window.location.search}`;
      if (currentPath !== path) {
        window.history[replace ? 'replaceState' : 'pushState']({}, '', path);
      }
    }

    setRoute(parseRouteFromPath(path, basePath));
  };

  const restoreSession = async () => {
    const stored = loadStoredSession();
    if (!stored) {
      setSessionLoading(false);
      return;
    }

    try {
      setUser(stored.user);
      if (stored.user.role === 'proveedor') {
        const data = await getProviderByUser(stored.user.id);
        setProviderProfile(data.proveedor);
      }
    } catch {
      clearSession();
      setUser(null);
      setProviderProfile(null);
    }

    setSessionLoading(false);
  };

  const loadProviders = async (categoriaValue = categoriaAplicada) => {
    setLoading(true);
    setNotice('');
    try {
      const data = await getProviders(categoriaValue);
      setProveedores(data.proveedores || []);
    } catch (error) {
      setProveedores(mockProviders);
      setNotice('Modo demo activo: mostrando proveedores de ejemplo.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleCategoriaSubmit = () => {
    const value = categoria.trim();
    setCategoriaAplicada(value);
    loadProviders(value);
  };

  const clearCategoria = () => {
    setCategoria('');
    setCategoriaAplicada('');
    loadProviders('');
  };

  const handleLogin = (loggedUser, profile = null) => {
    setUser(loggedUser);
    setProviderProfile(profile);
    setSelectedProvider(null);
    setChatWithUserId(null);
    setChatWithName('');
    loadProviders();
    navigate(homeForRole(loggedUser.role), {}, { replace: true });
  };

  const handleLogout = async () => {
    await logout();
    setUser(null);
    setProviderProfile(null);
    setSelectedProvider(null);
    setChatWithUserId(null);
    setChatWithName('');
    navigate('Home', {}, { replace: true });
  };

  const handleRegisterSuccess = (loggedUser, profile = null) => {
    setUser(loggedUser);
    setProviderProfile(profile);
    setSelectedProvider(null);
    setChatWithUserId(null);
    setChatWithName('');
    loadProviders();
    navigate(homeForRole(loggedUser.role), {}, { replace: true });
  };

  const navigate = (name, params = {}, options = {}) => {
    const routeName = String(name || 'Home').toLowerCase();

    if (params.profile) {
      setProviderProfile(params.profile);
    }
    if (params.provider || params.selectedProvider) {
      setSelectedProvider(params.provider || params.selectedProvider);
    }
    if (Object.prototype.hasOwnProperty.call(params, 'chatWithUserId')) {
      setChatWithUserId(params.chatWithUserId);
    }
    if (Object.prototype.hasOwnProperty.call(params, 'chatWithName')) {
      setChatWithName(params.chatWithName || '');
    }

    if (!['providerdetail', 'solicitudform'].includes(routeName)) {
      setSelectedProvider(null);
    }

    if (routeName !== 'chat' && !Object.prototype.hasOwnProperty.call(params, 'chatWithUserId')) {
      setChatWithUserId(null);
      setChatWithName('');
    }

    syncRoute(buildAppPath(routeName, params, basePath), options);
  };

  const navigation = { navigate };

  const normalizedQuery = normalizeText(searchQuery.trim());
  const categoriaQuery = categoriaAplicada.trim();
  const hasActiveFilters = Boolean(normalizedQuery || categoriaQuery);
  const filteredProviders = proveedores.filter((prov) => {
    if (!normalizedQuery) return true;
    const fields = [
      prov.nombre,
      prov.descripcion,
      prov.departamento,
      prov.municipio,
      prov.telefono,
      prov.categoria?.nombre,
    ];
    return fields.some((field) => normalizeText(field).includes(normalizedQuery));
  });

  if (sessionLoading) {
    return (
      <View style={styles.splashContainer}>
        <Text style={styles.splashTitle}>ServiGT</Text>
        <ActivityIndicator size="large" color="#1a73e8" style={styles.splashLoader} />
      </View>
    );
  }

  if (route.name === 'login') {
    return <LoginScreen navigation={navigation} onLogin={handleLogin} />;
  }

  if (route.name === 'register') {
    return <RegisterScreen navigation={navigation} onRegisterSuccess={handleRegisterSuccess} />;
  }

  if (route.name === 'admindashboard') {
    return (
      <AdminDashboardScreen
        navigation={navigation}
        user={user}
        onLogout={handleLogout}
      />
    );
  }

  if (route.name === 'providerdashboard') {
    return (
      <ProviderDashboardScreen
        navigation={navigation}
        user={user}
        providerProfile={providerProfile}
        setProviderProfile={setProviderProfile}
        onLogout={handleLogout}
      />
    );
  }

  if (route.name === 'providereditprofile') {
    return (
      <ProviderEditProfileScreen
        navigation={navigation}
        user={user}
        providerProfile={providerProfile}
        onProfileUpdated={(updated) => {
          setProviderProfile(updated);
          loadProviders();
          navigate('ProviderDashboard', {}, { replace: true });
        }}
      />
    );
  }

  if (route.name === 'providerdetail') {
    return (
      <ProviderDetailScreen
        navigation={navigation}
        user={user}
        providerProfile={providerProfile}
        selectedProvider={selectedProvider}
        providerId={route.providerId}
      />
    );
  }

  if (route.name === 'solicitudform') {
    return (
      <SolicitudFormScreen
        navigation={navigation}
        user={user}
        selectedProvider={selectedProvider}
        providerId={route.providerId}
      />
    );
  }

  if (route.name === 'chat') {
    return (
      <ChatScreen
        navigation={navigation}
        user={user}
        chatWithUserId={route.chatWithUserId || chatWithUserId}
        chatWithName={route.chatWithName || chatWithName}
      />
    );
  }

  if (route.name === 'notfound') {
    return (
      <View style={styles.splashContainer}>
        <Text style={styles.splashTitle}>ServiGT</Text>
        <Text style={styles.notFoundText}>La pagina que buscas no existe.</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => navigation.navigate('Home')}>
          <Text style={styles.retryText}>Ir al inicio</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <HomeScreen
      user={user}
      providers={proveedores}
      loading={loading}
      notice={notice}
      categoria={categoria}
      categoriaAplicada={categoriaAplicada}
      searchQuery={searchQuery}
      hasActiveFilters={hasActiveFilters}
      onCategoriaChange={setCategoria}
      onCategoriaSubmit={handleCategoriaSubmit}
      onCategoriaClear={clearCategoria}
      onSearchChange={setSearchQuery}
      onRetry={loadProviders}
      onLogout={handleLogout}
      onNavigate={navigate}
      categoriaQuery={categoriaQuery}
      normalizedQuery={normalizedQuery}
      filteredProviders={filteredProviders}
    />
  );
}

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  splashTitle: { fontSize: 36, fontWeight: 'bold', color: '#1a73e8' },
  splashLoader: { marginTop: 20 },
  notFoundText: { marginTop: 12, marginBottom: 20, fontSize: 16, color: '#667085' },
  retryBtn: {
    backgroundColor: '#1a73e8',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});

registerRootComponent(App);
