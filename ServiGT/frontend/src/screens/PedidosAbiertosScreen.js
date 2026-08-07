import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { getPedidosAbiertos, getCategorias } from '../services/api';
import { T } from '../theme';
import { Button, Card, StatusChip } from '../components/ui';

const URGENCIA_VARIANT = { baja: 'success', media: 'warn', alta: 'danger' };

function PedidoCard({ pedido, onPress }) {
  const urgencia = pedido.urgencia || 'pendiente';

  return (
    <TouchableOpacity style={styles.cardPressable} activeOpacity={0.88} onPress={onPress}>
      <Card padding={16} style={styles.card}>
        <View style={styles.cardHeader}>
          <StatusChip
            label={urgencia.toUpperCase()}
            variant={URGENCIA_VARIANT[urgencia] || 'neutral'}
          />
          <Text style={styles.catText} numberOfLines={1}>{pedido.categoria?.nombre || 'Sin categoria'}</Text>
        </View>

        <Text style={styles.desc} numberOfLines={3}>{pedido.descripcion}</Text>

        <View style={styles.metaGrid}>
          <View style={styles.metaBox}>
            <Text style={styles.metaLabel}>Direccion</Text>
            <Text style={styles.metaText} numberOfLines={1}>{pedido.direccion || 'No indicada'}</Text>
          </View>
          <View style={styles.metaBox}>
            <Text style={styles.metaLabel}>Cotizaciones</Text>
            <Text style={styles.metaStrong}>{pedido.cotizaciones_count ?? 0}</Text>
          </View>
        </View>

        <View style={styles.cardFooter}>
          <Text style={styles.fecha}>
            {pedido.created_at ? new Date(pedido.created_at).toLocaleDateString('es-GT') : 'Fecha no disponible'}
          </Text>
          <Button size="sm" kind="secondary" onPress={onPress}>Ver pedido</Button>
        </View>
      </Card>
    </TouchableOpacity>
  );
}

