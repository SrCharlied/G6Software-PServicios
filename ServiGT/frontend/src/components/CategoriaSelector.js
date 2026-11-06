import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { T } from '../theme';
import { MAX_CATEGORIAS, alternarCategoria, marcarPrincipal } from '../utils/categoriasProveedor';

// Selector de categorias del proveedor (HU 1.6.c): maximo MAX_CATEGORIAS y
// principal explicita. `value` es la lista de IDs (strings) con la principal
// primero; `onChange` recibe la lista nueva.
export default function CategoriaSelector({
  categorias,
  value,
  onChange,
  loading = false,
  error = null,
  max = MAX_CATEGORIAS,
}) {
  const lleno = value.length >= max;
  const nombrePorId = new Map(categorias.map((c) => [String(c.id), c.nombre]));
  const nombreDe = (id) => nombrePorId.get(id) || `Categoría ${id}`;

  if (loading) {
    return <ActivityIndicator color={T.blue} style={s.loader} />;
  }

  return (
    <View>
      <Text style={s.helper}>
        {value.length}/{max} seleccionadas
        {lleno ? ' · quita una para elegir otra' : ''}
      </Text>

      <View style={s.chipGrid}>
        {categorias.map((c) => {
          const clave = String(c.id);
          const selected = value.includes(clave);
          const bloqueada = !selected && lleno;
          return (
            <TouchableOpacity
              key={c.id}
              style={[s.chip, selected && s.chipSelected, bloqueada && s.chipBloqueada]}
              onPress={() => onChange(alternarCategoria(value, clave, max))}
              disabled={bloqueada}
              activeOpacity={0.8}
              accessibilityRole="checkbox"
              accessibilityLabel={`Categoría ${c.nombre}`}
              accessibilityState={{ checked: selected, disabled: bloqueada }}
            >
              {selected ? <Text style={s.chipCheck}>✓</Text> : null}
              <Text style={[s.chipText, selected && s.chipTextSelected]}>{c.nombre}</Text>
              {selected && value[0] === clave ? <Text style={s.chipPrincipal}>Principal</Text> : null}
            </TouchableOpacity>
          );
        })}
      </View>

      {value.length > 1 ? (
        <View style={s.principalBox}>
          <Text style={s.principalLabel}>Categoría principal</Text>
          <Text style={s.principalHint}>Es la que aparece primero en tu tarjeta del catálogo.</Text>
          <View style={s.chipGrid}>
            {value.map((id) => {
              const activa = value[0] === id;
              return (
                <TouchableOpacity
                  key={id}
                  style={[s.radio, activa && s.radioActiva]}
                  onPress={() => onChange(marcarPrincipal(value, id))}
                  activeOpacity={0.8}
                  accessibilityRole="radio"
                  accessibilityLabel={`Principal: ${nombreDe(id)}`}
                  accessibilityState={{ selected: activa }}
                >
                  <View style={[s.radioDot, activa && s.radioDotActiva]} />
                  <Text style={[s.radioText, activa && s.radioTextActiva]}>{nombreDe(id)}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      ) : null}

      {error ? <Text style={s.error}>{error}</Text> : null}
    </View>
  );
}

const s = StyleSheet.create({
  loader: { marginVertical: 12 },
  helper: { fontSize: 12, color: T.muted, marginBottom: 8 },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: T.inputBorder,
    backgroundColor: T.white,
  },
  chipSelected: { backgroundColor: T.blue, borderColor: T.blue },
  chipBloqueada: { opacity: 0.45 },
  chipCheck: { fontSize: 11, color: T.paper, fontWeight: '700' },
  chipText: { fontSize: 13, color: T.muted, fontWeight: '500' },
  chipTextSelected: { color: T.paper, fontWeight: '600' },
  chipPrincipal: {
    fontSize: 10,
    fontWeight: '700',
    color: T.deep,
    backgroundColor: T.tint,
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 1,
    overflow: 'hidden',
  },
  principalBox: { marginTop: 10 },
  principalLabel: { fontSize: 13, fontWeight: '600', color: T.text },
  principalHint: { fontSize: 12, color: T.muted, marginBottom: 8 },
  radio: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: T.inputBorder,
    backgroundColor: T.white,
  },
  radioActiva: { borderColor: T.blue, backgroundColor: T.tint },
  radioDot: { width: 10, height: 10, borderRadius: 5, borderWidth: 1.5, borderColor: T.faint },
  radioDotActiva: { borderColor: T.blue, backgroundColor: T.blue },
  radioText: { fontSize: 13, color: T.muted },
  radioTextActiva: { color: T.deep, fontWeight: '600' },
  error: { fontSize: 12, color: T.danger, marginTop: 4 },
});
