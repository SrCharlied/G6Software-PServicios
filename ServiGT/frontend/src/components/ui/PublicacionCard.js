import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { T } from '../../theme';

/**
 * Tarjeta de publicacion de servicio ofrecido (task 6.1).
 *
 * Es deliberadamente presentacional: no llama al API, no decide cupos y no
 * conoce el estado Premium del proveedor. Recibe una publicacion ya serializada
 * por el backend y dibuja lo que traiga.
 *
 * Por que importa: la regla de "1 gratis / 3 Premium" vive en el backend bajo
 * transaccion (task 5.3). Si esta tarjeta la reimplementara para decidir que
 * pintar, habria dos fuentes de verdad y la del navegador seria editable.
 *
 * Props:
 *  - publicacion: { id, titulo, descripcion, precio_referencial, imagen, estado }
 *  - modo: 'publico' (perfil publico) | 'gestion' (listado del proveedor)
 *  - onPress / onAccion: callbacks opcionales; sin ellos la tarjeta es estatica
 *  - accionLabel: texto del boton principal ('Solicitar servicio', 'Cotizar'...)
 *  - deshabilitada: apaga el boton sin ocultarlo (limite alcanzado, envio en curso)
 */
export default function PublicacionCard({
  publicacion,
  modo = 'publico',
  onPress,
  onAccion,
  accionLabel,
  deshabilitada = false,
  resolverImagen = (ruta) => ruta,
  children,
}) {
  if (!publicacion) return null;

  const {
    titulo,
    descripcion,
    precio_referencial: precio,
    imagen,
    estado,
  } = publicacion;

  // `precio_referencial` nulo significa "a cotizar", no "gratis". Se distingue
  // explicitamente porque un `0` si es un precio valido.
  const tienePrecio = precio !== null && precio !== undefined && precio !== '';
  const uriImagen = imagen ? resolverImagen(imagen) : null;

  const Contenedor = onPress ? Pressable : View;

  return (
    <Contenedor
      style={({ pressed } = {}) => [estilos.tarjeta, pressed && estilos.tarjetaPresionada]}
      onPress={onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={onPress ? `Ver publicacion ${titulo}` : undefined}
    >
      {uriImagen ? (
        <Image source={{ uri: uriImagen }} style={estilos.imagen} resizeMode="cover" />
      ) : (
        // Sin imagen no se deja un hueco: el placeholder mantiene la altura de
        // la fila para que una lista mixta no quede escalonada.
        <View style={[estilos.imagen, estilos.imagenVacia]}>
          <Feather name="tool" size={28} color={T.soft} />
        </View>
      )}

      <View style={estilos.cuerpo}>
        <View style={estilos.filaTitulo}>
          <Text style={estilos.titulo} numberOfLines={2}>{titulo}</Text>

          {modo === 'gestion' && estado ? (
            <View style={[estilos.chip, estado === 'activa' ? estilos.chipActiva : estilos.chipInactiva]}>
              <Text style={[estilos.chipTexto, estado === 'activa' ? estilos.chipTextoActiva : estilos.chipTextoInactiva]}>
                {estado === 'activa' ? 'Activa' : 'Inactiva'}
              </Text>
            </View>
          ) : null}
        </View>

        <Text style={estilos.descripcion} numberOfLines={3}>{descripcion}</Text>

        <View style={estilos.filaPie}>
          {tienePrecio ? (
            <Text style={estilos.precio}>
              Q{Number(precio).toFixed(2)}
              <Text style={estilos.precioNota}> referencial</Text>
            </Text>
          ) : (
            <Text style={estilos.precioNota}>Precio a cotizar</Text>
          )}

          {onAccion && accionLabel ? (
            <Pressable
              onPress={onAccion}
              disabled={deshabilitada}
              accessibilityRole="button"
              accessibilityState={{ disabled: deshabilitada }}
              style={[estilos.boton, deshabilitada && estilos.botonApagado]}
            >
              <Text style={[estilos.botonTexto, deshabilitada && estilos.botonTextoApagado]}>
                {accionLabel}
              </Text>
            </Pressable>
          ) : null}
        </View>

        {children}
      </View>
    </Contenedor>
  );
}

const estilos = StyleSheet.create({
  tarjeta: {
    backgroundColor: T.paper,
    borderRadius: T.rLg,
    borderWidth: 1,
    borderColor: T.border,
    overflow: 'hidden',
    // `flexBasis` con `minWidth` deja que la lista se acomode sola: tres por
    // fila en 1440, dos en 1024 y una en 390 sin media queries.
    flexGrow: 1,
    flexBasis: 280,
    minWidth: 260,
    maxWidth: 460,
    ...T.sh1,
  },
  tarjetaPresionada: { opacity: 0.85 },
  imagen: {
    width: '100%',
    height: 150,
    backgroundColor: T.tint,
  },
  imagenVacia: { alignItems: 'center', justifyContent: 'center' },
  cuerpo: { padding: T.s4, gap: T.s2 },
  filaTitulo: { flexDirection: 'row', alignItems: 'flex-start', gap: T.s2 },
  titulo: { flex: 1, fontSize: 16, fontWeight: '700', color: T.ink },
  descripcion: { fontSize: 14, color: T.muted, lineHeight: 20 },
  filaPie: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: T.s2,
    marginTop: T.s1,
  },
  precio: { fontSize: 16, fontWeight: '700', color: T.deep },
  precioNota: { fontSize: 12, fontWeight: '500', color: T.faint },
  chip: { paddingHorizontal: T.s2, paddingVertical: 2, borderRadius: T.rSm },
  chipActiva: { backgroundColor: '#dcfce7' },
  chipInactiva: { backgroundColor: '#f1f1ef' },
  chipTexto: { fontSize: 11, fontWeight: '700' },
  chipTextoActiva: { color: T.success },
  chipTextoInactiva: { color: T.muted },
  boton: {
    backgroundColor: T.blue,
    paddingHorizontal: T.s4,
    paddingVertical: T.s2,
    borderRadius: T.rSm,
  },
  botonApagado: { backgroundColor: T.soft },
  botonTexto: { color: T.white, fontWeight: '700', fontSize: 13 },
  botonTextoApagado: { color: T.white, opacity: 0.85 },
});
