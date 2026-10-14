import { Text, TouchableOpacity, View } from 'react-native';
import styles from './providerStyles';
import { StatusBadge } from './ProviderBadges';
import { formatCurrency, formatDate } from './providerUtils';
import { Button } from '../../components/ui';
import { useRouter } from 'expo-router';
import { canOpenSafety } from '../../utils/serviceSafety';

/**
 * Tarjeta de un servicio contratado con las acciones que corresponden a su
 * estado: aceptar/rechazar, avisar que va en camino, iniciar con codigo o
 * finalizar.
 */
export default function ServicioCard({
  servicio,
  onAccept,
  onReject,
  onIniciar,
  onFinalizar,
  onEnCamino,
  onMaterial,
  compact = false,
}) {
  const router = useRouter();
  const estado    = servicio.estado;
  const canAccept = estado === 'pendiente';
  // El backend acepta el codigo de inicio desde `aceptado` y desde
  // `en_camino`. Si aqui solo se contemplara `aceptado`, un servicio marcado
  // en camino se quedaria sin ninguna accion disponible.
  const canStart  = estado === 'aceptado' || estado === 'en_camino';
  const canMarkEnRoute = estado === 'aceptado';
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
      {onMaterial && servicio.publicacion_material_id ? (
        <Button kind="secondary" icon="package" onPress={() => onMaterial('MaterialDetail', { id: servicio.publicacion_material_id })}>Ver lote de materiales</Button>
      ) : onMaterial && servicio.puede_publicar_materiales === true ? (
        <Button kind="secondary" icon="package" onPress={() => onMaterial('MaterialCreate', { servicioId: servicio.id })}>Publicar materiales</Button>
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
          {canMarkEnRoute && onEnCamino ? (
            <TouchableOpacity style={styles.enRouteBtn} onPress={() => onEnCamino(servicio.id)}>
              <Text style={styles.enRouteBtnText}>Voy en camino</Text>
            </TouchableOpacity>
          ) : null}
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
      {canOpenSafety(estado) ? <Button kind="secondary" icon="shield" onPress={() => router.push(`/seguridad/servicios/${servicio.id}`)}>Centro de seguridad</Button> : null}
    </View>
  );
}
