import { Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { PremiumBadge } from '../../components/ui';
import styles from './providerStyles';
import { getAvailabilityText, getGreeting, isAvailableNow } from './providerUtils';

/**
 * Cabecera del panel: saludo, badge Premium, saldo de creditos, disponibilidad
 * del dia y accesos.
 *
 * El saldo se muestra aqui y no dentro de un panel porque el proveedor gasta
 * creditos al cotizar desde Oportunidades: tenerlo a la vista al entrar evita
 * que descubra que no le alcanza a medio flujo.
 */
export default function ProviderHeader({
  profile,
  premiumInfo,
  saldo,
  disponibilidad,
  subtitle = null,
  onEditarPerfil,
  onVerCreditos,
  onLogout,
}) {
  const availableNow = isAvailableNow(disponibilidad);

  // saldo es null mientras carga y 0 es un saldo legitimo, asi que la guarda
  // compara contra null en vez de confiar en el valor falsy.
  const saldoVisible = saldo !== null && saldo !== undefined;

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
        <View style={styles.headerMeta}>
          {profile ? (
            <View style={[styles.headerStatus, !availableNow && styles.headerStatusOff]}>
              <View style={[styles.headerStatusDot, !availableNow && styles.headerStatusDotOff]} />
              <Text style={styles.headerStatusText}>{getAvailabilityText(disponibilidad)}</Text>
            </View>
          ) : null}

          {saldoVisible ? (
            <TouchableOpacity
              style={styles.headerSaldo}
              onPress={onVerCreditos}
              accessibilityRole="button"
              accessibilityLabel={`Saldo de ${saldo} creditos. Ir a Creditos.`}
            >
              <Text style={styles.headerSaldoLabel}>Saldo</Text>
              <Text style={styles.headerSaldoValue}>
                {saldo} {saldo === 1 ? 'credito' : 'creditos'}
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>

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
