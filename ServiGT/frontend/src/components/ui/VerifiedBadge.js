import { Feather } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { T } from '../../theme';

/**
 * Distintivo de documentacion verificada. Azul con check, para que nunca se
 * confunda con el ambar de PremiumBadge: la verificacion no se compra.
 */
export default function VerifiedBadge({ verificado = true, size = 'md', mostrarInactivo = false, style }) {
  if (!verificado && !mostrarInactivo) return null;

  const sm = size === 'sm';
  const v = verificado
    ? { bg: '#eff6ff', border: '#bfdbfe', text: '#1d4ed8', icon: 'check-circle', label: 'Verificado' }
    : { bg: T.paper, border: T.border, text: T.muted, icon: 'alert-circle', label: 'Sin verificar' };

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
      accessibilityLabel={v.label}
    >
      <Feather name={v.icon} size={sm ? 11 : 13} color={v.text} />
      <Text style={[styles.label, { color: v.text, fontSize: sm ? 10 : 12 }]} numberOfLines={1}>
        {v.label}
      </Text>
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
  label: { fontWeight: '700', letterSpacing: 0.2 },
});
