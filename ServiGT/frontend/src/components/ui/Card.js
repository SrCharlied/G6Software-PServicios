import { StyleSheet, View } from 'react-native';
import { T } from '../../theme';

export default function Card({ children, style, padding = T.s4 }) {
  return <View style={[styles.card, { padding }, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    ...T.card,
    ...T.sh1,
  },
});
