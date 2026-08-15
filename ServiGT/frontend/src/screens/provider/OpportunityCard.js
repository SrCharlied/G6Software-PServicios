import { Feather } from '@expo/vector-icons';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { T } from '../../theme';
import { Card, SlotMeter, StatusChip } from '../../components/ui';
import {
  formatCurrency,
  getCatIcon,
  getSlotInfo,
  timeAgo,
  URGENCIA_LABEL,
  URGENCIA_VARIANT,
} from './providerUtils';

/**
 * Tarjeta de un pedido abierto. Muestra el medidor de slots para que el
 * proveedor sepa antes de entrar si la cotizacion sera gratuita o costara
 * un credito.
 */
export default function OpportunityCard({ pedido, onPress, style }) {
  const slot = getSlotInfo(pedido);

  return (
    <TouchableOpacity activeOpacity={0.86} onPress={onPress} style={style}>
      <Card style={s.card}>
        <View style={s.topRow}>
          <StatusChip
            variant={URGENCIA_VARIANT[pedido.urgencia] ?? 'warn'}
            label={URGENCIA_LABEL[pedido.urgencia] ?? 'MEDIA'}
            size="sm"
          />
          <StatusChip
            variant={slot.cobrable ? 'warn' : 'success'}
            label={slot.label}
            size="sm"
            dot={false}
          />
          <Text style={s.time}>{timeAgo(pedido.created_at)}</Text>
        </View>

        <Text style={s.desc} numberOfLines={2}>{pedido.descripcion || 'Sin descripción'}</Text>

        <View style={s.metaRow}>
          <Text style={s.catChip}>
            {getCatIcon(pedido.categoria?.nombre)} {pedido.categoria?.nombre || 'Sin categoría'}
          </Text>
          {pedido.direccion ? (
            <View style={s.locRow}>
              <Feather name="map-pin" size={12} color={T.muted} />
              <Text style={s.locText} numberOfLines={1}>{pedido.direccion}</Text>
            </View>
          ) : null}
        </View>

        <SlotMeter usados={slot.usados} compact style={s.meter} />

        <View style={s.footer}>
          {pedido.presupuesto ? (
            <Text style={s.budget}>{formatCurrency(pedido.presupuesto)}</Text>
          ) : (
            <View style={{ flex: 1 }} />
          )}
          <View style={s.cta}>
            <Text style={s.ctaText}>Ver detalle</Text>
            <Feather name="chevron-right" size={14} color={T.blue} />
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  card:    { gap: 10 },
  topRow:  { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  time:    { fontSize: 11, color: T.faint, marginLeft: 'auto' },
  desc:    { fontSize: 14, color: T.text, lineHeight: 20 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  catChip: {
    fontSize: 12, fontWeight: '600', color: T.deep,
    backgroundColor: 'rgba(69,137,212,0.10)',
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 999, overflow: 'hidden',
  },
  locRow:  { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4, minWidth: 0 },
  locText: { flex: 1, fontSize: 12, color: T.muted },
  meter:   { marginTop: 2 },
  footer: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingTop: 10, borderTopWidth: 1, borderTopColor: T.border,
  },
  budget:  { flex: 1, fontSize: 13, fontWeight: '700', color: T.blue },
  cta:     { flexDirection: 'row', alignItems: 'center', gap: 2 },
  ctaText: { fontSize: 12, color: T.blue, fontWeight: '700' },
});
