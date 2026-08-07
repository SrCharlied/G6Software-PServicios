import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { getMisPedidos } from '../services/api';
import { T } from '../theme';
import { Button, Card, StatusChip } from '../components/ui';

// Mapea el dominio (urgencia/estado de pedido) a la variante semantica de
// StatusChip, en vez de que cada pantalla traiga su propio bg/text/border.
const URGENCIA_VARIANT = { alta: 'danger', media: 'warn', baja: 'success' };
const URGENCIA_LABEL   = { alta: 'URGENTE', media: 'MEDIA', baja: 'BAJA' };

const ESTADO_VARIANT = { abierto: 'info', cerrado: 'success', cancelado: 'danger', expirado: 'neutral' };
const ESTADO_LABEL   = { abierto: 'Abierto', cerrado: 'Cerrado', cancelado: 'Cancelado', expirado: 'Expirado' };

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

function PedidoCard({ pedido, onPress, style }) {
  const cotCount = pedido.cotizaciones_count ?? 0;

  return (
    <TouchableOpacity activeOpacity={0.86} onPress={onPress} style={style}>
      <Card style={s.card}>
        <View style={s.topRow}>
          <StatusChip
            variant={URGENCIA_VARIANT[pedido.urgencia] ?? 'warn'}
            label={URGENCIA_LABEL[pedido.urgencia] ?? 'MEDIA'}
            size="sm"
          />
          <StatusChip
            variant={ESTADO_VARIANT[pedido.estado] ?? 'neutral'}
            label={ESTADO_LABEL[pedido.estado] ?? 'Expirado'}
            size="sm"
          />
          <Text style={s.timeText}>{timeAgo(pedido.created_at)}</Text>
        </View>

        {pedido.categoria?.nombre ? (
          <Text style={s.catText}>{pedido.categoria.nombre}</Text>
        ) : null}

        <Text style={s.descText} numberOfLines={2}>{pedido.descripcion}</Text>

        <View style={s.footRow}>
          {pedido.direccion ? (
            <View style={s.locationRow}>
              <Feather name="map-pin" size={12} color={T.muted} />
              <Text style={s.locationText} numberOfLines={1}>{pedido.direccion}</Text>
            </View>
          ) : (
            <View style={{ flex: 1 }} />
          )}
          <View style={[s.cotBadge, cotCount > 0 && s.cotBadgeActive]}>
            <Text style={[s.cotText, cotCount > 0 && s.cotTextActive]}>
              {cotCount} {cotCount === 1 ? 'cotización' : 'cotizaciones'}
            </Text>
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );
}

export default function MisPedidosScreen({ navigation }) {
  const { width } = useWindowDimensions();
  const numColumns = width >= 1300 ? 3 : width >= 820 ? 2 : 1;

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
          style={s.headerBack}
        >
          <Feather name="arrow-left" size={16} color={T.blue} />
          <Text style={s.backText}>Volver</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>Mis pedidos</Text>
        <View style={{ width: 70 }} />
      </View>

      <FlatList
        key={`cols-${numColumns}`}
        data={pedidos}
        keyExtractor={(item) => String(item.id)}
        numColumns={numColumns}
        columnWrapperStyle={numColumns > 1 ? s.row : undefined}
        renderItem={({ item }) => (
          <PedidoCard
            pedido={item}
            onPress={() => navigation.navigate('PedidoDetail', { pedidoId: item.id })}
            style={numColumns > 1 ? s.gridItem : undefined}
          />
        )}
        ListHeaderComponent={
          pedidos.length > 0 ? (
            <View style={s.listHeader}>
              <Text style={s.listCount}>{pedidos.length} pedido(s)</Text>
              <Button kind="primary" size="sm" icon="plus" onPress={() => navigation.navigate('PublicarPedido')}>
                Nuevo pedido
              </Button>
            </View>
          ) : null
        }
        ListEmptyComponent={
          !error ? (
            <View style={s.emptyWrap}>
              <View style={s.emptyIconWrap}>
                <Feather name="clipboard" size={40} color={T.blue} />
              </View>
              <Text style={s.emptyTitle}>Sin pedidos aún</Text>
              <Text style={s.emptyDesc}>
                Publica tu primer pedido y recibe propuestas de proveedores verificados.
              </Text>
              <Button kind="primary" size="lg" onPress={() => navigation.navigate('PublicarPedido')}>
                Publicar mi primer pedido
              </Button>
            </View>
          ) : (
            <View style={s.centered}>
              <Text style={s.errorText}>{error}</Text>
              <Button kind="primary" onPress={() => cargar(1)}>
                Reintentar
              </Button>
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
  centered:  { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, gap: 14 },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: T.paper, borderBottomWidth: 1, borderBottomColor: T.border,
    ...T.sh1,
  },
  headerBack:  { flexDirection: 'row', alignItems: 'center', gap: 4, width: 70 },
  backText:    { color: T.blue, fontWeight: '600', fontSize: 14 },
  headerTitle: { fontSize: 17, fontWeight: '800', color: T.ink },

  // List layout
  flatContent: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 32 },
  flatEmpty:   { flexGrow: 1, paddingHorizontal: 16, paddingTop: 12 },

  listHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 12,
  },
  listCount: { fontSize: 13, color: T.muted, fontWeight: '600' },

  row: { gap: 12 },
  gridItem: { flex: 1 },

  // Card
  card: { marginBottom: 12 },
  topRow:    { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8, flexWrap: 'wrap' },
  timeText:  { fontSize: 11, color: T.faint, marginLeft: 'auto' },

  catText:  { fontSize: 12, color: T.blue, fontWeight: '600', marginBottom: 5 },
  descText: { fontSize: 14, color: T.text, lineHeight: 21, marginBottom: 12 },

  footRow:      { flexDirection: 'row', alignItems: 'center', gap: 8 },
  locationRow:  { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4 },
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
    paddingHorizontal: 32, paddingVertical: 64, gap: 4,
  },
  emptyIconWrap: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: '#eff6ff',
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: T.ink, marginBottom: 8 },
  emptyDesc:  { fontSize: 14, color: T.muted, textAlign: 'center', lineHeight: 21, marginBottom: 20 },

  // Error
  errorText: { fontSize: 15, color: T.danger, textAlign: 'center' },

  footerText: { textAlign: 'center', fontSize: 11, color: T.faint, paddingVertical: 20 },
});
