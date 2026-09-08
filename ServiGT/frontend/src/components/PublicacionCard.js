import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { storageUrl } from '../services/api';
import { Button, StatusChip } from './ui';
import { T } from '../theme';

const ESTADO_VARIANT = { activa: 'success', inactiva: 'neutral' };
const ESTADO_LABEL = { activa: 'Activa', inactiva: 'Inactiva' };

/**
 * Tarjeta presentacional de una publicacion de servicio.
 *
 * No hace fetch ni decide cupos/limites: solo pinta lo que recibe por props.
 * La usan tanto el catalogo publico (modo "catalogo", con boton "Cotizar")
 * como la gestion del proveedor (modo "catalogo" + `footer` con las acciones
 * de activar/desactivar/editar, definidas por quien la consume).
 */
export default function PublicacionCard({
  publicacion,
  mode = 'catalogo',
  actionLabel = 'Cotizar',
  onPress,
  onCotizar,
  footer,
  style,
}) {
  if (!publicacion) return null;

  const {
    titulo,
    descripcion,
    precio_referencial: precio,
    imagen,
    estado,
    categoria,
    proveedor,
  } = publicacion;

  const imageUri = storageUrl(imagen);
  const precioLabel = precio !== null && precio !== undefined
    ? `Q${Number(precio).toFixed(2)}`
    : 'Precio a cotizar';

  const Wrapper = onPress ? TouchableOpacity : View;
  const wrapperProps = onPress ? { onPress, activeOpacity: 0.86, accessibilityRole: 'button' } : {};

  return (
    <Wrapper {...wrapperProps} style={[s.card, style]}>
      {imageUri ? (
        <Image
          source={{ uri: imageUri }}
          style={s.image}
          resizeMode="cover"
          testID="publicacion-imagen"
        />
      ) : (
        <View style={[s.image, s.imagePlaceholder]} testID="publicacion-imagen-placeholder">
          <Text style={s.imagePlaceholderText}>Sin imagen</Text>
        </View>
      )}

      <View style={s.body}>
        <View style={s.topRow}>
          {categoria?.nombre ? (
            <Text style={s.catText} numberOfLines={1}>{categoria.nombre}</Text>
          ) : <View />}
          {estado ? (
            <StatusChip
              variant={ESTADO_VARIANT[estado] ?? 'neutral'}
              label={ESTADO_LABEL[estado] ?? estado}
              size="sm"
            />
          ) : null}
        </View>

        <Text style={s.title} numberOfLines={2}>{titulo}</Text>
        {descripcion ? (
          <Text style={s.desc} numberOfLines={3}>{descripcion}</Text>
        ) : null}

        <View style={s.footRow}>
          <Text style={s.precio}>{precioLabel}</Text>
          {proveedor?.nombre ? (
            <Text style={s.provText} numberOfLines={1}>{proveedor.nombre}</Text>
          ) : null}
        </View>

        {mode === 'cotizar' ? (
          <Button kind="primary" size="sm" onPress={onCotizar} style={s.cotizarBtn}>
            {actionLabel}
          </Button>
        ) : null}

        {footer}
      </View>
    </Wrapper>
  );
}

const s = StyleSheet.create({
  card: {
    width: '100%',
    backgroundColor: T.white,
    borderRadius: T.rLg,
    borderWidth: 1,
    borderColor: T.border,
    overflow: 'hidden',
    ...T.sh1,
  },
  image: { width: '100%', height: 140, backgroundColor: T.inputBg },
  imagePlaceholder: { alignItems: 'center', justifyContent: 'center' },
  imagePlaceholderText: { fontSize: 13, color: T.faint, fontWeight: '600' },

  body: { padding: T.s4 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 8 },
  catText: { flex: 1, fontSize: 12, color: T.blue, fontWeight: '700' },

  title: { fontSize: 15, fontWeight: '700', color: T.ink, marginBottom: 6, letterSpacing: -0.2 },
  desc: { fontSize: 13, color: T.text, lineHeight: 19, opacity: 0.85, marginBottom: 10 },

  footRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  precio: { fontSize: 14, fontWeight: '800', color: T.deep },
  provText: { flex: 1, fontSize: 12, color: T.muted, textAlign: 'right' },

  cotizarBtn: { marginTop: 12 },
});
