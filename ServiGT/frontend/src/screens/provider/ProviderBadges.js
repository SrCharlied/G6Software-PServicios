import { Text, View } from 'react-native';
import styles from './providerStyles';
import { ESTADO_COLORES } from './providerUtils';

/**
 * Fila de 5 estrellas del panel de proveedor. Se mantiene separada de la
 * primitiva `ui/Stars` porque esta usa texto y no iconos, y cambiarla aqui
 * alteraria el aspecto del panel.
 */
export function Stars({ value }) {
  return (
    <View style={styles.starsRow}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Text key={star} style={[styles.star, star <= value ? styles.starOn : styles.starOff]}>★</Text>
      ))}
    </View>
  );
}

export function StatusBadge({ estado }) {
  const colors = ESTADO_COLORES[estado] || ESTADO_COLORES.pendiente;
  return (
    <View style={[styles.statusBadge, { backgroundColor: colors.bg }]}>
      <Text style={[styles.statusBadgeText, { color: colors.text }]}>
        {(estado || 'pendiente').replace(/_/g, ' ')}
      </Text>
    </View>
  );
}
