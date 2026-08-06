import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSession } from '../context/SessionContext';
import Drawer from '../components/Drawer';
import ServiGTLogo from '../components/ServiGTLogo';
import NotificationBell from '../components/NotificationBell';
import { getProviders, storageUrl } from '../services/api';
import { mockProviders } from '../data/mockProviders';
import { T } from '../theme';
import { Avatar, Button, Card, StatusChip, Stars } from '../components/ui';

// Evita escribir un rango unicode de marcas diacriticas como literal de regex
// (̀-ͯ): se filtra por code point para no depender de como el
// editor/herramienta interprete esa secuencia de escape.
const normalizeText = (value) =>
  (value || '')
    .toString()
    .normalize('NFD')
    .split('')
    .filter((ch) => {
      const code = ch.codePointAt(0);
      return code < 0x0300 || code > 0x036f;
    })
    .join('')
    .toLowerCase();

// `showBell`: en desktop la campana la provee el sidebar de InternalLayout, asi
// que aqui se oculta para no duplicarla. En movil no hay sidebar y esta es la
// unica campana, por eso se mantiene.
function TopBar({ onMenuPress, showBell }) {
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
      {showBell ? <NotificationBell /> : <View style={styles.bellSpacer} />}
    </View>
  );
}

function ProviderCard({ prov, onPress, style }) {
  const photoUri = storageUrl(prov.foto_perfil);
  const rating = Number(prov.calificacion_promedio || 0);

  return (
    <TouchableOpacity activeOpacity={0.88} onPress={onPress} style={style}>
      <Card style={styles.provCard}>
        <View style={styles.provHeader}>
          <Avatar uri={photoUri} name={prov.nombre} size={40} />
          <Text style={styles.provName} numberOfLines={1}>{prov.nombre}</Text>
        </View>

        <View style={styles.provChipsRow}>
          <StatusChip variant="info" label={prov.categoria?.nombre || 'Sin categoria'} size="sm" dot={false} />
          {rating > 0 ? (
            <View style={styles.ratingRow}>
              <Stars value={rating} size={12} />
              <Text style={styles.ratingText}>{rating.toFixed(1)}</Text>
            </View>
          ) : null}
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
          <Text style={styles.cardCtaText}>Ver perfil</Text>
          <Feather name="chevron-right" size={14} color={T.blue} />
        </View>
      </Card>
    </TouchableOpacity>
  );
}

export default function HomeScreen({ useLayoutNavigation = false } = {}) {
  const router = useRouter();
  const { setSelectedProvider, user } = useSession();
  const { width } = useWindowDimensions();
  // Mismo umbral que InternalLayout: arriba de este ancho el sidebar es visible
  // y ya trae la campana.
  const sidebarVisible = width >= 900;
  // Grid responsive dentro del maxWidth 1120 que ya centra InternalLayout.
  const numColumns = width >= 1300 ? 3 : width >= 820 ? 2 : 1;

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
          <Feather name="arrow-right" size={20} color={T.white} />
        </TouchableOpacity>
      ) : null}

      <View style={styles.searchBar}>
        <Feather name="search" size={16} color={T.muted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar por nombre, categoria, zona..."
          placeholderTextColor={T.faint}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.trim() ? (
          <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Feather name="x" size={16} color={T.faint} />
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
          <Feather name="refresh-cw" size={16} color={T.blue} />
        </TouchableOpacity>
      </View>
    </View>
  );

  const ListEmpty = loading ? (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={T.blue} />
      <Text style={styles.loadingText}>Cargando proveedores...</Text>
    </View>
  ) : (
    <View style={styles.center}>
      <Text style={styles.emptyText}>
        {normalizedQuery ? 'Sin resultados para esa busqueda.' : 'No hay proveedores disponibles.'}
      </Text>
      <Button
        kind="primary"
        onPress={normalizedQuery ? () => setSearchQuery('') : loadProviders}
      >
        {normalizedQuery ? 'Ver todos' : 'Reintentar'}
      </Button>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      {!useLayoutNavigation ? (
        <TopBar onMenuPress={() => setDrawerOpen(true)} showBell={!sidebarVisible} />
      ) : null}
      <FlatList
        key={`cols-${numColumns}`}
        data={loading ? [] : filteredProviders}
        keyExtractor={(item) => String(item.id)}
        numColumns={numColumns}
        columnWrapperStyle={numColumns > 1 ? styles.row : undefined}
        renderItem={({ item }) => (
          <ProviderCard
            prov={item}
            onPress={() => handleProviderPress(item)}
            style={numColumns > 1 ? styles.gridItem : styles.listItem}
          />
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
      {!useLayoutNavigation ? (
        <Drawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} />
      ) : null}
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
    ...T.sh1,
  },
  menuBtn: { padding: 4 },
  hamburger: { gap: 5, paddingVertical: 2 },
  hamburgerLine: { width: 22, height: 2, backgroundColor: '#333', borderRadius: 2 },
  // Mismo ancho que el boton de NotificationBell, para que el logo no se
  // descentre cuando la campana se oculta en desktop.
  bellSpacer: { width: 36, height: 36 },
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
    ...T.sh1,
  },
  searchInput: { flex: 1, fontSize: 15, color: T.text, paddingVertical: 0 },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: T.text },
  row: { gap: 12 },
  gridItem: { flex: 1 },
  listItem: { marginHorizontal: 16 },
  provCard: { marginBottom: 12, padding: 16 },
  provHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  provName: { fontSize: 16, fontWeight: '700', color: T.ink, flex: 1 },
  provChipsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, gap: 8 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ratingText: { fontSize: 12, color: T.muted, fontWeight: '600' },
  provDesc: { fontSize: 13, color: T.muted, lineHeight: 19, marginBottom: 8 },
  provMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  provLocation: { fontSize: 12, color: T.faint, flex: 1 },
  provPhone: { fontSize: 12, color: T.blue, fontWeight: '600' },
  tarifaRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  tarifa: { fontSize: 12, color: T.success, fontWeight: '600', backgroundColor: '#f0faf4', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  cardCta: { marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#f0f4f8', flexDirection: 'row', alignItems: 'center', gap: 4 },
  cardCtaText: { fontSize: 13, color: T.blue, fontWeight: '700' },
  center: { padding: 48, alignItems: 'center' },
  loadingText: { marginTop: 14, fontSize: 15, color: T.muted },
  emptyText: { fontSize: 15, color: T.muted, textAlign: 'center', marginBottom: 20 },
  footerText: { textAlign: 'center', fontSize: 11, color: T.faint, paddingVertical: 20 },
  ctaBanner: {
    backgroundColor: T.deep, borderRadius: 14,
    padding: 16, marginBottom: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    ...T.sh2,
  },
  ctaLeft:  { flex: 1 },
  ctaTitle: { fontSize: 16, fontWeight: '800', color: T.white, marginBottom: 2 },
  ctaDesc:  { fontSize: 12, color: 'rgba(255,255,255,0.75)' },
});
