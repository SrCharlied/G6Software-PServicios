import { Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { PremiumBadge } from '../../components/ui';
import styles from './providerStyles';
import { getAvailabilityText, getGreeting, isAvailableNow } from './providerUtils';

/**
 * Cabecera del panel: saludo, badge Premium, disponibilidad del dia y accesos.
 */
export default function ProviderHeader({
  profile,
  premiumInfo,
  disponibilidad,
  subtitle = null,
  onEditarPerfil,
  onLogout,
}) {
  const availableNow = isAvailableNow(disponibilidad);

  return (
    <LinearGradient
      colors={['#1b5499', '#2d6cb8', '#4589d4']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.header}
    >
      <Text style={styles.headerGreet}>{getGreeting()}</Text>
      <Text style={styles.headerTitle}>{subtitle ?? (profile?.nombre || 'Mi panel')}</Text>

      {profile ? (
        <PremiumBadge proveedor={profile} premium={premiumInfo} compact style={styles.headerPremium} />
      ) : null}

      <View style={styles.headerRow}>
        {profile ? (
          <View style={[styles.headerStatus, !availableNow && styles.headerStatusOff]}>
            <View style={[styles.headerStatusDot, !availableNow && styles.headerStatusDotOff]} />
            <Text style={styles.headerStatusText}>{getAvailabilityText(disponibilidad)}</Text>
          </View>
        ) : <View />}

        <View style={styles.headerActions}>
          {profile ? (
            <TouchableOpacity style={styles.headerGhostBtn} onPress={onEditarPerfil}>
              <Text style={styles.headerGhostBtnText}>Editar perfil</Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity style={styles.logoutBtn} onPress={onLogout}>
            <Text style={styles.logoutBtnText}>Salir</Text>
          </TouchableOpacity>
        </View>
      </View>
    </LinearGradient>
  );
}
