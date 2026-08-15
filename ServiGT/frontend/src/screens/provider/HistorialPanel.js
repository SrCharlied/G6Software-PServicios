import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { T } from '../../theme';
import { EmptyState } from '../../components/ui';
import ServicioCard from './ServicioCard';

export default function HistorialPanel({ historial, loading, columnas = 1 }) {
  return (
    <View style={s.wrap}>
      <View style={s.headRow}>
        <Text style={s.title}>Historial</Text>
        <Text style={s.count}>{historial.length} registro(s)</Text>
      </View>

      {loading && historial.length === 0 ? (
        <ActivityIndicator color={T.blue} style={s.loader} />
      ) : historial.length === 0 ? (
        <EmptyState
          icon="archive"
          title="Sin servicios finalizados"
          description="Aquí quedan los trabajos completados, rechazados y cancelados."
        />
      ) : (
        <View style={s.grid}>
          {historial.map((servicio) => (
            <View
              key={servicio.id}
              style={[s.gridItem, { flexBasis: `${100 / columnas}%`, maxWidth: `${100 / columnas}%` }]}
            >
              <ServicioCard servicio={servicio} compact />
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  wrap:     { gap: T.s3 },
  headRow:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: T.s2 },
  title:    { fontSize: 16, fontWeight: '800', color: T.ink },
  count:    { fontSize: 12, color: T.muted, fontWeight: '600' },
  loader:   { marginVertical: 16 },
  grid:     { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -T.s2 },
  gridItem: { paddingHorizontal: T.s2, paddingBottom: T.s3 },
});
