import { Image, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { T } from '../../theme';

const BRAND = ['#1b5499', '#2d6cb8', '#4589d4'];

/**
 * Mezcla un hex hacia el blanco. Sirve para sacar el segundo tono del
 * degradado a partir del unico color que elige el proveedor, sin pedirle dos.
 */
function aclarar(hex, cantidad = 0.35) {
  const limpio = String(hex || '').replace('#', '');
  if (limpio.length !== 6) return null;

  const canal = (i) => {
    const base = parseInt(limpio.slice(i, i + 2), 16);
    if (Number.isNaN(base)) return null;
    return Math.round(base + (255 - base) * cantidad);
  };

  const [r, g, b] = [canal(0), canal(2), canal(4)];
  if (r === null || g === null || b === null) return null;

  return `rgb(${r}, ${g}, ${b})`;
}

/**
 * Portada del perfil publico del proveedor.
 *
 * Tres estados, en orden de prioridad:
 *  1. Imagen de portada subida por el proveedor.
 *  2. Degradado derivado de su color de acento.
 *  3. Degradado de marca de ServiGT.
 *
 * Asi un perfil que no personalizo nada se sigue viendo terminado, que es la
 * razon por la que ninguno de los dos campos es obligatorio.
 */
export default function ProfileCover({
  portadaUri = null,
  colorAcento = null,
  height = 120,
  radius = 14,
  style,
  children,
}) {
  const forma = [{ height, borderTopLeftRadius: radius, borderTopRightRadius: radius }, style];

  if (portadaUri) {
    return (
      <View style={[styles.wrap, forma]}>
        <Image source={{ uri: portadaUri }} style={styles.image} resizeMode="cover" />
        {children}
      </View>
    );
  }

  const claro = colorAcento ? aclarar(colorAcento) : null;
  const colores = colorAcento && claro ? [colorAcento, claro] : BRAND;

  return (
    <LinearGradient
      colors={colores}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.wrap, forma]}
    >
      {children}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%', overflow: 'hidden', backgroundColor: T.tint },
  image: { width: '100%', height: '100%' },
});
