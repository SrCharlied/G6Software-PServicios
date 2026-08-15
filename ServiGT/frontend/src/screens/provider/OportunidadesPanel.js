import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { T } from '../../theme';
import styles from './providerStyles';
import OpportunityCard from './OpportunityCard';
import { DeptPickerModal } from './ProviderModals';
import { getCatIcon } from './providerUtils';

/**
 * Pedidos abiertos con filtros por categoria y departamento. El filtro vive
 * aqui y no en la pantalla: nadie mas lo necesita.
 */
export default function OportunidadesPanel({
  oportunidades,
  categorias,
  loading,
  profile,
  onRefresh,
  onAbrirPedido,
}) {
  const [catFiltro, setCatFiltro]   = useState(null);
  const [deptFiltro, setDeptFiltro] = useState('');
  const [showDeptPicker, setShowDeptPicker] = useState(false);

  const providerCatIds = useMemo(() => new Set([
    ...(profile?.categorias?.map((c) => c.id) ?? []),
    ...(profile?.categoria_id ? [profile.categoria_id] : []),
  ]), [profile?.categorias, profile?.categoria_id]);

  const oportunidadesFiltradas = useMemo(() => {
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
  const limpiarFiltros = () => { setCatFiltro(null); setDeptFiltro(''); };

  return (
    <View style={styles.sectionStack}>
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>Pedidos abiertos</Text>
        <TouchableOpacity onPress={onRefresh}>
          <Text style={styles.linkText}>Actualizar</Text>
        </TouchableOpacity>
      </View>

      {/* Category chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={f.chipsRow}>
        <TouchableOpacity
          style={[f.chip, catFiltro == null && f.chipActive]}
          onPress={() => setCatFiltro(null)}
        >
          <Text style={[f.chipText, catFiltro == null && f.chipTextActive]}>Todas</Text>
        </TouchableOpacity>

        {categorias.map((cat) => {
          const active = catFiltro === cat.id;
          const isProviderCat = providerCatIds.has(cat.id);
          return (
            <TouchableOpacity
              key={cat.id}
              style={[f.chip, active && f.chipActive, isProviderCat && !active && f.chipMine]}
              onPress={() => setCatFiltro(active ? null : cat.id)}
            >
              <Text style={[f.chipText, active && f.chipTextActive, isProviderCat && !active && f.chipMineText]}>
                {getCatIcon(cat.nombre)} {cat.nombre}
                {isProviderCat ? ' ★' : ''}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Dept row */}
      <View style={f.deptRow}>
        <TouchableOpacity
          style={[f.deptBtn, deptFiltro !== '' && f.deptBtnActive]}
          onPress={() => setShowDeptPicker(true)}
        >
          <Text style={[f.deptBtnText, deptFiltro !== '' && f.deptBtnTextActive]}>
            {deptFiltro !== '' ? `📍 ${deptFiltro}` : '📍 Departamento'}
          </Text>
          <Text style={f.deptArrow}>▾</Text>
        </TouchableOpacity>

        {hasFilters && (
          <TouchableOpacity style={f.clearBtn} onPress={limpiarFiltros}>
            <Text style={f.clearBtnText}>Limpiar filtros</Text>
          </TouchableOpacity>
        )}
      </View>

      {!loading && oportunidades.length > 0 && (
        <Text style={f.resultCount}>
          {oportunidadesFiltradas.length} resultado{oportunidadesFiltradas.length !== 1 ? 's' : ''}
          {hasFilters ? ' con filtros aplicados' : ''}
        </Text>
      )}

      <FlatList
        data={oportunidadesFiltradas}
        keyExtractor={(item) => String(item.id)}
        scrollEnabled={false}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={onRefresh}
            colors={[T.blue]}
            tintColor={T.blue}
          />
        }
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator color={T.blue} style={styles.sectionLoader} />
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>
                {hasFilters
                  ? 'No hay oportunidades con los filtros seleccionados.'
                  : 'No hay oportunidades nuevas en este momento.'}
              </Text>
              {hasFilters && (
                <TouchableOpacity style={f.emptyLimpiarBtn} onPress={limpiarFiltros}>
                  <Text style={f.emptyLimpiarText}>Limpiar filtros</Text>
                </TouchableOpacity>
              )}
            </View>
          )
        }
        renderItem={({ item }) => (
          <OpportunityCard pedido={item} onPress={() => onAbrirPedido(item.id)} />
        )}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
      />

      <DeptPickerModal
        visible={showDeptPicker}
        value={deptFiltro}
        onSelect={(dept) => { setDeptFiltro(dept); setShowDeptPicker(false); }}
        onClose={() => setShowDeptPicker(false)}
      />
    </View>
  );
}

const f = StyleSheet.create({
  chipsRow: { flexDirection: 'row', gap: 8, paddingVertical: 4 },
  chip: {
    paddingHorizontal: 13, paddingVertical: 7,
    borderRadius: 999, borderWidth: 1,
    borderColor: T.inputBorder, backgroundColor: T.white,
  },
  chipActive:     { backgroundColor: T.blue, borderColor: T.blue },
  chipMine:       { borderColor: T.deep, borderWidth: 1.5, backgroundColor: 'rgba(27,84,153,0.06)' },
  chipText:       { fontSize: 12, color: T.muted, fontWeight: '600' },
  chipTextActive: { color: '#fff' },
  chipMineText:   { color: T.deep },

  deptRow:         { flexDirection: 'row', alignItems: 'center', gap: 8 },
  deptBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 13, paddingVertical: 10,
    borderRadius: T.rSm, borderWidth: 1, borderColor: T.inputBorder,
    backgroundColor: T.white,
  },
  deptBtnActive:    { borderColor: T.blue, backgroundColor: '#eef4ff' },
  deptBtnText:      { fontSize: 13, color: T.muted, flex: 1 },
  deptBtnTextActive:{ color: T.blue, fontWeight: '600' },
  deptArrow:        { fontSize: 11, color: T.faint, marginLeft: 4 },

  clearBtn:     { paddingHorizontal: 12, paddingVertical: 10 },
  clearBtnText: { fontSize: 13, color: T.danger, fontWeight: '600' },

  resultCount: { fontSize: 12, color: T.faint },

  emptyLimpiarBtn:  { marginTop: 12, paddingHorizontal: 20, paddingVertical: 9, borderRadius: T.rSm, borderWidth: 1, borderColor: T.inputBorder },
  emptyLimpiarText: { fontSize: 13, color: T.muted, fontWeight: '600' },
});
