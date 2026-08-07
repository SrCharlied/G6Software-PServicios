import { StyleSheet, Text, View } from 'react-native';
import { T } from '../../theme';

// Paleta por variante semantica. Las pantallas mapean su propio estado de
// dominio (urgencia, estado de pedido, etc.) a una de estas variantes en vez
// de traer su propio bg/text/border como antes.
const VARIANTS = {
  neutral: { bg: '#ecebe7', text: '#4a5262', border: '#dcd9d2', dot: T.faint },
  info:    { bg: T.tint, text: T.deep, border: T.soft, dot: T.blue },
  success: { bg: '#e3f5e9', text: '#14683a', border: '#a7dcbb', dot: T.success },
  warn:    { bg: '#fdf2e3', text: '#8a4708', border: '#f2c879', dot: T.amber },
  danger:  { bg: '#fbe9ed', text: '#9f1239', border: '#f0c3ce', dot: T.danger },
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
  label: { fontWeight: '700', letterSpacing: 0 },
});
