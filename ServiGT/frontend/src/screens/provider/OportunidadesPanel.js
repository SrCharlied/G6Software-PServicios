import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { T } from '../../theme';
import { Button, EmptyState } from '../../components/ui';
import OpportunityCard from './OpportunityCard';
import { DeptPickerModal } from './ProviderModals';
import { getCatIcon } from './providerUtils';

/**
 * Pedidos abiertos con filtros por categoria y departamento. En desktop las
 * tarjetas se acomodan en grid; a 390px caen a una sola columna.
 */
export default function OportunidadesPanel({
  oportunidades,
  categorias,
  loading,
  profile,
  columnas = 1,
  onRefresh,
  onAbrirPedido,
}) {
  const [catFiltro, setCatFiltro]   = useState(null);
  const [deptFiltro, setDeptFiltro] = useState('');
  const [showDept, setShowDept]     = useState(false);

  const providerCatIds = useMemo(() => new Set([
    ...(profile?.categorias?.map((c) => c.id) ?? []),
    ...(profile?.categoria_id ? [profile.categoria_id] : []),
  ]), [profile?.categorias, profile?.categoria_id]);

  const filtradas = useMemo(() => {
    let list = oportunidades;
    if (catFiltro != null) {
      list = list.filter((p) => (p.categoria_id ?? p.categoria?.id) === catFiltro);
    }
    if (deptFiltro) {
      const lower = deptFiltro.toLowerCase();
      list = list.filter((p) => p.direccion?.toLowerCase().includes(lower));
    }
    return list;
  }, [oportunidades, catFiltro, deptFiltro]);

  const hasFilters = catFiltro != null || deptFiltro !== '';
  const limpiar = () => { setCatFiltro(null); setDeptFiltro(''); };

  return (
    <View style={s.wrap}>
      <View style={s.headRow}>
        <Text style={s.title}>Pedidos abiertos</Text>
        <Button kind="ghost" size="sm" icon="refresh-cw" onPress={onRefresh}>Actualizar</Button>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chipsRow}>
        <TouchableOpacity
          style={[s.chip, catFiltro == null && s.chipActive]}
          onPress={() => setCatFiltro(null)}
        >
          <Text style={[s.chipText, catFiltro == null && s.chipTextActive]}>Todas</Text>
        </TouchableOpacity>

        {categorias.map((cat) => {
          const active = catFiltro === cat.id;
          const mine   = providerCatIds.has(cat.id);
          return (
            <TouchableOpacity
              key={cat.id}
              style={[s.chip, active && s.chipActive, mine && !active && s.chipMine]}
              onPress={() => setCatFiltro(active ? null : cat.id)}
            >
              <Text style={[s.chipText, active && s.chipTextActive, mine && !active && s.chipMineText]}>
                {getCatIcon(cat.nombre)} {cat.nombre}{mine ? ' ★' : ''}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={s.deptRow}>
        <TouchableOpacity
          style={[s.deptBtn, deptFiltro !== '' && s.deptBtnActive]}
          onPress={() => setShowDept(true)}
        >
          <Text style={[s.deptText, deptFiltro !== '' && s.deptTextActive]} numberOfLines={1}>
            {deptFiltro !== '' ? `📍 ${deptFiltro}` : '📍 Departamento'}
          </Text>
          <Text style={s.deptArrow}>▾</Text>
        </TouchableOpacity>

        {hasFilters ? (
          <Button kind="ghost" size="sm" onPress={limpiar}>Limpiar</Button>
        ) : null}
      </View>

      {!loading && oportunidades.length > 0 ? (
        <Text style={s.count}>
          {filtradas.length} resultado{filtradas.length !== 1 ? 's' : ''}
          {hasFilters ? ' con filtros aplicados' : ''}
        </Text>
      ) : null}

      {loading && oportunidades.length === 0 ? (
        <ActivityIndicator color={T.blue} style={s.loader} />
      ) : filtradas.length === 0 ? (
        <EmptyState
          icon="search"
          title={hasFilters ? 'Sin resultados con esos filtros' : 'No hay oportunidades nuevas'}
          description={
            hasFilters
              ? 'Prueba con otra categoría o departamento.'
              : 'Cuando un cliente publique un pedido abierto aparecerá aquí.'
          }
          actionLabel={hasFilters ? 'Limpiar filtros' : undefined}
          onAction={hasFilters ? limpiar : undefined}
        />
      ) : (
        <View style={s.grid}>
          {filtradas.map((pedido) => (
            <View
              key={pedido.id}
              style={[
                s.gridItem,
                { flexBasis: `${100 / columnas}%`, maxWidth: `${100 / columnas}%` },
              ]}
            >
              <OpportunityCard pedido={pedido} onPress={() => onAbrirPedido(pedido.id)} />
            </View>
          ))}
        </View>
      )}

      <DeptPickerModal
        visible={showDept}
        value={deptFiltro}
        onSelect={(dept) => { setDeptFiltro(dept); setShowDept(false); }}
        onClose={() => setShowDept(false)}
      />
    </View>
  );
}

const s = StyleSheet.create({
  wrap:    { gap: T.s3 },
  headRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: T.s2 },
  title:   { fontSize: 16, fontWeight: '800', color: T.ink },

  chipsRow: { flexDirection: 'row', gap: 8, paddingVertical: 4 },
  chip: {
    paddingHorizontal: 13, paddingVertical: 7,
    borderRadius: 999, borderWidth: 1,
    borderColor: T.inputBorder, backgroundColor: T.white,
  },
  chipActive:    { backgroundColor: T.blue, borderColor: T.blue },
  chipMine:      { borderColor: T.deep, borderWidth: 1.5, backgroundColor: 'rgba(27,84,153,0.06)' },
  chipText:      { fontSize: 12, color: T.muted, fontWeight: '600' },
  chipTextActive:{ color: T.white },
  chipMineText:  { color: T.deep },

  deptRow: { flexDirection: 'row', alignItems: 'center', gap: T.s2 },
  deptBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 13, paddingVertical: 10,
    borderRadius: T.rSm, borderWidth: 1, borderColor: T.inputBorder,
    backgroundColor: T.white,
  },
  deptBtnActive: { borderColor: T.blue, backgroundColor: '#eef4ff' },
  deptText:      { flex: 1, fontSize: 13, color: T.muted },
  deptTextActive:{ color: T.blue, fontWeight: '600' },
  deptArrow:     { fontSize: 11, color: T.faint, marginLeft: 4 },

  count:  { fontSize: 12, color: T.faint },
  loader: { marginVertical: 16 },

  grid:     { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -T.s2 },
  gridItem: { paddingHorizontal: T.s2, paddingBottom: T.s3 },
});