export default function PedidosAbiertosScreen({ navigation }) {
  const { width } = useWindowDimensions();
  const columns = width >= 1180 ? 2 : 1;
  const [pedidos, setPedidos]         = useState([]);
  const [categorias, setCategorias]   = useState([]);
  const [catFiltro, setCatFiltro]     = useState(null);
  const [page, setPage]               = useState(1);
  const [lastPage, setLastPage]       = useState(1);
  const [loading, setLoading]         = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError]             = useState('');

  const totalCotizaciones = useMemo(
    () => pedidos.reduce((sum, item) => sum + (item.cotizaciones_count ?? 0), 0),
    [pedidos]
  );

  useEffect(() => {
    getCategorias()
      .then((data) => setCategorias(data.categorias || data || []))
      .catch(() => {});
  }, []);

  const cargar = useCallback(async (pagina = 1, catId = catFiltro, append = false) => {
    if (pagina === 1) setLoading(true); else setLoadingMore(true);
    setError('');
    try {
      const data = await getPedidosAbiertos({ categoriaId: catId, page: pagina });
      const nuevos = data.pedidos || [];
      setPedidos((prev) => (append ? [...prev, ...nuevos] : nuevos));
      setLastPage(data.meta?.last_page ?? 1);
      setPage(pagina);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [catFiltro]);

  useEffect(() => { cargar(1, catFiltro); }, [catFiltro, cargar]);

  const handleFiltro = (id) => {
    const nuevo = catFiltro === id ? null : id;
    setCatFiltro(nuevo);
  };

  const handleEndReached = () => {
    if (!loadingMore && page < lastPage) {
      cargar(page + 1, catFiltro, true);
    }
  };

  const ListHeader = (
    <View style={styles.headerWrap}>
      <TouchableOpacity style={styles.backRow} onPress={() => navigation.goBack()}>
        <Text style={styles.backText}>Volver</Text>
      </TouchableOpacity>

      <View style={styles.hero}>
        <View style={styles.heroCopy}>
          <Text style={styles.kicker}>Oportunidades</Text>
          <Text style={styles.title}>Pedidos abiertos</Text>
          <Text style={styles.subtitle}>
            Revisa solicitudes reales de clientes y elige los pedidos donde puedes cotizar.
          </Text>
        </View>
        <View style={styles.kpiRow}>
          <View style={styles.kpiBox}>
            <Text style={styles.kpiValue}>{pedidos.length}</Text>
            <Text style={styles.kpiLabel}>pedidos</Text>
          </View>
          <View style={styles.kpiBox}>
            <Text style={styles.kpiValue}>{totalCotizaciones}</Text>
            <Text style={styles.kpiLabel}>cotizaciones</Text>
          </View>
        </View>
      </View>

      <FlatList
        horizontal
        data={[{ id: null, nombre: 'Todas' }, ...categorias]}
        keyExtractor={(c) => String(c.id ?? 'all')}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.filterChip, catFiltro === item.id && styles.filterChipOn]}
            onPress={() => handleFiltro(item.id)}
          >
            <Text style={[styles.filterChipText, catFiltro === item.id && styles.filterChipTextOn]}>
              {item.nombre}
            </Text>
          </TouchableOpacity>
        )}
        contentContainerStyle={styles.filterRow}
        showsHorizontalScrollIndicator={false}
      />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color={T.blue} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        key={`pedidos-cols-${columns}`}
        data={pedidos}
        numColumns={columns}
        columnWrapperStyle={columns > 1 ? styles.columnWrapper : null}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <PedidoCard pedido={item} onPress={() => navigation.navigate('PedidoDetail', { pedidoId: item.id })} />
        )}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={
          <Card padding={22} style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No hay pedidos abiertos</Text>
            <Text style={styles.emptyText}>Cuando existan pedidos disponibles apareceran en esta lista.</Text>
            <Button kind="secondary" onPress={() => cargar(1, catFiltro)}>Recargar</Button>
          </Card>
        }
        ListFooterComponent={
          loadingMore
            ? <ActivityIndicator size="small" color={T.blue} style={{ padding: 16 }} />
            : <Text style={styles.footerText}>ServiGT Guatemala</Text>
        }
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.4}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.canvas },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, backgroundColor: T.canvas },
  listContent: {
    width: '100%',
    maxWidth: 1180,
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 34,
  },
  headerWrap: { paddingBottom: 10 },
  backRow: { marginBottom: 12, alignSelf: 'flex-start' },
  backText: { fontSize: 14, color: T.blue, fontWeight: '800' },
  hero: {
    backgroundColor: T.paper,
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: 16,
    padding: 22,
    marginBottom: 14,
    gap: 18,
    ...T.sh2,
  },
  heroCopy: { gap: 4 },
  kicker: { color: T.blue, fontSize: 12, fontWeight: '900', textTransform: 'uppercase' },
  title: { fontSize: 28, fontWeight: '900', color: T.ink },
  subtitle: { fontSize: 14, lineHeight: 21, color: T.muted, maxWidth: 620 },
  kpiRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  kpiBox: {
    minWidth: 136,
    backgroundColor: T.white,
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: 12,
    padding: 12,
  },
  kpiValue: { color: T.ink, fontSize: 24, fontWeight: '900' },
  kpiLabel: { color: T.muted, fontSize: 12, fontWeight: '700', marginTop: 2 },
  filterRow: { paddingBottom: 12, gap: 8 },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: T.border,
    backgroundColor: T.white,
  },
  filterChipOn: { borderColor: T.blue, backgroundColor: '#e6effa' },
  filterChipText: { fontSize: 13, color: T.muted, fontWeight: '700' },
  filterChipTextOn: { color: T.deep },
  errorText: { color: T.danger, fontSize: 13, marginBottom: 8, fontWeight: '700' },
  columnWrapper: { gap: 14 },
  cardPressable: { flex: 1, marginBottom: 14 },
  card: {
    flex: 1,
    minHeight: 230,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  catText: { fontSize: 13, color: T.muted, flex: 1, fontWeight: '700' },
  desc: { fontSize: 16, color: T.text, lineHeight: 23, fontWeight: '700', marginBottom: 14 },
  metaGrid: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  metaBox: {
    flex: 1,
    backgroundColor: T.inputBg,
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: 12,
    padding: 10,
  },
  metaLabel: { fontSize: 11, color: T.muted, fontWeight: '800', textTransform: 'uppercase', marginBottom: 4 },
  metaText: { fontSize: 13, color: T.text, fontWeight: '700' },
  metaStrong: { fontSize: 18, color: T.deep, fontWeight: '900' },
  cardFooter: {
    marginTop: 'auto',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: T.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  fecha: { fontSize: 12, color: T.faint, fontWeight: '700' },
  emptyCard: {
    alignItems: 'center',
    marginTop: 12,
  },
  emptyTitle: { fontSize: 18, color: T.ink, fontWeight: '900', marginBottom: 6 },
  emptyText: { fontSize: 14, color: T.muted, textAlign: 'center', marginBottom: 16 },
  footerText: { textAlign: 'center', fontSize: 11, color: T.faint, padding: 20 },
});
