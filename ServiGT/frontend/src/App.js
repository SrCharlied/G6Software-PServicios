import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { registerRootComponent } from 'expo';
import { ToastProvider } from './context/ToastContext';
import Drawer from './components/Drawer';
import { mockProviders } from './data/mockProviders';
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import ProviderDashboardScreen from './screens/ProviderDashboardScreen';
import ProviderDetailScreen from './screens/ProviderDetailScreen';
import ProviderEditProfileScreen from './screens/ProviderEditProfileScreen';
import SolicitudFormScreen from './screens/SolicitudFormScreen';
import ChatScreen from './screens/ChatScreen';
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

// ── Topbar ────────────────────────────────────────────────────────────────────
function TopBar({ onMenuPress, title = 'PServicios' }) {
  return (
    <View style={styles.topBar}>
      <TouchableOpacity onPress={onMenuPress} style={styles.menuBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <View style={styles.hamburger}>
          <View style={styles.hamburgerLine} />
          <View style={styles.hamburgerLine} />
          <View style={styles.hamburgerLine} />
        </View>
      </TouchableOpacity>
      <Text style={styles.topBarTitle}>{title}</Text>
      <View style={styles.menuBtnPlaceholder} />
    </View>
  );
}

// ── Tarjeta de proveedor ──────────────────────────────────────────────────────
function ProviderCard({ prov, onPress }) {
  return (
    <TouchableOpacity style={styles.provCard} activeOpacity={0.88} onPress={onPress}>
      <View style={styles.provHeader}>
        <Text style={styles.provName} numberOfLines={1}>{prov.nombre}</Text>
        <View style={styles.provBadge}>
          <Text style={styles.provBadgeText} numberOfLines={1}>
            {prov.categoria?.nombre || 'Sin categoria'}
          </Text>
        </View>
      </View>
      <Text style={styles.provDesc} numberOfLines={2}>{prov.descripcion}</Text>
      <View style={styles.provMeta}>
        <Text style={styles.provLocation} numberOfLines={1}>
          📍 {[prov.municipio, prov.departamento].filter(Boolean).join(', ')}
        </Text>
        {prov.telefono ? <Text style={styles.provPhone}>{prov.telefono}</Text> : null}
      </View>
      {(prov.tarifa_hora || prov.tarifa_proyecto) ? (
        <View style={styles.tarifaRow}>
          {prov.tarifa_hora    ? <Text style={styles.tarifa}>Q{prov.tarifa_hora}/hr</Text>    : null}
          {prov.tarifa_proyecto ? <Text style={styles.tarifa}>Q{prov.tarifa_proyecto}/proy</Text> : null}
        </View>
      ) : null}
      <View style={styles.cardCta}>
        <Text style={styles.cardCtaText}>Ver perfil →</Text>
      </View>
    </TouchableOpacity>
  );
}

// ── App principal ─────────────────────────────────────────────────────────────
export default function App() {
  const [screen, setScreen]               = useState('home');
  const [user, setUser]                   = useState(null);
  const [providerProfile, setProviderProfile] = useState(null);
  const [sessionLoading, setSessionLoading]   = useState(true);
  const [proveedores, setProveedores]     = useState([]);
  const [loading, setLoading]             = useState(true);
  const [notice, setNotice]               = useState('');
  const [searchQuery, setSearchQuery]     = useState('');
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [chatWithUserId, setChatWithUserId]     = useState(null);
  const [chatWithName, setChatWithName]         = useState('');
  const [drawerOpen, setDrawerOpen]       = useState(false);

  useEffect(() => {
    restoreSession();
    loadProviders();
  }, []);

  const restoreSession = async () => {
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
      setUser(null);
      setProviderProfile(null);
    }
    setSessionLoading(false);
  };

  const loadProviders = async () => {
    setLoading(true);
    setNotice('');
    try {
      const data = await getProviders();
      setProveedores(data.proveedores || []);
    } catch {
      setProveedores(mockProviders);
      setNotice('Modo demo: mostrando proveedores de ejemplo.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = (loggedUser, profile = null) => {
    setUser(loggedUser);
    setProviderProfile(profile);
    setSelectedProvider(null);
    setChatWithUserId(null);
    setChatWithName('');
    setScreen('home');
    loadProviders();
  };

  const handleLogout = async () => {
    await logout();
    setUser(null);
    setProviderProfile(null);
    setSelectedProvider(null);
    setChatWithUserId(null);
    setChatWithName('');
    setScreen('home');
  };

  const handleRegisterSuccess = (loggedUser, profile = null) => {
    setUser(loggedUser);
    setProviderProfile(profile);
    setSelectedProvider(null);
    setChatWithUserId(null);
    setChatWithName('');
    setScreen('home');
    loadProviders();
  };

  const navigate = useCallback((name, params = {}) => {
    if (params.profile)                                               setProviderProfile(params.profile);
    if (params.provider || params.selectedProvider)                   setSelectedProvider(params.provider || params.selectedProvider);
    if (Object.prototype.hasOwnProperty.call(params, 'chatWithUserId')) setChatWithUserId(params.chatWithUserId);
    if (Object.prototype.hasOwnProperty.call(params, 'chatWithName'))   setChatWithName(params.chatWithName || '');
    setScreen(name.toLowerCase());
  }, []);

  const navigation = { navigate };

  // ── Vistas secundarias ────────────────────────────────────────────────────

  if (sessionLoading) {
    return (
      <View style={styles.splashContainer}>
        <Text style={styles.splashTitle}>PServicios</Text>
        <ActivityIndicator size="large" color="#1a73e8" style={{ marginTop: 20 }} />
      </View>
    );
  }

  if (screen === 'login') {
    return <LoginScreen navigation={navigation} onLogin={handleLogin} />;
  }
  if (screen === 'register') {
    return <RegisterScreen navigation={navigation} onRegisterSuccess={handleRegisterSuccess} />;
  }
  if (screen === 'providerdashboard') {
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
  if (screen === 'providereditprofile') {
    return (
      <ProviderEditProfileScreen
        navigation={navigation}
        user={user}
        providerProfile={providerProfile}
        onProfileUpdated={(updated) => {
          setProviderProfile(updated);
          setScreen('providerdashboard');
          loadProviders();
        }}
      />
    );
  }
  if (screen === 'providerdetail') {
    return (
      <ProviderDetailScreen
        navigation={navigation}
        user={user}
        providerProfile={providerProfile}
        selectedProvider={selectedProvider}
      />
    );
  }
  if (screen === 'solicitudform') {
    return (
      <SolicitudFormScreen
        navigation={navigation}
        user={user}
        selectedProvider={selectedProvider}
      />
    );
  }
  if (screen === 'chat') {
    return (
      <ChatScreen
        navigation={navigation}
        user={user}
        chatWithUserId={chatWithUserId}
        chatWithName={chatWithName}
      />
    );
  }

  // ── Filtrado ──────────────────────────────────────────────────────────────
  const normalizedQuery = normalizeText(searchQuery.trim());
  const filteredProviders = proveedores.filter((prov) => {
    if (!normalizedQuery) return true;
    return [prov.nombre, prov.descripcion, prov.departamento, prov.municipio, prov.telefono, prov.categoria?.nombre]
      .some((f) => normalizeText(f).includes(normalizedQuery));
  });

  // ── FlatList header / footer / empty ─────────────────────────────────────
  const ListHeader = (
    <View style={styles.listHeader}>
      {notice ? (
        <View style={styles.noticeBox}>
          <Text style={styles.noticeText}>{notice}</Text>
        </View>
      ) : null}

      {/* Barra de busqueda */}
      <View style={styles.searchBar}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar por nombre, categoria, zona..."
          placeholderTextColor="#9aa3af"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.trim() ? (
          <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.searchClear}>✕</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <View style={styles.sectionRow}>
        <Text style={styles.sectionTitle}>
          {normalizedQuery
            ? `${filteredProviders.length} resultado(s)`
            : `Proveedores (${proveedores.length})`}
        </Text>
        <TouchableOpacity onPress={loadProviders} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.refreshBtn}>↻</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const ListEmpty = loading ? (
    <View style={styles.center}>
      <ActivityIndicator size="large" color="#1a73e8" />
      <Text style={styles.loadingText}>Cargando proveedores...</Text>
    </View>
  ) : (
    <View style={styles.center}>
      <Text style={styles.emptyText}>
        {normalizedQuery
          ? 'Sin resultados para esa busqueda.'
          : 'No hay proveedores disponibles.'}
      </Text>
      <TouchableOpacity
        style={styles.retryBtn}
        onPress={normalizedQuery ? () => setSearchQuery('') : loadProviders}
      >
        <Text style={styles.retryText}>{normalizedQuery ? 'Ver todos' : 'Reintentar'}</Text>
      </TouchableOpacity>
    </View>
  );

  const ListFooter = (
    <Text style={styles.footerText}>PServicios Guatemala · Grupo 6 · Ingenieria de Software</Text>
  );

  // ── Home screen ───────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />

      <TopBar onMenuPress={() => setDrawerOpen(true)} />

      <FlatList
        data={loading ? [] : filteredProviders}
        keyExtractor={(item) => String(item.id)}
        renderItem={useCallback(({ item }) => (
          <ProviderCard
            prov={item}
            onPress={() => navigation.navigate('ProviderDetail', { provider: item })}
          />
        ), [navigation])}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={ListEmpty}
        ListFooterComponent={ListFooter}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        removeClippedSubviews
        initialNumToRender={8}
        maxToRenderPerBatch={10}
        windowSize={5}
      />

      <Drawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        user={user}
        navigation={navigation}
        onLogout={handleLogout}
      />
    </SafeAreaView>
  );
}

// ── Estilos ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  splashContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  splashTitle: { fontSize: 36, fontWeight: 'bold', color: '#1a73e8' },

  container: { flex: 1, backgroundColor: '#f4f6f9' },

  // TopBar
  topBar: {
    height: 56,
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e8ecf1',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  menuBtn: { padding: 4 },
  menuBtnPlaceholder: { width: 32 },
  hamburger: { gap: 5, paddingVertical: 2 },
  hamburgerLine: { width: 22, height: 2, backgroundColor: '#333', borderRadius: 2 },
  topBarTitle: { fontSize: 18, fontWeight: '700', color: '#1a73e8', letterSpacing: 0.3 },

  // Lista
  listContent: { paddingBottom: 32 },
  listHeader: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 4 },

  // Notice
  noticeBox: {
    backgroundColor: '#fff7e6',
    borderWidth: 1,
    borderColor: '#f0c36d',
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
  },
  noticeText: { color: '#8a5a00', fontSize: 13, lineHeight: 18 },

  // Search bar
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#dde3ea',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 14,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  searchIcon: { fontSize: 16 },
  searchInput: { flex: 1, fontSize: 15, color: '#333', paddingVertical: 0 },
  searchClear: { fontSize: 16, color: '#aaa', fontWeight: '600' },

  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#444' },
  refreshBtn: { fontSize: 20, color: '#1a73e8', fontWeight: '700' },

  // Tarjeta proveedor
  provCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 4,
    elevation: 2,
  },
  provHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  provName: { fontSize: 16, fontWeight: '700', color: '#1a1a2e', flex: 1 },
  provBadge: {
    backgroundColor: '#eef4ff',
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 10,
    maxWidth: 120,
  },
  provBadgeText: { fontSize: 11, color: '#1a73e8', fontWeight: '600' },
  provDesc: { fontSize: 13, color: '#667085', lineHeight: 19, marginBottom: 8 },
  provMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  provLocation: { fontSize: 12, color: '#9aa3af', flex: 1 },
  provPhone: { fontSize: 12, color: '#1a73e8', fontWeight: '600' },
  tarifaRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  tarifa: {
    fontSize: 12,
    color: '#27ae60',
    fontWeight: '600',
    backgroundColor: '#f0faf4',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  cardCta: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f0f4f8',
  },
  cardCtaText: { fontSize: 13, color: '#1a73e8', fontWeight: '700' },

  // Estados vacíos
  center: { padding: 48, alignItems: 'center' },
  loadingText: { marginTop: 14, fontSize: 15, color: '#667085' },
  emptyText: { fontSize: 15, color: '#667085', textAlign: 'center', marginBottom: 20 },
  retryBtn: {
    backgroundColor: '#1a73e8',
    paddingHorizontal: 24,
    paddingVertical: 11,
    borderRadius: 8,
  },
  retryText: { color: '#fff', fontSize: 15, fontWeight: '600' },

  // Footer
  footerText: { textAlign: 'center', fontSize: 11, color: '#bcc5d0', paddingVertical: 20 },
});

function Root() {
  return (
    <ToastProvider>
      <App />
    </ToastProvider>
  );
}

registerRootComponent(Root);
