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
import { getMisPedidos, getSolicitudesCliente, storageUrl } from '../services/api';
import { T } from '../theme';
import { Avatar, Button, Card, ScreenHeader, StatusChip } from '../components/ui';

// Mapea el dominio (urgencia/estado de pedido) a la variante semantica de
// StatusChip, en vez de que cada pantalla traiga su propio bg/text/border.
const URGENCIA_VARIANT = { alta: 'danger', media: 'warn', baja: 'success' };
const URGENCIA_LABEL   = { alta: 'URGENTE', media: 'MEDIA', baja: 'BAJA' };

const ESTADO_VARIANT = { abierto: 'info', cerrado: 'success', cancelado: 'danger', expirado: 'neutral' };
const ESTADO_LABEL   = { abierto: 'Abierto', cerrado: 'Cerrado', cancelado: 'Cancelado', expirado: 'Expirado' };

// Los servicios directos recorren el ciclo de vida del trabajo, no el de una
// convocatoria, asi que tienen su propia tabla de estados.
const SERVICIO_VARIANT = {
  pendiente:     'warn',
  aceptado:      'info',
  en_camino:     'info',
  en_progreso:   'info',
  por_confirmar: 'warn',
  completado:    'success',
  cancelado:     'danger',
  rechazado:     'danger',
};
const SERVICIO_LABEL = {
  pendiente:     'Pendiente',
  aceptado:      'Aceptado',
  en_camino:     'En camino',
  en_progreso:   'En progreso',
  por_confirmar: 'Por confirmar',
  completado:    'Completado',
  cancelado:     'Cancelado',
  rechazado:     'Rechazado',
};

// Las dos superficies que conviven en la pantalla. Un pedido es una
// convocatoria abierta que recibe cotizaciones; un servicio directo es un
// encargo a un proveedor concreto. Se separan porque no se gestionan igual.
const VISTA_PEDIDOS   = 'pedidos';
const VISTA_SERVICIOS = 'servicios';

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

function ServicioCard({ servicio, onPress, style }) {
  const proveedor = servicio.proveedor;

  return (
    <TouchableOpacity activeOpacity={0.86} onPress={onPress} style={style}>
      <Card style={s.card}>
        <View style={s.topRow}>
          <StatusChip
            variant={SERVICIO_VARIANT[servicio.estado] ?? 'neutral'}
            label={SERVICIO_LABEL[servicio.estado] ?? servicio.estado}
            size="sm"
          />
          <Text style={s.timeText}>{timeAgo(servicio.created_at)}</Text>
        </View>

        <View style={s.provRow}>
          <Avatar name={proveedor?.nombre} uri={storageUrl(proveedor?.foto_perfil)} size={34} />
          <View style={s.provCopy}>
            <Text style={s.provName} numberOfLines={1}>
              {proveedor?.nombre || 'Proveedor'}
            </Text>
            {servicio.categoria?.nombre || proveedor?.categoria?.nombre ? (
              <Text style={s.catText}>
                {servicio.categoria?.nombre || proveedor?.categoria?.nombre}
              </Text>
            ) : null}
          </View>
        </View>

        <Text style={s.descText} numberOfLines={2}>{servicio.descripcion}</Text>

        <View style={s.footRow}>
          {servicio.direccion ? (
            <View style={s.locationRow}>
              <Feather name="map-pin" size={12} color={T.muted} />
              <Text style={s.locationText} numberOfLines={1}>{servicio.direccion}</Text>
            </View>
          ) : (
            <View style={{ flex: 1 }} />
          )}
          {servicio.monto_acordado ? (
            <Text style={s.montoText}>Q{Number(servicio.monto_acordado).toFixed(2)}</Text>
          ) : null}
        </View>
      </Card>
    </TouchableOpacity>
  );
}

