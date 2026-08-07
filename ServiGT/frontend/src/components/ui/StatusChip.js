import { StyleSheet, Text, View } from 'react-native';
import { T } from '../../theme';

// Paleta por variante semantica. Las pantallas mapean su propio estado de
// dominio (urgencia, estado de pedido, etc.) a una de estas variantes en vez
// de traer su propio bg/text/border como antes.
const VARIANTS = {
  neutral: { bg: T.paper, text: T.muted, border: T.border, dot: T.faint },
  info:    { bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe', dot: '#1d4ed8' },
  success: { bg: '#f0fdf4', text: '#15803d', border: '#bbf7d0', dot: T.success },
  warn:    { bg: '#fef3c7', text: '#92400e', border: '#fde68a', dot: T.warn },
  danger:  { bg: '#fff1f2', text: '#be123c', border: '#fecdd3', dot: T.danger },
};

export default function StatusChip({ variant = 'neutral', label, size = 'md', dot = true }) {
  const v = VARIANTS[variant] ?? VARIANTS.neutral;
  const sm = size === 'sm';

  return (
    <View
      style={[
        styles.chip,
        { backgroundColor: v.bg, borderColor: v.border, paddingHorizontal: sm ? 8 : 10, paddingVertical: sm ? 3 : 4 },
      ]}
    >
      {dot ? <View style={[styles.dot, { backgroundColor: v.dot }]} /> : null}
      <Text style={[styles.label, { color: v.text, fontSize: sm ? 10 : 11 }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

export { VARIANTS as STATUS_CHIP_VARIANTS };

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  label: { fontWeight: '700', letterSpacing: 0.2 },
});
