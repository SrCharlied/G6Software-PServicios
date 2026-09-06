import { ActivityIndicator, StyleSheet, Text, View, Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { T } from '../../theme';

/**
 * Estados de una lista de publicaciones: cargando, vacia, error y limite
 * alcanzado (task 6.1).
 *
 * Viven aparte de `PublicacionCard` porque los comparten la gestion del
 * proveedor (task 5.5) y el perfil publico (task 5.6), y porque separarlos deja
 * la tarjeta como un componente puro que solo dibuja una publicacion.
 *
 * Ninguno decide nada: reciben el mensaje ya resuelto por la pantalla, que a su
 * vez lo recibe del backend.
 */

export function PublicacionesCargando({ mensaje = 'Cargando publicaciones...' }) {
  return (
    <View style={estilos.bloque} accessibilityRole="progressbar" accessibilityLabel={mensaje}>
      <ActivityIndicator color={T.blue} />
      <Text style={estilos.texto}>{mensaje}</Text>
    </View>
  );
}

export function PublicacionesVacias({ mensaje = 'Todavia no hay publicaciones.', accion = null }) {
  return (
    <View style={estilos.bloque}>
      <Feather name="inbox" size={28} color={T.faint} />
      <Text style={estilos.texto}>{mensaje}</Text>
      {accion}
    </View>
  );
}

export function PublicacionesError({ mensaje, onReintentar }) {
  return (
    <View style={[estilos.bloque, estilos.bloqueError]} accessibilityRole="alert">
      <Feather name="alert-triangle" size={26} color={T.danger} />
      <Text style={[estilos.texto, estilos.textoError]}>{mensaje}</Text>

      {onReintentar ? (
        <Pressable onPress={onReintentar} style={estilos.boton} accessibilityRole="button">
          <Text style={estilos.botonTexto}>Reintentar</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/**
 * Aviso de cupo agotado. El texto y los numeros vienen del backend
 * (`cupos.limite` / `cupos.activas` de `/publicaciones/mias`), no se calculan
 * aqui: la UI no puede ser la que decida cuantas publicaciones caben.
 */
export function PublicacionesLimiteAlcanzado({ cupos, onVerPremium }) {
  if (!cupos) return null;

  const esPremium = cupos.premium_estado === 'activo';

  return (
    <View style={estilos.aviso} accessibilityRole="alert">
      <Feather name="lock" size={18} color={T.warn} />
      <View style={estilos.avisoTexto}>
        <Text style={estilos.avisoTitulo}>
          Usaste {cupos.activas} de {cupos.limite} publicaciones activas.
        </Text>

        <Text style={estilos.avisoDetalle}>
          {esPremium
            ? 'Desactiva una para poder publicar otra.'
            : `Con Premium puedes tener hasta ${cupos.limite_premium} publicaciones activas.`}
        </Text>
      </View>

      {!esPremium && onVerPremium ? (
        <Pressable onPress={onVerPremium} style={estilos.boton} accessibilityRole="button">
          <Text style={estilos.botonTexto}>Ver Premium</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  bloque: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: T.s2,
    paddingVertical: T.s6,
    paddingHorizontal: T.s4,
    backgroundColor: T.paper,
    borderRadius: T.rLg,
    borderWidth: 1,
    borderColor: T.border,
  },
  bloqueError: { borderColor: 'rgba(190,18,60,0.25)' },
  texto: { fontSize: 14, color: T.muted, textAlign: 'center' },
  textoError: { color: T.danger },
  aviso: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: T.s3,
    padding: T.s4,
    borderRadius: T.rMd,
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: 'rgba(180,83,9,0.25)',
    flexWrap: 'wrap',
  },
  avisoTexto: { flex: 1, minWidth: 180, gap: 2 },
  avisoTitulo: { fontSize: 14, fontWeight: '700', color: T.warn },
  avisoDetalle: { fontSize: 13, color: T.muted },
  boton: {
    backgroundColor: T.blue,
    paddingHorizontal: T.s4,
    paddingVertical: T.s2,
    borderRadius: T.rSm,
  },
  botonTexto: { color: T.white, fontWeight: '700', fontSize: 13 },
});
