import { Feather } from '@expo/vector-icons';
import { View } from 'react-native';
import { T } from '../../theme';

/**
 * Fila de 5 estrellas, redondeando `value` al entero mas cercano.
 */
export default function Stars({ value = 0, size = 14, color = T.amber, offColor = '#dcd9d2' }) {
  const full = Math.round(value);

  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {[0, 1, 2, 3, 4].map((i) => (
        <Feather key={i} name="star" size={size} color={i < full ? color : offColor} />
      ))}
    </View>
  );
}
