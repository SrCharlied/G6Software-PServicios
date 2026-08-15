import { StyleSheet, Text, View } from 'react-native';
import { T } from '../../theme';
import { Button, Card, StatusChip } from '../../components/ui';
import { ESTADO_VARIANT, estadoLabel, formatCurrency, formatDate } from './providerUtils';

/**
 * Tarjeta de un servicio contratado, con las acciones que corresponden al
 * estado actual: aceptar/rechazar, iniciar con codigo, o finalizar.
 */
export default function ServicioCard({
  servicio,
  onAccept,
  onReject,
  onIniciar,
  onFinalizar,
  compact = false,
  style,
}) {
  const estado = servicio.estado;
  const canAccept    = estado === 'pendiente';
  const canStart     = estado === 'aceptado';
  const canFinish    = estado === 'en_progreso';
  const porConfirmar = estado === 'por_confirmar';

  return (
    <Card style={[s.card, style]}>
      <View style={s.topRow}>
        <View style={s.topInfo}>
          <Text style={s.cliente} numberOfLines={1}>{servicio.cliente?.name || 'Cliente'}</Text>
          <Text style={s.categoria} numberOfLines={1}>
            {servicio.categoria?.nombre || 'Servicio sin categoría'}
          </Text>
        </View>
        <StatusChip
          variant={ESTADO_VARIANT[estado] ?? 'neutral'}
          label={estadoLabel(estado)}
          size="sm"
        />
      </View>

      <Text style={s.desc} numberOfLines={compact ? 2 : undefined}>{servicio.descripcion}</Text>

      <View style={s.metaGrid}>
        <Text style={s.meta}>Fecha: {formatDate(servicio.fecha_agendada || servicio.created_at)}</Text>
        <Text style={s.meta}>Monto: {formatCurrency(servicio.monto_acordado)}</Text>
        <Text style={s.meta}>Dirección: {servicio.direccion || 'Sin dirección'}</Text>
      </View>

      {servicio.motivo_cancelacion ? (
        <View style={s.reasonBox}>
          <Text style={s.reasonLabel}>MOTIVO</Text>
          <Text style={s.reasonText}>{servicio.motivo_cancelacion}</Text>
        </View>
      ) : null}

      {porConfirmar && servicio.codigo_fin ? (
        <View style={s.codigoBox}>
          <Text style={s.codigoLabel}>ESPERANDO CONFIRMACIÓN DEL CLIENTE</Text>
          <Text style={s.codigoValue}>{servicio.codigo_fin}</Text>
          <Text style={s.codigoHint}>
            Dale este código al cliente para que confirme la finalización del servicio.
          </Text>
        </View>
      ) : null}

      {canAccept ? (
        <View style={s.actions}>
          <Button kind="primary" size="sm" icon="check" onPress={() => onAccept(servicio.id)}>
            Aceptar
          </Button>
          <Button kind="danger" size="sm" icon="x" onPress={() => onReject(servicio.id)}>
            Rechazar
          </Button>
        </View>
      ) : canStart ? (
        <View style={s.actions}>
          <Button kind="primary" size="sm" icon="play" onPress={() => onIniciar(servicio)}>
            Iniciar servicio
          </Button>
        </View>
      ) : canFinish ? (
        <View style={s.actions}>
          <Button kind="primary" size="sm" icon="flag" onPress={() => onFinalizar(servicio)}>
            Finalizar trabajo
          </Button>
        </View>
      ) : null}
    </Card>
  );
}

const s = StyleSheet.create({
  card:      { gap: 10 },
  topRow:    { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 },
  topInfo:   { flex: 1, minWidth: 0 },
  cliente:   { fontSize: 15, fontWeight: '700', color: T.ink },
  categoria: { fontSize: 12, color: T.muted, marginTop: 3 },
  desc:      { fontSize: 14, color: T.text, lineHeight: 21, opacity: 0.85 },
  metaGrid:  { gap: 4, paddingTop: 10, borderTopWidth: 1, borderTopColor: T.border },
  meta:      { fontSize: 12, color: T.muted },

  reasonBox:   { padding: 12, borderRadius: T.rSm, backgroundColor: '#fef2f2', borderLeftWidth: 3, borderLeftColor: T.danger },
  reasonLabel: { fontSize: 10, fontWeight: '800', color: '#991b1b', marginBottom: 3, letterSpacing: 0.6 },
  reasonText:  { fontSize: 13, color: '#991b1b', lineHeight: 18 },

  codigoBox:   { backgroundColor: '#fff4e0', borderRadius: T.rSm, padding: 14, alignItems: 'center' },
  codigoLabel: { fontSize: 10, color: '#b76e00', fontWeight: '800', letterSpacing: 0.6 },
  codigoValue: { fontSize: 28, fontWeight: '800', color: T.ink, letterSpacing: 6, marginTop: 4 },
  codigoHint:  { fontSize: 11, color: '#7a5200', marginTop: 6, textAlign: 'center' },

  actions: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
});
