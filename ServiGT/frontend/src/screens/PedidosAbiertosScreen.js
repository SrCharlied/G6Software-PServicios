import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { getPedidosAbiertos, getCategorias } from '../services/api';
import { T } from '../theme';

const URGENCIA_COLOR = { baja: T.success, media: T.warn, alta: T.danger };

function PedidoCard({ pedido, onPress }) {
  const urgColor = URGENCIA_COLOR[pedido.urgencia] || T.muted;
  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.88} onPress={onPress}>
      <View style={styles.cardHeader}>
        <View style={[styles.urgBadge, { backgroundColor: urgColor + '18', borderColor: urgColor }]}>
          <Text style={[styles.urgText, { color: urgColor }]}>{pedido.urgencia?.toUpperCase()}</Text>
        </View>
        <Text style={styles.catText} numberOfLines={1}>{pedido.categoria?.nombre || '—'}</Text>
      </View>
      <Text style={styles.desc} numberOfLines={3}>{pedido.descripcion}</Text>
      <View style={styles.cardMeta}>
        <Text style={styles.metaText}>{pedido.direccion}</Text>
        <Text style={styles.cotCount}>{pedido.cotizaciones_count ?? 0} cotizaciones</Text>
      </View>
      <Text style={styles.fecha}>
        {pedido.created_at ? new Date(pedido.created_at).toLocaleDateString('es-GT') : ''}
      </Text>
    </TouchableOpacity>
  );
}

export default function PedidosAbiertosScreen({ navigation }) {
  const [pedidos, setPedidos]         = useState([]);
  const [categorias, setCategorias]   = useState([]);
  const [catFiltro, setCatFiltro]     = useState(null);
  const [page, setPage]               = useState(1);
  const [lastPage, setLastPage]       = useState(1);
  const [loading, setLoading]         = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError]             = useState('');

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

  useEffect(() => { cargar(1, catFiltro); }, [catFiltro]);

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
        <Text style={styles.backText}>← Volver</Text>
      </TouchableOpacity>
      <Text style={styles.title}>Pedidos abiertos</Text>
      <FlatList
        horizontal
        data={categorias}
        keyExtractor={(c) => String(c.id)}
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
        data={pedidos}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <PedidoCard pedido={item} onPress={() => {}} />
        )}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.emptyText}>No hay pedidos abiertos en este momento.</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={() => cargar(1, catFiltro)}>
              <Text style={styles.retryText}>Recargar</Text>
            </TouchableOpacity>
          </View>
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
  container:        { flex: 1, backgroundColor: T.canvas },
  center:           { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  listContent:      { paddingBottom: 32 },
  headerWrap:       { paddingTop: 20, paddingHorizontal: 16, paddingBottom: 8 },
  title:            { fontSize: 22, fontWeight: '800', color: T.ink, marginBottom: 12 },
  filterRow:        { paddingBottom: 12, gap: 8 },
  filterChip:       {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1, borderColor: T.border, backgroundColor: T.white,
  },
  filterChipOn:     { borderColor: T.blue, backgroundColor: '#eef4ff' },
  filterChipText:   { fontSize: 13, color: T.muted },
  filterChipTextOn: { color: T.blue, fontWeight: '700' },
  errorText:        { color: T.danger, fontSize: 13, marginBottom: 8 },
  card:             {
    backgroundColor: T.paper, borderRadius: T.rLg,
    marginHorizontal: 16, marginBottom: 12, padding: 16,
    ...T.sh2,
  },
  cardHeader:   { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  urgBadge:     { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10, borderWidth: 1 },
  urgText:      { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  catText:      { fontSize: 12, color: T.muted, flex: 1 },
  desc:         { fontSize: 14, color: T.text, lineHeight: 20, marginBottom: 10 },
  cardMeta:     { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  metaText:     { fontSize: 12, color: T.faint, flex: 1 },
  cotCount:     { fontSize: 12, color: T.blue, fontWeight: '600' },
  fecha:        { fontSize: 11, color: T.faint },
  emptyText:    { fontSize: 15, color: T.muted, textAlign: 'center', marginBottom: 16 },
  retryBtn:     { backgroundColor: T.blue, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 8 },
  retryText:    { color: '#fff', fontWeight: '600' },
  footerText:   { textAlign: 'center', fontSize: 11, color: T.faint, padding: 20 },
  backRow:      { marginBottom: 12 },
  backText:     { fontSize: 15, color: T.blue, fontWeight: '600' },
});
