import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { T } from '../../theme';

/**
 * Encabezado compartido de las pantallas internas.
 *
 * Antes cada pantalla armaba el suyo y el resultado era que la misma accion
 * "Volver" aparecia de tres formas distintas: icono mas texto en Mis pedidos,
 * texto pelado en Solicitudes y una flecha escrita a mano ("<- Volver") en
 * Detalle de pedido. Aqui vive una sola vez.
 *
 * Dos variantes, porque las dos ya existian en la app y ninguna sobra:
 *  - "bar": barra fija con borde inferior, titulo centrado y accion opcional a
 *    la derecha. Para pantallas que son un listado.
 *  - "inline": el enlace de volver arriba y debajo el bloque de titulo. Para
 *    pantallas que hacen scroll sobre un formulario o un detalle.
 *
 * Sin `title` solo se dibuja el enlace de volver, que es lo que necesitan las
 * pantallas cuyo encabezado propio es una tarjeta compuesta.
 */
export default function ScreenHeader({
  title = null,
  subtitle = null,
  onBack = null,
  backLabel = 'Volver',
  right = null,
  variant = 'bar',
  style,
}) {
  const inline = variant === 'inline';

  const back = onBack ? (
    <TouchableOpacity
      onPress={onBack}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      style={[styles.back, !inline && styles.backFixed]}
      accessibilityRole="button"
      accessibilityLabel={backLabel}
    >
      <Feather name="arrow-left" size={16} color={T.blue} />
      <Text style={styles.backText}>{backLabel}</Text>
    </TouchableOpacity>
  ) : null;

  if (inline) {
    return (
      <View style={[styles.inlineWrap, style]}>
        {back}
        {title ? (
          <View style={styles.inlineRow}>
            <View style={styles.inlineCopy}>
              <Text style={styles.inlineTitle}>{title}</Text>
              {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
            </View>
            {right}
          </View>
        ) : null}
      </View>
    );
  }

  // El hueco de la derecha mantiene el titulo centrado cuando no hay accion.
  // Sin el, el titulo se corre hacia la derecha por el ancho del boton volver.
  return (
    <View style={[styles.bar, style]}>
      {back ?? <View style={styles.backFixed} />}

      <View style={styles.barCopy}>
        {title ? <Text style={styles.barTitle} numberOfLines={1}>{title}</Text> : null}
        {subtitle ? <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text> : null}
      </View>

      {right ?? <View style={styles.backFixed} />}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: T.s3,
    paddingHorizontal: T.s4,
    paddingVertical: 14,
    backgroundColor: T.paper,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
    ...T.sh1,
  },
  barCopy: { flex: 1, alignItems: 'center', minWidth: 0 },
  barTitle: { fontSize: 17, fontWeight: '800', color: T.ink },

  inlineWrap: { gap: T.s3 },
  inlineRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: T.s3,
    flexWrap: 'wrap',
  },
  inlineCopy: { flex: 1, minWidth: 0, gap: 4 },
  inlineTitle: { fontSize: 22, fontWeight: '800', color: T.ink, letterSpacing: -0.3 },

  subtitle: { fontSize: 13, color: T.muted, lineHeight: 18 },

  back: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  backFixed: { width: 70 },
  backText: { color: T.blue, fontWeight: '600', fontSize: 14 },
});
