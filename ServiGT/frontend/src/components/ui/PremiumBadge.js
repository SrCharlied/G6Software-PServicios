import { Feather } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { T } from '../../theme';

/**
 * Distintivo del plan Premium. Es deliberadamente distinto de VerifiedBadge:
 * la verificacion es azul con un check (confianza documental) y Premium es
 * ambar con una corona (plan de pago). Mezclarlos haria creer que pagar
 * equivale a estar verificado.
 *
 * Estados soportados: `activo`, `vencido` y `nunca`. Por defecto solo se
 * dibuja cuando esta activo; `mostrarInactivo` lo fuerza en las superficies
 * que si necesitan explicar la ausencia (perfil propio, administracion).
 */
const ESTADO_STYLES = {
  activo:  { bg: '#fffbeb', border: '#fcd34d', text: '#92400e', icon: 'award',    label: 'Premium' },
  vencido: { bg: T.paper,   border: T.border,  text: T.muted,   icon: 'clock',    label: 'Premium vencido' },
  nunca:   { bg: T.paper,   border: T.border,  text: T.faint,   icon: 'award',    label: 'Sin Premium' },
};

export default function PremiumBadge({
  estado = 'activo',
  size = 'md',
  diasRestantes,
  mostrarInactivo = false,
  style,
}) {
  const v = ESTADO_STYLES[estado] ?? ESTADO_STYLES.nunca;

  if (estado !== 'activo' && !mostrarInactivo) return null;

  const sm = size === 'sm';
  const mostrarDias = estado === 'activo' && Number.isFinite(diasRestantes);

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: v.bg,
          borderColor: v.border,
          paddingHorizontal: sm ? 8 : 10,
          paddingVertical: sm ? 3 : 5,
        },
        style,
      ]}
      accessibilityLabel={`Estado Premium: ${v.label}`}
    >
      <Feather name={v.icon} size={sm ? 11 : 13} color={v.text} />
      <Text style={[styles.label, { color: v.text, fontSize: sm ? 10 : 12 }]} numberOfLines={1}>
        {v.label}
      </Text>
      {mostrarDias ? (
        <Text style={[styles.dias, { color: v.text, fontSize: sm ? 10 : 11 }]}>
          · {diasRestantes} d
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 999,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  label: { fontWeight: '800', letterSpacing: 0.2 },
  dias:  { fontWeight: '600' },
});
