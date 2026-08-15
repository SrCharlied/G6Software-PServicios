import { Text, TouchableOpacity, View } from 'react-native';
import styles from './providerStyles';
import { StatusBadge } from './ProviderBadges';
import { formatCurrency, formatDate } from './providerUtils';

/**
 * Tarjeta de un servicio contratado con las acciones que corresponden a su
 * estado: aceptar/rechazar, iniciar con codigo o finalizar.
 */
export default function ServicioCard({
  servicio,
  onAccept,
  onReject,
  onIniciar,
  onFinalizar,
  compact = false,
}) {
  const estado    = servicio.estado;
  const canAccept = estado === 'pendiente';
  const canStart  = estado === 'aceptado';
  const canFinish = estado === 'en_progreso';
  const porConfirmar = estado === 'por_confirmar';

  return (
    <View style={[styles.serviceCard, compact && styles.serviceCardCompact]}>
      <View style={styles.serviceTopRow}>
        <View style={styles.serviceTopInfo}>
          <Text style={styles.serviceClient}>{servicio.cliente?.name || 'Cliente'}</Text>
          <Text style={styles.serviceCategory}>{servicio.categoria?.nombre || 'Servicio sin categoria'}</Text>
        </View>
        <StatusBadge estado={estado} />
      </View>

      <Text style={styles.serviceDescription}>{servicio.descripcion}</Text>

      <View style={styles.serviceMetaGrid}>
        <Text style={styles.serviceMeta}>Fecha: {formatDate(servicio.fecha_agendada || servicio.created_at)}</Text>
        <Text style={styles.serviceMeta}>Monto: {formatCurrency(servicio.monto_acordado)}</Text>
        <Text style={styles.serviceMeta}>Direccion: {servicio.direccion || 'Sin direccion'}</Text>
      </View>

      {servicio.motivo_cancelacion ? (
        <View style={styles.reasonBox}>
          <Text style={styles.reasonLabel}>Motivo</Text>
          <Text style={styles.reasonText}>{servicio.motivo_cancelacion}</Text>
        </View>
      ) : null}

      {porConfirmar && servicio.codigo_fin ? (
        <View style={styles.codigoFinBox}>
          <Text style={styles.codigoFinLabel}>Esperando confirmacion del cliente</Text>
          <Text style={styles.codigoFinValue}>{servicio.codigo_fin}</Text>
          <Text style={styles.codigoFinHint}>
            Dale este codigo al cliente para que confirme la finalizacion del servicio.
          </Text>
        </View>
      ) : null}

      {canAccept ? (
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.acceptBtn} onPress={() => onAccept(servicio.id)}>
            <Text style={styles.acceptBtnText}>Aceptar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.rejectBtn} onPress={() => onReject(servicio.id)}>
            <Text style={styles.rejectBtnText}>Rechazar</Text>
          </TouchableOpacity>
        </View>
      ) : canStart ? (
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.advanceBtn} onPress={() => onIniciar(servicio)}>
            <Text style={styles.advanceBtnText}>Iniciar servicio</Text>
          </TouchableOpacity>
        </View>
      ) : canFinish ? (
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.advanceBtn} onPress={() => onFinalizar(servicio)}>
            <Text style={styles.advanceBtnText}>Finalizar trabajo</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
}
