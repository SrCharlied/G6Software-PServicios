import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { getMisPedidos } from '../services/api';
import { T } from '../theme';

const URGENCIA_CONFIG = {
  alta:  { label: 'URGENTE', bg: '#fee2e2', text: '#991b1b', border: '#fca5a5' },
  media: { label: 'MEDIA',   bg: '#fef3c7', text: '#92400e', border: '#fde68a' },
  baja:  { label: 'BAJA',    bg: '#d1fae5', text: '#065f46', border: '#86efac' },
};

const ESTADO_CONFIG = {
  abierto:   { label: 'Abierto',   bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe' },
  cerrado:   { label: 'Cerrado',   bg: '#f0fdf4', text: '#15803d', border: '#bbf7d0' },
  cancelado: { label: 'Cancelado', bg: '#fff1f2', text: '#be123c', border: '#fecdd3' },
  expirado:  { label: 'Expirado',  bg: '#f9fafb', text: '#6b7280', border: '#e5e7eb' },
};

const timeAgo = (iso) => {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'ahora mismo';
  if (m < 60) return `hace ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.floor(h / 24);
  return `hace ${d} d`;
};

function PedidoCard({ pedido, onPress }) {
  const urgCfg    = URGENCIA_CONFIG[pedido.urgencia] ?? URGENCIA_CONFIG.media;
  const estadoCfg = ESTADO_CONFIG[pedido.estado]     ?? ESTADO_CONFIG.expirado;
  const cotCount  = pedido.cotizaciones_count ?? 0;

  return (
    <TouchableOpacity style={s.card} onPress={onPress} activeOpacity={0.86}>
      {/* Badges + tiempo */}
      <View style={s.topRow}>
        <View style={[s.urgBadge, { backgroundColor: urgCfg.bg, borderColor: urgCfg.border }]}>
          <Text style={[s.urgText, { color: urgCfg.text }]}>{urgCfg.label}</Text>
        </View>
        <View style={[s.estadoBadge, { backgroundColor: estadoCfg.bg, borderColor: estadoCfg.border }]}>
          <Text style={[s.estadoText, { color: estadoCfg.text }]}>{estadoCfg.label}</Text>
        </View>
        <Text style={s.timeText}>{timeAgo(pedido.created_at)}</Text>
      </View>

      {/* Categoría */}
      {pedido.categoria?.nombre ? (
        <Text style={s.catText}>{pedido.categoria.nombre}</Text>
      ) : null}

      {/* Descripción */}
      <Text style={s.descText} numberOfLines={2}>{pedido.descripcion}</Text>

      {/* Pie: ubicación + cotizaciones */}
      <View style={s.footRow}>
        {pedido.direccion ? (
          <Text style={s.locationText} numberOfLines={1}>📍 {pedido.direccion}</Text>
        ) : (
          <View style={{ flex: 1 }} />
        )}
        <View style={[s.cotBadge, cotCount > 0 && s.cotBadgeActive]}>
          <Text style={[s.cotText, cotCount > 0 && s.cotTextActive]}>
            {cotCount} {cotCount === 1 ? 'cotización' : 'cotizaciones'}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function MisPedidosScreen({ navigation }) {
  const [pedidos, setPedidos]         = useState([]);
  const [page, setPage]               = useState(1);
  const [lastPage, setLastPage]       = useState(1);
  const [loading, setLoading]         = useState(true);
  const [refreshing, setRefreshing]   = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError]             = useState('');

  const cargar = useCallback(async (pagina = 1, append = false, silent = false) => {
    if (pagina === 1 && !silent) setLoading(true);
    if (pagina > 1) setLoadingMore(true);
    setError('');
    try {
      const data   = await getMisPedidos({ page: pagina });
      const nuevos = data.pedidos || [];
      setPedidos((prev) => (append ? [...prev, ...nuevos] : nuevos));
      setLastPage(data.meta?.last_page ?? 1);
      setPage(pagina);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { cargar(1); }, [cargar]);

  const onRefresh = () => {
    setRefreshing(true);
    cargar(1, false, true);
  };

  const onEndReached = () => {
    if (!loadingMore && page < lastPage) cargar(page + 1, true);
  };

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={s.centered}>
        <ActivityIndicator size="large" color={T.blue} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container}>
      {/* Header fijo */}
      <View style={s.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={s.backText}>← Volver</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>Mis pedidos</Text>
        <View style={{ width: 60 }} />
      </View>

      <FlatList
        data={pedidos}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <PedidoCard
            pedido={item}
            onPress={() => navigation.navigate('PedidoDetail', { pedidoId: item.id })}
          />
        )}
        ListHeaderComponent={
          pedidos.length > 0 ? (
            <View style={s.listHeader}>
              <Text style={s.listCount}>{pedidos.length} pedido(s)</Text>
              <TouchableOpacity
                style={s.publishBtn}
                onPress={() => navigation.navigate('PublicarPedido')}
                activeOpacity={0.88}
              >
                <Text style={s.publishBtnText}>+ Nuevo pedido</Text>
              </TouchableOpacity>
            </View>
          ) : null
        }
        ListEmptyComponent={
          !error ? (
            <View style={s.emptyWrap}>
              <Text style={s.emptyIcon}>📋</Text>
              <Text style={s.emptyTitle}>Sin pedidos aún</Text>
              <Text style={s.emptyDesc}>
                Publica tu primer pedido y recibe propuestas de proveedores verificados.
              </Text>
              <TouchableOpacity
                style={s.ctaBtn}
                onPress={() => navigation.navigate('PublicarPedido')}
                activeOpacity={0.88}
              >
                <Text style={s.ctaBtnText}>Publicar mi primer pedido</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={s.centered}>
              <Text style={s.errorText}>{error}</Text>
              <TouchableOpacity style={s.retryBtn} onPress={() => cargar(1)}>
                <Text style={s.retryText}>Reintentar</Text>
              </TouchableOpacity>
            </View>
          )
        }
        ListFooterComponent={
          loadingMore
            ? <ActivityIndicator size="small" color={T.blue} style={{ padding: 16 }} />
            : pedidos.length > 0
              ? <Text style={s.footerText}>ServiGT Guatemala</Text>
              : null
        }
        contentContainerStyle={pedidos.length === 0 ? s.flatEmpty : s.flatContent}
        showsVerticalScrollIndicator={false}
        onEndReached={onEndReached}
        onEndReachedThreshold={0.4}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={T.blue} />
        }
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.canvas },
  centered:  { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: T.paper, borderBottomWidth: 1, borderBottomColor: T.border,
    ...T.sh1,
  },
  backText:    { color: T.blue, fontWeight: '600', fontSize: 15, width: 60 },
  headerTitle: { fontSize: 17, fontWeight: '800', color: T.ink },

  // List layout
  flatContent: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 32 },
  flatEmpty:   { flexGrow: 1, paddingHorizontal: 16, paddingTop: 12 },

  listHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 12,
  },
  listCount:      { fontSize: 13, color: T.muted, fontWeight: '600' },
  publishBtn:     { backgroundColor: T.blue, paddingHorizontal: 14, paddingVertical: 7, borderRadius: T.rSm },
  publishBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  // Card
  card: {
    backgroundColor: T.white, borderRadius: T.rMd, padding: 16,
    marginBottom: 12, borderWidth: 1, borderColor: T.border, ...T.sh1,
  },
  topRow:    { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8, flexWrap: 'wrap' },
  urgBadge:  { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
  urgText:   { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  estadoBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
  estadoText:  { fontSize: 10, fontWeight: '700' },
  timeText:    { fontSize: 11, color: T.faint, marginLeft: 'auto' },

  catText:  { fontSize: 12, color: T.blue, fontWeight: '600', marginBottom: 5 },
  descText: { fontSize: 14, color: T.text, lineHeight: 21, marginBottom: 12 },

  footRow:      { flexDirection: 'row', alignItems: 'center', gap: 8 },
  locationText: { flex: 1, fontSize: 12, color: T.muted },
  cotBadge:     {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999,
    backgroundColor: T.paper, borderWidth: 1, borderColor: T.border,
  },
  cotBadgeActive: { backgroundColor: '#eff6ff', borderColor: '#bfdbfe' },
  cotText:        { fontSize: 11, color: T.muted, fontWeight: '600' },
  cotTextActive:  { color: '#1d4ed8' },

  // Empty state
  emptyWrap: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 32, paddingVertical: 64,
  },
  emptyIcon:  { fontSize: 52, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: T.ink, marginBottom: 8 },
  emptyDesc:  { fontSize: 14, color: T.muted, textAlign: 'center', lineHeight: 21, marginBottom: 28 },
  ctaBtn:     { backgroundColor: T.blue, paddingHorizontal: 28, paddingVertical: 14, borderRadius: T.rLg, ...T.sh2 },
  ctaBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },

  // Error
  errorText: { fontSize: 15, color: T.danger, textAlign: 'center', marginBottom: 16 },
  retryBtn:  { backgroundColor: T.blue, paddingHorizontal: 24, paddingVertical: 10, borderRadius: T.rSm },
  retryText: { color: '#fff', fontWeight: '600', fontSize: 14 },

  footerText: { textAlign: 'center', fontSize: 11, color: T.faint, paddingVertical: 20 },
});
