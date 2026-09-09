import { Text, TouchableOpacity, View } from 'react-native';
import { PremiumBadge, ProfileCover } from '../../components/ui';
import { storageUrl } from '../../services/api';
import styles from './providerStyles';
import { formatCurrency } from './providerUtils';

/**
 * Resumen del perfil publico del proveedor con su estado Premium detallado.
 *
 * Muestra la misma portada que ve el cliente para que el proveedor sepa como
 * quedo su personalizacion sin tener que salir a mirarse desde fuera.
 */
export default function PerfilPublicoCard({ profile, premiumInfo, onVerComoCliente }) {
  return (
    <View style={styles.card}>
      <ProfileCover
        portadaUri={storageUrl(profile.portada)}
        colorAcento={profile.color_acento}
        height={96}
        radius={12}
        style={styles.profileCover}
      />

      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>Perfil publico</Text>
        <TouchableOpacity onPress={onVerComoCliente}>
          <Text style={styles.linkText}>Ver como cliente</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.profileName}>{profile.nombre}</Text>
      <PremiumBadge proveedor={profile} premium={premiumInfo} showDetails style={styles.profilePremium} />
      <Text style={styles.profileDescription}>{profile.descripcion}</Text>

      <View style={styles.profileMetaWrap}>
        <Text style={styles.profileMeta}>{profile.categoria?.nombre || 'Sin categoria'}</Text>
        <Text style={styles.profileMeta}>{profile.departamento}</Text>
        {profile.tarifa_hora ? (
          <Text style={styles.profileMeta}>Hora: {formatCurrency(profile.tarifa_hora)}</Text>
        ) : null}
        {profile.tarifa_proyecto ? (
          <Text style={styles.profileMeta}>Proyecto: {formatCurrency(profile.tarifa_proyecto)}</Text>
        ) : null}
        {profile.nivel ? <Text style={styles.profileMeta}>Nivel: {profile.nivel}</Text> : null}
      </View>
    </View>
  );
}
