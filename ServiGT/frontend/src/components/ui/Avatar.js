import { Image, StyleSheet, Text, View } from 'react-native';
import { T } from '../../theme';

/**
 * Foto de perfil si existe `uri`, si no un circulo con la inicial del nombre.
 */
export default function Avatar({ uri, name, size = 40, online }) {
  const initial = (name || '?').trim().charAt(0).toUpperCase();
  const dim = { width: size, height: size, borderRadius: size / 2 };

  return (
    <View style={{ width: size, height: size }}>
      {uri ? (
        <Image source={{ uri }} style={[styles.image, dim]} />
      ) : (
        <View style={[styles.fallback, dim]}>
          <Text style={[styles.initial, { fontSize: size * 0.42 }]}>{initial}</Text>
        </View>
      )}
      {online ? (
        <View
          style={[
            styles.onlineDot,
            { width: size * 0.28, height: size * 0.28, borderRadius: size * 0.14 },
          ]}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  image: { backgroundColor: T.soft },
  fallback: {
    backgroundColor: T.blue,
    justifyContent: 'center',
    alignItems: 'center',
  },
  initial: { color: T.white, fontWeight: '700' },
  onlineDot: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    backgroundColor: T.success,
    borderWidth: 2,
    borderColor: T.white,
  },
});
