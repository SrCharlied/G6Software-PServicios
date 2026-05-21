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
import { getMisPedidos } from '../services/api';
import { T } from '../theme';

const ESTADO_META = {
  abierto:   { label: 'Abierto',   color: T.blue },
  expirado:  { label: 'Expirado',  color: T.faint },
  cerrado:   { label: 'Cerrado',   color: T.success },
  cancelado: { label: 'Cancelado', color: T.danger },
};

function PedidoCard({ pedido }) {
  const estado = ESTADO_META[pedido.estado] || { label: pedido.estado, color: T.muted };
  const vence  = pedido.fecha_expiracion ? new Date(pedido.fecha_expiracion).toLocaleDateString('es-GT') : '—';
  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={[styles.estadoBadge, { backgroundColor: estado.color + '18', borderColor: estado.color }]}>
          <Text style={[styles.estadoText, { color: estado.color }]}>{estado.label}</Text>
        </View>
        <Text style={styles.catText} numberOfLines={1}>{pedido.categoria?.nombre || '—'}</Text>
      </View>
      <Text style={styles.desc} numberOfLines={3}>{pedido.descripcion}</Text>
      <View style={styles.metaRow}>
        <Text style={styles.metaItem}>Vence: {vence}</Text>
        <Text style={styles.metaItem}>{pedido.cotizaciones_count ?? 0} cotizaciones</Text>
      </View>
      <Text style={styles.fecha}>
        Publicado: {pedido.created_at ? new Date(pedido.created_at).toLocaleDateString('es-GT') : ''}
      </Text>
    </View>
  );
}

export default function MisPedidosScreen({ navigation }) {
  const [pedidos, setPedidos]         = useState([]);
  const [page, setPage]               = useState(1);
  const [lastPage, setLastPage]       = useState(1);
  const [loading, setLoading]         = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError]             = useState('');

  const cargar = useCallback(async (pagina = 1, append = false) => {
    if (pagina === 1) setLoading(true); else setLoadingMore(true);
    setError('');
    try {
      const data = await getMisPedidos({ page: pagina });
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
  }, []);

  useEffect(() => { cargar(1); }, [cargar]);

  const handleEndReached = () => {
    if (!loadingMore && page < lastPage) cargar(page + 1, true);
  };

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
        renderItem={({ item }) => <PedidoCard pedido={item} />}
        ListHeaderComponent={
          <View style={styles.headerWrap}>
            <TouchableOpacity style={styles.backRow} onPress={() => navigation.goBack()}>
              <Text style={styles.backText}>← Volver</Text>
            </TouchableOpacity>
            <Text style={styles.title}>Mis pedidos</Text>
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
          </View>
        }
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.emptyText}>Todavia no tienes pedidos publicados.</Text>
            <TouchableOpacity
              style={styles.ctaBtn}
              onPress={() => navigation.navigate('PublicarPedido')}
            >
              <Text style={styles.ctaBtnText}>Publicar mi primer pedido</Text>
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
  container:   { flex: 1, backgroundColor: T.canvas },
  center:      { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  listContent: { paddingBottom: 32 },
  headerWrap:  { paddingTop: 20, paddingHorizontal: 16, paddingBottom: 8 },
  title:       { fontSize: 22, fontWeight: '800', color: T.ink, marginBottom: 4 },
  errorText:   { color: T.danger, fontSize: 13, marginBottom: 8 },
  card:        {
    backgroundColor: T.paper, borderRadius: T.rLg,
    marginHorizontal: 16, marginBottom: 12, padding: 16,
    ...T.sh2,
  },
  cardTop:       { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  estadoBadge:   { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10, borderWidth: 1 },
  estadoText:    { fontSize: 11, fontWeight: '700' },
  catText:       { fontSize: 12, color: T.muted, flex: 1 },
  desc:          { fontSize: 14, color: T.text, lineHeight: 20, marginBottom: 10 },
  metaRow:       { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  metaItem:      { fontSize: 12, color: T.muted },
  fecha:         { fontSize: 11, color: T.faint },
  emptyText:     { fontSize: 15, color: T.muted, textAlign: 'center', marginBottom: 20 },
  ctaBtn:        { backgroundColor: T.blue, paddingHorizontal: 24, paddingVertical: 12, borderRadius: T.rMd },
  ctaBtnText:    { color: '#fff', fontWeight: '700', fontSize: 14 },
  footerText:    { textAlign: 'center', fontSize: 11, color: T.faint, padding: 20 },
  backRow:       { marginBottom: 12 },
  backText:      { fontSize: 15, color: T.blue, fontWeight: '600' },
});
