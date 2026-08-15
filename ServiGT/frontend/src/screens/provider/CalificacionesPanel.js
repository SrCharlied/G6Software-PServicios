import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import { T } from '../../theme';
import styles from './providerStyles';
import { Stars } from './ProviderBadges';

export default function CalificacionesPanel({ calificaciones, promedio, total, loading, onRefresh }) {
  return (
    <View style={styles.sectionStack}>
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>Calificaciones</Text>
        <TouchableOpacity onPress={onRefresh}><Text style={styles.linkText}>Actualizar</Text></TouchableOpacity>
      </View>

      <View style={styles.ratingSummary}>
        <Text style={styles.ratingAverage}>{promedio ? promedio.toFixed(1) : '0.0'}</Text>
        <View>
          <Stars value={Math.round(promedio || 0)} />
          <Text style={styles.ratingSummaryText}>{total} resena(s)</Text>
        </View>
      </View>

      {loading && calificaciones.length === 0 ? (
        <ActivityIndicator color={T.blue} style={styles.sectionLoader} />
      ) : calificaciones.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>Aun no recibes calificaciones.</Text>
        </View>
      ) : (
        calificaciones.map((c) => (
          <View key={c.id} style={styles.reviewCard}>
            <View style={styles.reviewHeader}>
              <Text style={styles.reviewAuthor}>{c.autor?.name || 'Usuario'}</Text>
              <Stars value={c.puntuacion} />
            </View>
            {c.comentario
              ? <Text style={styles.reviewComment}>{c.comentario}</Text>
              : <Text style={styles.reviewMuted}>Sin comentario escrito.</Text>}
          </View>
        ))
      )}
    </View>
  );
}
