import { StyleSheet, Text, View } from 'react-native';
import { T } from '../../theme';

const SLOTS_GRATIS = 3;
const MAX_SLOTS    = 6;

/**
 * Medidor de cotizaciones de un pedido: 6 casillas, las 3 primeras gratuitas
 * y las 3 siguientes con costo de 1 credito. Es una regla del backend, no una
 * decision visual, por eso las constantes viven junto al componente y se
 * pueden sobreescribir solo si el backend cambia.
 */
export default function SlotMeter({
  usados = 0,
  gratis = SLOTS_GRATIS,
  max = MAX_SLOTS,
  title = 'Cotizaciones',
  compact,
  style,
}) {
  const ocupados = Math.max(0, Math.min(usados, max));
  const restantes = max - ocupados;
  const proximoEsCobrable = ocupados >= gratis && restantes > 0;

  return (
    <View style={[styles.wrap, style]}>
      <View style={styles.headRow}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.count}>{ocupados}/{max}</Text>
      </View>

      <View style={styles.track}>
        {Array.from({ length: max }, (_, i) => {
          const lleno = i < ocupados;
          const esGratis = i < gratis;
          return (
            <View
              key={i}
              style={[
                styles.slot,
                compact && styles.slotCompact,
                lleno && (esGratis ? styles.slotGratis : styles.slotCobrable),
              ]}
            />
          );
        })}
      </View>

      <Text style={styles.hint}>
        {restantes === 0
          ? 'Este pedido alcanzó el máximo de 6 cotizaciones.'
          : proximoEsCobrable
            ? `Quedan ${restantes} espacio(s). El siguiente cuesta 1 crédito.`
            : `Quedan ${gratis - ocupados} cotización(es) gratuita(s) de ${gratis}.`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  headRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 12, fontWeight: '700', color: T.ink },
  count: { fontSize: 12, fontWeight: '700', color: T.muted },
  track: { flexDirection: 'row', gap: 4 },
  slot: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: T.inputBg,
    borderWidth: 1,
    borderColor: T.border,
  },
  slotCompact:  { height: 6 },
  slotGratis:   { backgroundColor: T.success, borderColor: T.success },
  slotCobrable: { backgroundColor: T.amber,   borderColor: T.amber },
  hint: { fontSize: 11, color: T.muted },
});
