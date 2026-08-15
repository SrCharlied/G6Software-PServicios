import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { T } from '../../theme';
import { Button, Card, EmptyState, Stars } from '../../components/ui';

export default function CalificacionesPanel({ calificaciones, promedio, total, loading, columnas = 1, onRefresh }) {
  return (
    <View style={s.wrap}>
      <View style={s.headRow}>
        <Text style={s.title}>Calificaciones</Text>
        <Button kind="ghost" size="sm" icon="refresh-cw" onPress={onRefresh}>Actualizar</Button>
      </View>

      <Card style={s.resumen}>
        <Text style={s.promedio}>{promedio ? promedio.toFixed(1) : '0.0'}</Text>
        <View style={s.resumenTexto}>
          <Stars value={promedio || 0} size={16} />
          <Text style={s.resumenSub}>{total} reseña(s)</Text>
        </View>
      </Card>

      {loading && calificaciones.length === 0 ? (
        <ActivityIndicator color={T.blue} style={s.loader} />
      ) : calificaciones.length === 0 ? (
        <EmptyState
          icon="star"
          title="Aún no recibes calificaciones"
          description="Completa servicios para que tus clientes puedan calificarte."
        />
      ) : (
        <View style={s.grid}>
          {calificaciones.map((c) => (
            <View
              key={c.id}
              style={[s.gridItem, { flexBasis: `${100 / columnas}%`, maxWidth: `${100 / columnas}%` }]}
            >
              <Card style={s.reviewCard}>
                <View style={s.reviewHead}>
                  <Text style={s.reviewAutor} numberOfLines={1}>{c.autor?.name || 'Usuario'}</Text>
                  <Stars value={c.puntuacion} />
                </View>
                {c.comentario ? (
                  <Text style={s.reviewTexto}>{c.comentario}</Text>
                ) : (
                  <Text style={s.reviewVacio}>Sin comentario escrito.</Text>
                )}
              </Card>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  wrap:    { gap: T.s3 },
  headRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: T.s2 },
  title:   { fontSize: 16, fontWeight: '800', color: T.ink },

  resumen:      { flexDirection: 'row', alignItems: 'center', gap: T.s4, borderLeftWidth: 4, borderLeftColor: T.blue },
  promedio:     { fontSize: 40, fontWeight: '800', color: T.blue, letterSpacing: -1.4 },
  resumenTexto: { gap: 4 },
  resumenSub:   { fontSize: 12, color: T.muted },

  loader:   { marginVertical: 16 },
  grid:     { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -T.s2 },
  gridItem: { paddingHorizontal: T.s2, paddingBottom: T.s3 },

  reviewCard:  { gap: 8 },
  reviewHead:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: T.s2 },
  reviewAutor: { flex: 1, fontSize: 14, fontWeight: '700', color: T.ink },
  reviewTexto: { fontSize: 13, color: T.text, lineHeight: 20, opacity: 0.85 },
  reviewVacio: { fontSize: 13, color: T.faint, fontStyle: 'italic' },
});