export default function MisPedidosScreen({ navigation }) {
  const { width } = useWindowDimensions();
  const numColumns = width >= 1300 ? 3 : width >= 820 ? 2 : 1;

  const [vista, setVista]             = useState(VISTA_PEDIDOS);
  const [pedidos, setPedidos]         = useState([]);
  const [servicios, setServicios]     = useState([]);
  const [page, setPage]               = useState(1);
  const [lastPage, setLastPage]       = useState(1);
  const [loading, setLoading]         = useState(true);
  const [refreshing, setRefreshing]   = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError]             = useState('');

  const enPedidos = vista === VISTA_PEDIDOS;

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

  // Los servicios directos no vienen paginados por el backend, asi que se
  // cargan de una sola vez junto a la primera pagina de pedidos. Si fallan no
  // tumban la pantalla: los pedidos siguen siendo utiles por si solos.
  const cargarServicios = useCallback(async () => {
    try {
      const data = await getSolicitudesCliente();
      setServicios(data.servicios || []);
    } catch {
      setServicios([]);
    }
  }, []);

  useEffect(() => {
    cargar(1);
    cargarServicios();
  }, [cargar, cargarServicios]);

  const onRefresh = () => {
    setRefreshing(true);
    cargar(1, false, true);
    cargarServicios();
  };

  const onEndReached = () => {
    if (enPedidos && !loadingMore && page < lastPage) cargar(page + 1, true);
  };

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={s.centered}>
        <ActivityIndicator size="large" color={T.blue} />
      </SafeAreaView>
    );
  }

  const datos = enPedidos ? pedidos : servicios;

  const selector = (
    <View style={s.selector}>
      {[
        { key: VISTA_PEDIDOS,   label: 'Pedidos',           icon: 'clipboard', total: pedidos.length },
        { key: VISTA_SERVICIOS, label: 'Servicios directos', icon: 'user-check', total: servicios.length },
      ].map((opcion) => {
        const activa = vista === opcion.key;
        return (
          <TouchableOpacity
            key={opcion.key}
            style={[s.selectorItem, activa && s.selectorItemActive]}
            onPress={() => setVista(opcion.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: activa }}
          >
            <Feather name={opcion.icon} size={14} color={activa ? T.deep : T.muted} />
            <Text style={[s.selectorText, activa && s.selectorTextActive]} numberOfLines={1}>
              {opcion.label}
            </Text>
            <View style={[s.selectorCount, activa && s.selectorCountActive]}>
              <Text style={[s.selectorCountText, activa && s.selectorCountTextActive]}>
                {opcion.total}
              </Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  const vacio = enPedidos ? (
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
    <View style={s.emptyWrap}>
      <View style={s.emptyIconWrap}>
        <Feather name="user-check" size={40} color={T.blue} />
      </View>
      <Text style={s.emptyTitle}>Sin servicios directos</Text>
      <Text style={s.emptyDesc}>
        Cuando contrates a un proveedor directamente desde su perfil, el servicio aparecerá aquí.
      </Text>
      <Button kind="secondary" size="lg" onPress={() => navigation.navigate('Home')}>
        Buscar proveedores
      </Button>
    </View>
  );

  return (
    <SafeAreaView style={s.container}>
      <ScreenHeader title="Mis pedidos" onBack={() => navigation.goBack()} />

      <FlatList
        key={`${vista}-cols-${numColumns}`}
        data={datos}
        keyExtractor={(item) => `${vista}-${item.id}`}
        numColumns={numColumns}
        columnWrapperStyle={numColumns > 1 ? s.row : undefined}
        renderItem={({ item }) =>
          enPedidos ? (
            <PedidoCard
              pedido={item}
              onPress={() => navigation.navigate('PedidoDetail', { pedidoId: item.id })}
              style={numColumns > 1 ? s.gridItem : undefined}
            />
          ) : (
            <ServicioCard
              servicio={item}
              onPress={() => navigation.navigate('Solicitudes')}
              style={numColumns > 1 ? s.gridItem : undefined}
            />
          )
        }
        ListHeaderComponent={
          <View>
            {selector}
            {datos.length > 0 ? (
              <View style={s.listHeader}>
                <Text style={s.listCount}>
                  {enPedidos
                    ? `${pedidos.length} pedido(s)`
                    : `${servicios.length} servicio(s) directo(s)`}
                </Text>
                {enPedidos ? (
                  <Button kind="primary" size="sm" icon="plus" onPress={() => navigation.navigate('PublicarPedido')}>
                    Nuevo pedido
                  </Button>
                ) : null}
              </View>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          !error ? vacio : (
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
            : datos.length > 0
              ? <Text style={s.footerText}>ServiGT Guatemala</Text>
              : null
        }
        contentContainerStyle={datos.length === 0 ? s.flatEmpty : s.flatContent}
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

  // List layout
  flatContent: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 32 },
  flatEmpty:   { flexGrow: 1, paddingHorizontal: 16, paddingTop: 12 },

  // Selector de superficie
  selector: {
    flexDirection: 'row', gap: 6, marginBottom: 14,
    backgroundColor: T.paper, borderWidth: 1, borderColor: T.border,
    borderRadius: 999, padding: 4,
  },
  selectorItem: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 999,
  },
  selectorItemActive: { backgroundColor: T.tint },
  selectorText: { fontSize: 13, fontWeight: '700', color: T.muted, flexShrink: 1 },
  selectorTextActive: { color: T.deep },
  selectorCount: {
    minWidth: 22, paddingHorizontal: 6, paddingVertical: 1, borderRadius: 999,
    backgroundColor: T.canvas, alignItems: 'center',
  },
  selectorCountActive: { backgroundColor: T.white },
  selectorCountText: { fontSize: 11, fontWeight: '800', color: T.muted },
  selectorCountTextActive: { color: T.deep },

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

  // Card de servicio directo
  provRow:  { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  provCopy: { flex: 1, minWidth: 0 },
  provName: { fontSize: 14, fontWeight: '700', color: T.ink },
  montoText: { fontSize: 13, fontWeight: '800', color: T.deep },

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
