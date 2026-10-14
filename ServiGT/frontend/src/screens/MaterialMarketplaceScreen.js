import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { getMateriales, storageUrl } from '../services/api';
import { Button, Card, Input, ScreenHeader, StatusChip } from '../components/ui';
import { chipDeLote, formatoQuetzales, ubicacionLote } from '../utils/materialEstados';
import { T } from '../theme';

export default function MaterialMarketplaceScreen({ navigation, user }) {
  const { width } = useWindowDimensions();
  const [lotes, setLotes] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [departamento, setDepartamento] = useState('');
  const filtros = useRef({});
  const request = useRef(0);
  const allowed = user?.role === 'proveedor';
  const cargar = useCallback(async (page = 1) => {
    const version = ++request.current;
    setLoading(true);
    setError('');
    try {
      const data = await getMateriales({ page, ...filtros.current });
      if (version !== request.current) return;
      setLotes(data.publicaciones || []);
      setMeta(data.meta || null);
    } catch (err) {
      if (version === request.current) setError(err.message);
    } finally {
      if (version === request.current) setLoading(false);
    }
  }, []);
  useEffect(() => { if (allowed) cargar(); return () => { request.current += 1; }; }, [allowed, cargar]);
  if (!allowed) return <Text>La bolsa de materiales es exclusiva para proveedores.</Text>;

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <ScreenHeader title="Bolsa de materiales" onBack={() => navigation.goBack()} />
      <View style={s.actions}>
        <Button kind="secondary" icon="package" onPress={() => navigation.navigate('MisLotesMaterial')}>Mis lotes</Button>
        <Button kind="secondary" icon="bookmark" onPress={() => navigation.navigate('MisReservasMaterial')}>Mis reservas</Button>
      </View>
      <View style={s.filters}>
        <Input style={s.filter} accessibilityLabel="Buscar materiales" placeholder="Buscar materiales" maxLength={100} value={q} onChangeText={setQ} icon="search" />
        <Input style={s.filter} accessibilityLabel="Filtrar departamento" placeholder="Departamento" maxLength={60} value={departamento} onChangeText={setDepartamento} />
        <Button icon="search" onPress={() => { filtros.current = { q: q.trim(), departamento: departamento.trim() }; cargar(); }}>Buscar</Button>
      </View>
      {loading ? <View style={s.center}><ActivityIndicator color={T.blue} /><Text style={s.meta}>Cargando materiales...</Text></View> : error ? (
        <View style={s.center}><Text style={s.error}>{error}</Text><Button onPress={() => cargar(meta?.current_page || 1)}>Reintentar</Button></View>
      ) : lotes.length === 0 ? <Text style={s.empty}>No hay materiales disponibles</Text> : (
        <View style={s.grid}>{lotes.map((lote) => {
          const chip = chipDeLote(lote.estado);
          return <Card key={lote.id} style={[s.card, { width: width >= 1200 ? '31.5%' : width >= 900 ? '48%' : '100%' }]}>
            {lote.imagenes?.[0]?.url ? <Image accessibilityLabel={lote.titulo} source={{ uri: storageUrl(lote.imagenes[0].url) }} style={s.image} /> : null}
            <StatusChip {...chip} />
            <Text style={s.title}>{lote.titulo}</Text>
            <Text style={s.meta} numberOfLines={3}>{lote.descripcion}</Text>
            <Text style={s.meta}>{`${lote.cantidad} ${lote.unidad}`}</Text>
            <Text style={s.price}>{formatoQuetzales(lote.precio_referencial)}</Text>
            <Text style={s.meta}>{ubicacionLote(lote)}</Text>
            <Button kind="secondary" onPress={() => navigation.navigate('MaterialDetail', { id: lote.id })}>Ver lote</Button>
          </Card>;
        })}</View>
      )}
      {!loading && !error && meta?.last_page > 1 ? <View style={s.actions}>
        <Button kind="ghost" disabled={meta.current_page <= 1} onPress={() => cargar(meta.current_page - 1)}>Anterior</Button>
        <Text style={s.meta}>{`${meta.current_page} / ${meta.last_page}`}</Text>
        <Button kind="ghost" disabled={meta.current_page >= meta.last_page} onPress={() => cargar(meta.current_page + 1)}>Siguiente</Button>
      </View> : null}
    </ScrollView>
  );
}
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.canvas },
  content: { padding: T.s4, gap: T.s4, maxWidth: 1100, width: '100%', alignSelf: 'center', paddingBottom: 40 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: T.s2, alignItems: 'center' },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: T.s2 },
  filter: { flexGrow: 1, flexBasis: 180 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: T.s3 },
  card: { gap: T.s2, padding: T.s3 },
  image: { width: '100%', aspectRatio: 1.6, borderRadius: T.rSm },
  title: { fontSize: 17, fontWeight: '800', color: T.ink },
  price: { fontSize: 20, fontWeight: '800', color: T.deep },
  meta: { color: T.muted, fontSize: 14, lineHeight: 20 },
  center: { paddingVertical: 30, alignItems: 'center', gap: T.s3 },
  error: { color: T.danger },
  empty: { textAlign: 'center', paddingVertical: 40, color: T.muted },
});
