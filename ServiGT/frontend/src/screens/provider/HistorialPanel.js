import { ActivityIndicator, Text, View } from 'react-native';
import { T } from '../../theme';
import styles from './providerStyles';
import ServicioCard from './ServicioCard';

export default function HistorialPanel({ historial, loading }) {
  return (
    <View style={styles.sectionStack}>
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>Historial</Text>
        <Text style={styles.historyCounter}>{historial.length} registro(s)</Text>
      </View>

      {loading && historial.length === 0 ? (
        <ActivityIndicator color={T.blue} style={styles.sectionLoader} />
      ) : historial.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>Aun no hay servicios finalizados o rechazados.</Text>
        </View>
      ) : (
        historial.map((servicio) => (
          <ServicioCard key={servicio.id} servicio={servicio} compact />
        ))
      )}
    </View>
  );
}
