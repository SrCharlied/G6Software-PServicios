import { StyleSheet, View } from 'react-native';
import { T } from '../../theme';

export default function Card({ children, style, padding = T.s4 }) {
  return <View style={[styles.card, { padding }, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: T.paper,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: T.border,
    ...T.sh1,
  },
});
