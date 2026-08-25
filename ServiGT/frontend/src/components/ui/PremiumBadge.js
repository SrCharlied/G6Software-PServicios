import { StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { T } from '../../theme';

const STATE_CONFIG = {
  activo: {
    icon: 'star',
    label: 'Premium activo',
    bg: '#fff7dd',
    text: '#8a5a08',
    border: '#f0cd8c',
    detail: 'Beneficios activos',
  },
  vencido: {
    icon: 'clock',
    label: 'Premium vencido',
    bg: '#fdf2e3',
    text: '#8a4708',
    border: '#f2c879',
    detail: 'Beneficios inactivos',
  },
  nunca: {
    icon: 'star',
    label: 'Sin Premium',
    bg: '#ecebe7',
    text: '#4a5262',
    border: '#dcd9d2',
    detail: 'Aun no activado',
  },
};

const formatDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('es-GT', { day: '2-digit', month: 'short', year: 'numeric' });
};

const getState = ({ estado, premium, proveedor }) =>
  estado || premium?.estado || proveedor?.premium_estado || 'nunca';

export default function PremiumBadge({
  estado,
  premium,
  proveedor,
  compact = false,
  showDetails = false,
  style,
}) {
  const currentState = getState({ estado, premium, proveedor });
  const config = STATE_CONFIG[currentState] || STATE_CONFIG.nunca;
  const venceAt = premium?.vence_at || proveedor?.premium_vence_at;
  const diasRestantes = premium?.dias_restantes ?? proveedor?.premium_dias_restantes;
  const renovaciones = premium?.renovaciones ?? proveedor?.premium_renovaciones ?? 0;
  const beneficios = currentState === 'activo' ? (premium?.beneficios || []) : [];
  const fechaVence = formatDate(venceAt);

  const vigenciaText = currentState === 'activo'
    ? fechaVence
      ? `Vence el ${fechaVence}${diasRestantes != null ? ` (${diasRestantes} dias)` : ''}`
      : 'Vigencia activa'
    : currentState === 'vencido'
      ? fechaVence
        ? `Vencio el ${fechaVence}`
        : 'Premium vencido'
      : 'Nunca activado';

  const Badge = (
    <View
      style={[
        styles.badge,
        compact && styles.badgeCompact,
        { backgroundColor: config.bg, borderColor: config.border },
      ]}
    >
      <Feather name={config.icon} size={compact ? 12 : 14} color={config.text} />
      <Text style={[styles.badgeText, compact && styles.badgeTextCompact, { color: config.text }]}>
        {config.label}
      </Text>
    </View>
  );

  if (!showDetails) {
    return <View style={style}>{Badge}</View>;
  }

  return (
    <View style={[styles.panel, { borderColor: config.border, backgroundColor: config.bg }, style]}>
      <View style={styles.panelTop}>
        {Badge}
        {renovaciones > 0 ? (
          <Text style={[styles.renewText, { color: config.text }]}>
            {renovaciones} ciclo{renovaciones === 1 ? '' : 's'}
          </Text>
        ) : null}
      </View>
      <Text style={[styles.detail, { color: config.text }]}>{vigenciaText}</Text>
      <Text style={styles.hint}>{config.detail}</Text>
      {beneficios.length > 0 ? (
        <View style={styles.benefits}>
          {beneficios.slice(0, 3).map((beneficio) => (
            <View key={beneficio.clave || beneficio.titulo} style={styles.benefitRow}>
              <Feather name="check-circle" size={13} color={T.success} />
              <Text style={styles.benefitText}>{beneficio.titulo}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  badgeCompact: { paddingHorizontal: 9, paddingVertical: 4 },
  badgeText: { fontSize: 12, fontWeight: '800' },
  badgeTextCompact: { fontSize: 11 },
  panel: {
    borderWidth: 1,
    borderRadius: T.rMd,
    padding: 12,
  },
  panelTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  renewText: { fontSize: 11, fontWeight: '800' },
  detail: { marginTop: 8, fontSize: 13, fontWeight: '700' },
  hint: { marginTop: 3, color: T.muted, fontSize: 12, lineHeight: 17 },
  benefits: { marginTop: 10, gap: 6 },
  benefitRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  benefitText: { color: T.text, fontSize: 12, fontWeight: '600' },
});
