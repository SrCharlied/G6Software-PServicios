import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { T } from '../../theme';
import { Button, EmptyState } from '../../components/ui';
import ServicioCard from './ServicioCard';

/**
 * "Trabajos" del proveedor: solicitudes por responder y servicios en curso.
 * El cliente ve el mismo dominio bajo el nombre "Mis servicios".
 */
export default function TrabajosPanel({
  pendientes,
  activas,
  loading,
  mutatingServiceId,
  columnas = 1,
  onRefresh,
  onAccept,
  onReject,
  onIniciar,
  onFinalizar,
}) {
  const renderLista = (items, vacio) => {
    if (items.length === 0) return vacio;

    return (
      <View style={s.grid}>
        {items.map((servicio) => (
          <View
            key={servicio.id}
            style={[
              s.gridItem,
              { flexBasis: `${100 / columnas}%`, maxWidth: `${100 / columnas}%` },
              mutatingServiceId === servicio.id && s.mutando,
            ]}
          >
            <ServicioCard
              servicio={servicio}
              onAccept={onAccept}
              onReject={onReject}
              onIniciar={onIniciar}
              onFinalizar={onFinalizar}
            />
          </View>
        ))}
      </View>
    );
  };

  if (loading && pendientes.length === 0 && activas.length === 0) {
    return <ActivityIndicator color={T.blue} style={s.loader} />;
  }

  return (
    <View style={s.wrap}>
      <View style={s.headRow}>
        <Text style={s.title}>Solicitudes entrantes</Text>
        <Button kind="ghost" size="sm" icon="refresh-cw" onPress={onRefresh}>Actualizar</Button>
      </View>

      {renderLista(
        pendientes,
        <EmptyState
          icon="inbox"
          title="Sin solicitudes pendientes"
          description="Cuando un cliente te solicite un servicio directo aparecerá aquí."
        />,
      )}

      <Text style={s.subtitle}>SERVICIOS ACTIVOS</Text>

      {renderLista(
        activas,
        <EmptyState
          icon="activity"
          title="Sin servicios en curso"
          description="Los trabajos aceptados y en progreso se listan en esta sección."
        />,
      )}
    </View>
  );
}

const s = StyleSheet.create({
  wrap:     { gap: T.s3 },
  headRow:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: T.s2 },
  title:    { fontSize: 16, fontWeight: '800', color: T.ink },
  subtitle: { fontSize: 12, fontWeight: '800', color: T.muted, letterSpacing: 0.6, marginTop: T.s2 },
  loader:   { marginVertical: 16 },
  grid:     { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -T.s2 },
  gridItem: { paddingHorizontal: T.s2, paddingBottom: T.s3 },
  mutando:  { opacity: 0.6 },
});
