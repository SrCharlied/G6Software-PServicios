import { Feather } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { T } from '../../theme';

/**
 * Tarjeta de metrica usada por los dashboards de proveedor y administrador.
 * Se dibuja con `flexBasis` para que varias entren en fila en desktop y se
 * apilen solas a 390px sin necesidad de media queries por pantalla.
 */
export default function KpiCard({ label, value, hint, icon, color = T.blue, minWidth = 150, style }) {
  return (
    <View style={[styles.card, { minWidth }, style]}>
      {icon ? (
        <View style={[styles.iconBox, { backgroundColor: `${color}1a` }]}>
          <Feather name={icon} size={14} color={color} />
        </View>
      ) : null}
      <Text style={styles.label} numberOfLines={2}>{label}</Text>
      <Text style={[styles.value, { color }]} numberOfLines={1}>{value}</Text>
      {hint ? <Text style={styles.hint} numberOfLines={2}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexGrow: 1,
    flexBasis: 150,
    padding: T.s4,
    borderRadius: T.rMd,
    borderWidth: 1,
    borderColor: T.border,
    backgroundColor: T.white,
    gap: 4,
    ...T.sh1,
  },
  iconBox: {
    width: 28, height: 28, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 2,
  },
  label: { fontSize: 11, color: T.muted, fontWeight: '700', letterSpacing: 0.3, textTransform: 'uppercase' },
  value: { fontSize: 22, fontWeight: '800' },
  hint:  { fontSize: 11, color: T.faint },
});
