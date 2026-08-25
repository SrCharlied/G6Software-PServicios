import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import { T } from '../../theme';
import styles from './providerStyles';
import ServicioCard from './ServicioCard';

/**
 * Solicitudes entrantes pendientes y servicios ya en curso.
 */
export default function SolicitudesPanel({
  solicitudes,
  pendientes,
  activas,
  loading,
  mutatingServiceId,
  onRefresh,
  onAccept,
  onReject,
  onIniciar,
  onFinalizar,
}) {
  if (loading && solicitudes.length === 0) {
    return <ActivityIndicator color={T.blue} style={styles.sectionLoader} />;
  }

  const renderCard = (servicio) => (
    <View key={servicio.id} style={mutatingServiceId === servicio.id && styles.disabledBlock}>
      <ServicioCard
        servicio={servicio}
        onAccept={onAccept}
        onReject={onReject}
        onIniciar={onIniciar}
        onFinalizar={onFinalizar}
      />
    </View>
  );

  return (
    <View style={styles.sectionStack}>
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>Solicitudes entrantes</Text>
        <TouchableOpacity onPress={onRefresh}><Text style={styles.linkText}>Actualizar</Text></TouchableOpacity>
      </View>

      {pendientes.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>No tienes solicitudes pendientes.</Text>
        </View>
      ) : (
        pendientes.map(renderCard)
      )}

      <Text style={styles.subsectionTitle}>SERVICIOS ACTIVOS</Text>

      {activas.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>No tienes servicios en curso.</Text>
        </View>
      ) : (
        activas.map(renderCard)
      )}
    </View>
  );
}
