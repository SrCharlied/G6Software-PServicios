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
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSession } from '../context/SessionContext';
import Drawer from '../components/Drawer';
import ServiGTLogo from '../components/ServiGTLogo';
import { getProviders, storageUrl } from '../services/api';
import { mockProviders } from '../data/mockProviders';
import { T } from '../theme';
import { Image } from 'react-native';

const normalizeText = (value) =>
  (value || '').toString().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

function TopBar({ onMenuPress }) {
  return (
    <View style={styles.topBar}>
      <TouchableOpacity onPress={onMenuPress} style={styles.menuBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <View style={styles.hamburger}>
          <View style={styles.hamburgerLine} />
          <View style={styles.hamburgerLine} />
          <View style={styles.hamburgerLine} />
        </View>
      </TouchableOpacity>
      <ServiGTLogo size={18} mode="dark" />
      <View style={styles.menuBtnPlaceholder} />
    </View>
  );
}

function ProviderCard({ prov, onPress }) {
  const photoUri = storageUrl(prov.foto_perfil);
  const initial = (prov.nombre || '?')[0].toUpperCase();

  return (
    <TouchableOpacity style={styles.provCard} activeOpacity={0.88} onPress={onPress}>
      <View style={styles.provHeader}>
        <View style={styles.provHeaderLeft}>
          {photoUri ? (
            <Image source={{ uri: photoUri }} style={styles.provAvatarImg} />
          ) : (
            <View style={styles.provAvatar}>
              <Text style={styles.provAvatarInitial}>{initial}</Text>
            </View>
          )}
          <Text style={styles.provName} numberOfLines={1}>{prov.nombre}</Text>
        </View>
        <View style={styles.provBadge}>
          <Text style={styles.provBadgeText} numberOfLines={1}>
            {prov.categoria?.nombre || 'Sin categoria'}
          </Text>
        </View>
      </View>
      <Text style={styles.provDesc} numberOfLines={2}>{prov.descripcion}</Text>
      <View style={styles.provMeta}>
        <Text style={styles.provLocation} numberOfLines={1}>
          {[prov.municipio, prov.departamento].filter(Boolean).join(', ')}
        </Text>
        {prov.telefono ? <Text style={styles.provPhone}>{prov.telefono}</Text> : null}
      </View>
      {(prov.tarifa_hora || prov.tarifa_proyecto) ? (
        <View style={styles.tarifaRow}>
          {prov.tarifa_hora     ? <Text style={styles.tarifa}>Q{prov.tarifa_hora}/hr</Text>     : null}
          {prov.tarifa_proyecto ? <Text style={styles.tarifa}>Q{prov.tarifa_proyecto}/proy</Text> : null}
        </View>
      ) : null}
      <View style={styles.cardCta}>
        <Text style={styles.cardCtaText}>Ver perfil →</Text>
      </View>
    </TouchableOpacity>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const { setSelectedProvider, user } = useSession();

  const [proveedores, setProveedores] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [notice, setNotice]           = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [drawerOpen, setDrawerOpen]   = useState(false);

  useEffect(() => { loadProviders(); }, []);

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

  const normalizedQuery   = normalizeText(searchQuery.trim());
  const filteredProviders = proveedores.filter((prov) => {
    if (!normalizedQuery) return true;
    return [prov.nombre, prov.descripcion, prov.departamento, prov.municipio, prov.telefono, prov.categoria?.nombre]
      .some((f) => normalizeText(f).includes(normalizedQuery));
  });

  const handleProviderPress = useCallback((prov) => {
    setSelectedProvider(prov);
    router.push(`/providers/${prov.id}`);
  }, [router, setSelectedProvider]);

  const ListHeader = (
    <View style={styles.listHeader}>
      {notice ? (
        <View style={styles.noticeBox}>
          <Text style={styles.noticeText}>{notice}</Text>
        </View>
      ) : null}

      {/* CTA Marketplace de Demanda */}
      {user && user.role !== 'proveedor' ? (
        <TouchableOpacity
          style={styles.ctaBanner}
          activeOpacity={0.88}
          onPress={() => router.push('/pedidos/publicar')}
        >
          <View style={styles.ctaLeft}>
            <Text style={styles.ctaTitle}>Publica tu problema</Text>
            <Text style={styles.ctaDesc}>Recibe propuestas de proveedores verificados</Text>
          </View>
          <Text style={styles.ctaArrow}>→</Text>
        </TouchableOpacity>
      ) : null}

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
      <ActivityIndicator size="large" color="#4589d4" />
      <Text style={styles.loadingText}>Cargando proveedores...</Text>
    </View>
  ) : (
    <View style={styles.center}>
      <Text style={styles.emptyText}>
        {normalizedQuery ? 'Sin resultados para esa busqueda.' : 'No hay proveedores disponibles.'}
      </Text>
      <TouchableOpacity
        style={styles.retryBtn}
        onPress={normalizedQuery ? () => setSearchQuery('') : loadProviders}
      >
        <Text style={styles.retryText}>{normalizedQuery ? 'Ver todos' : 'Reintentar'}</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <TopBar onMenuPress={() => setDrawerOpen(true)} />
      <FlatList
        data={loading ? [] : filteredProviders}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <ProviderCard prov={item} onPress={() => handleProviderPress(item)} />
        )}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={ListEmpty}
        ListFooterComponent={
          <Text style={styles.footerText}>ServiGT Guatemala</Text>
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        initialNumToRender={8}
        maxToRenderPerBatch={10}
        windowSize={5}
      />
      <Drawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.canvas },
  topBar: {
    height: 56,
    backgroundColor: T.paper,
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
  topBarTitle: { fontSize: 18, fontWeight: '700', color: '#4589d4', letterSpacing: 0.3 },
  listContent: { paddingBottom: 32 },
  listHeader: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 4 },
  noticeBox: {
    backgroundColor: '#fff7e6', borderWidth: 1, borderColor: '#f0c36d',
    borderRadius: 10, padding: 12, marginBottom: 14,
  },
  noticeText: { color: '#8a5a00', fontSize: 13, lineHeight: 18 },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: T.white,
    borderWidth: 1, borderColor: '#dde3ea', borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 10, marginBottom: 14, gap: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 2, elevation: 1,
  },
  searchIcon: { fontSize: 16 },
  searchInput: { flex: 1, fontSize: 15, color: '#333', paddingVertical: 0 },
  searchClear: { fontSize: 16, color: '#aaa', fontWeight: '600' },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#444' },
  refreshBtn: { fontSize: 20, color: '#4589d4', fontWeight: '700' },
  provCard: {
    backgroundColor: T.paper, borderRadius: 14,
    marginHorizontal: 16, marginBottom: 12, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07, shadowRadius: 4, elevation: 2,
  },
  provHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 6 },
  provHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  provAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#4589d4', justifyContent: 'center', alignItems: 'center' },
  provAvatarImg: { width: 40, height: 40, borderRadius: 20 },
  provAvatarInitial: { fontSize: 16, fontWeight: '700', color: '#fff' },
  provName: { fontSize: 16, fontWeight: '700', color: T.ink, flex: 1 },
  provBadge: { backgroundColor: '#eef4ff', paddingHorizontal: 9, paddingVertical: 3, borderRadius: 10, maxWidth: 120 },
  provBadgeText: { fontSize: 11, color: '#4589d4', fontWeight: '600' },
  provDesc: { fontSize: 13, color: '#667085', lineHeight: 19, marginBottom: 8 },
  provMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  provLocation: { fontSize: 12, color: '#9aa3af', flex: 1 },
  provPhone: { fontSize: 12, color: '#4589d4', fontWeight: '600' },
  tarifaRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  tarifa: { fontSize: 12, color: '#27ae60', fontWeight: '600', backgroundColor: '#f0faf4', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  cardCta: { marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#f0f4f8' },
  cardCtaText: { fontSize: 13, color: '#4589d4', fontWeight: '700' },
  center: { padding: 48, alignItems: 'center' },
  loadingText: { marginTop: 14, fontSize: 15, color: '#667085' },
  emptyText: { fontSize: 15, color: '#667085', textAlign: 'center', marginBottom: 20 },
  retryBtn: { backgroundColor: '#4589d4', paddingHorizontal: 24, paddingVertical: 11, borderRadius: 8 },
  retryText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  footerText: { textAlign: 'center', fontSize: 11, color: '#bcc5d0', paddingVertical: 20 },
  ctaBanner: {
    backgroundColor: '#1b5499', borderRadius: 14,
    padding: 16, marginBottom: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    shadowColor: '#1b5499', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.20, shadowRadius: 10, elevation: 4,
  },
  ctaLeft:  { flex: 1 },
  ctaTitle: { fontSize: 16, fontWeight: '800', color: '#fff', marginBottom: 2 },
  ctaDesc:  { fontSize: 12, color: 'rgba(255,255,255,0.75)' },
  ctaArrow: { fontSize: 20, color: '#fff', fontWeight: '700', marginLeft: 12 },
});
