import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { T } from '../../theme';
import {
  formatCurrency,
  getCatIcon,
  getSlotIndicator,
  timeAgo,
  URGENCIA_CONFIG,
} from './providerUtils';

/**
 * Tarjeta de un pedido abierto. El indicador de slot le dice al proveedor,
 * antes de entrar, si la cotizacion sera gratuita o costara un credito.
 */
export default function OpportunityCard({ pedido, onPress }) {
  const urgCfg  = URGENCIA_CONFIG[pedido.urgencia] ?? URGENCIA_CONFIG.baja;
  const slot    = getSlotIndicator(pedido);
  const catIcon = getCatIcon(pedido.categoria?.nombre);

  return (
    <TouchableOpacity style={s.card} activeOpacity={0.86} onPress={onPress}>
      {/* Top row: urgency badge + slot indicator */}
      <View style={s.topRow}>
        <View style={[s.urgBadge, { backgroundColor: urgCfg.bg, borderColor: urgCfg.border }]}>
          <Text style={[s.urgText, { color: urgCfg.text }]}>{urgCfg.label}</Text>
        </View>
        <View style={[s.slotBadge, slot.type === 'gratis' ? s.slotGratis : s.slotCredito]}>
          <Text style={[s.slotText, slot.type === 'gratis' ? s.slotGratisText : s.slotCreditoText]}>
            {slot.label}
          </Text>
        </View>
      </View>

      <Text style={s.desc} numberOfLines={2}>{pedido.descripcion || 'Sin descripción'}</Text>

      <View style={s.metaRow}>
        <Text style={s.catChip}>{catIcon} {pedido.categoria?.nombre || 'Sin categoría'}</Text>
        {pedido.direccion ? (
          <Text style={s.locText} numberOfLines={1}>📍 {pedido.direccion}</Text>
        ) : null}
      </View>

      <View style={s.footer}>
        <Text style={s.timeText}>{timeAgo(pedido.created_at)}</Text>
        {pedido.presupuesto ? (
          <Text style={s.budgetText}>{formatCurrency(pedido.presupuesto)}</Text>
        ) : null}
        <Text style={s.arrowText}>Ver detalle →</Text>
      </View>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: T.white,
    borderRadius: T.rLg,
    padding: 16,
    borderWidth: 1,
    borderColor: T.border,
    ...T.sh2,
  },
  topRow:  { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  urgBadge: {
    paddingHorizontal: 9, paddingVertical: 3,
    borderRadius: 6, borderWidth: 1,
  },
  urgText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.4 },

  slotBadge: {
    marginLeft: 'auto',
    paddingHorizontal: 10, paddingVertical: 3,
    borderRadius: 6, borderWidth: 1,
  },
  slotGratis:     { backgroundColor: '#d1fae5', borderColor: '#86efac' },
  slotCredito:    { backgroundColor: '#fef9c3', borderColor: '#fde047' },
  slotText:       { fontSize: 11, fontWeight: '700' },
  slotGratisText: { color: '#065f46' },
  slotCreditoText:{ color: '#713f12' },

  desc: { fontSize: 14, color: T.text, lineHeight: 20, marginBottom: 10 },

  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' },
  catChip: {
    fontSize: 12, fontWeight: '600', color: T.deep,
    backgroundColor: 'rgba(69,137,212,0.10)',
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 999, overflow: 'hidden',
  },
  locText: { fontSize: 12, color: T.muted, flex: 1 },

  footer:     { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 10, borderTopWidth: 1, borderTopColor: T.border },
  timeText:   { fontSize: 11, color: T.faint, flex: 1 },
  budgetText: { fontSize: 13, fontWeight: '700', color: T.blue },
  arrowText:  { fontSize: 12, color: T.blue, fontWeight: '600' },
});
