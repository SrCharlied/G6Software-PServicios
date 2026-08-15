import { Feather } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { T } from '../../theme';

const MS_DIA = 86400000;

const diasHasta = (iso) => {
  if (!iso) return null;
  const destino = new Date(iso).getTime();
  if (Number.isNaN(destino)) return null;
  return Math.ceil((destino - Date.now()) / MS_DIA);
};

/**
 * Barra de vigencia para pedidos (fecha de expiracion) y para Premium
 * (fin del ciclo). Recibe la fecha destino y el total de dias del periodo
 * para poder dibujar el avance; sin `totalDias` solo muestra el texto.
 */
export default function ExpiryBar({
  fecha,
  totalDias = 30,
  label = 'Vigencia',
  vencidoLabel = 'Vencido',
  style,
}) {
  const dias = diasHasta(fecha);

  if (dias === null) {
    return null;
  }

  const vencido = dias <= 0;
  const restante = Math.max(0, Math.min(dias, totalDias));
  const progreso = totalDias > 0 ? restante / totalDias : 0;

  const color = vencido ? T.danger : dias <= 3 ? T.warn : T.success;

  return (
    <View style={[styles.wrap, style]}>
      <View style={styles.headRow}>
        <View style={styles.labelRow}>
          <Feather name="clock" size={12} color={color} />
          <Text style={styles.label}>{label}</Text>
        </View>
        <Text style={[styles.value, { color }]}>
          {vencido ? vencidoLabel : `${dias} día${dias === 1 ? '' : 's'}`}
        </Text>
      </View>

      <View style={styles.track}>
        <View style={[styles.fill, { width: `${Math.round(progreso * 100)}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 5 },
  headRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  label: { fontSize: 12, color: T.muted, fontWeight: '600' },
  value: { fontSize: 12, fontWeight: '800' },
  track: {
    height: 6,
    borderRadius: 3,
    backgroundColor: T.inputBg,
    borderWidth: 1,
    borderColor: T.border,
    overflow: 'hidden',
  },
  fill: { height: '100%', borderRadius: 3 },
});
