import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import {
  actualizarPublicacion,
  activarPublicacion,
  crearPublicacion,
  desactivarPublicacion,
  eliminarPublicacion,
  getCategorias,
  getMisPublicaciones,
  storageUrl,
} from '../services/api';
import PublicacionCard from '../components/ui/PublicacionCard';
import {
  PublicacionesCargando,
  PublicacionesError,
  PublicacionesLimiteAlcanzado,
  PublicacionesVacias,
} from '../components/ui/PublicacionEstados';
import { T } from '../theme';

/**
 * Gestion de publicaciones del proveedor (task 5.5).
 *
 * QUE NO HACE ESTA PANTALLA
 * -------------------------
 * No decide cuantas publicaciones caben. El contador sale de `cupos`, que
 * calcula el backend en `/publicaciones/mias`, y el boton de crear se apaga
 * segun `cupos.disponibles`. Apagar el boton es comodidad para el usuario, no
 * un control: si alguien lo fuerza, el backend responde 422 bajo transaccion
 * (task 5.3) y ese error se muestra tal cual.
 *
 * Tampoco valida el archivo mas alla de dejarlo elegir: mime, extension y
 * tamano los valida el backend.
 */
export default function MisPublicacionesScreen({ navigation }) {
  const [publicaciones, setPublicaciones] = useState([]);
  const [cupos, setCupos] = useState(null);
  const [categorias, setCategorias] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  const [formAbierto, setFormAbierto] = useState(false);
  const [editando, setEditando] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [errorForm, setErrorForm] = useState(null);
  const [accionEnCurso, setAccionEnCurso] = useState(null);

  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [precio, setPrecio] = useState('');
  const [categoriaId, setCategoriaId] = useState('');
  const [imagen, setImagen] = useState(null);
  const inputArchivo = useRef(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);

    try {
      const data = await getMisPublicaciones();
      setPublicaciones(data.publicaciones ?? []);
      setCupos(data.cupos ?? null);
    } catch (e) {
      // No se sustituye por una lista vacia: "fallo la carga" y "no tienes
      // publicaciones" son estados distintos y el usuario debe poder
      // distinguirlos.
      setError(e.message);
      setPublicaciones([]);
      setCupos(null);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  useEffect(() => {
    getCategorias()
      .then((data) => setCategorias(data.categorias ?? []))
      .catch(() => setCategorias([]));
  }, []);

  const limpiarFormulario = () => {
    setTitulo('');
    setDescripcion('');
    setPrecio('');
    setCategoriaId('');
    setImagen(null);
    setEditando(null);
    setErrorForm(null);
  };

  const abrirCreacion = () => {
    limpiarFormulario();
    setFormAbierto(true);
  };

  const abrirEdicion = (publicacion) => {
    setEditando(publicacion);
    setTitulo(publicacion.titulo ?? '');
    setDescripcion(publicacion.descripcion ?? '');
    setPrecio(publicacion.precio_referencial != null ? String(publicacion.precio_referencial) : '');
    setCategoriaId(publicacion.categoria?.id != null ? String(publicacion.categoria.id) : '');
    setImagen(null);
    setErrorForm(null);
    setFormAbierto(true);
  };

  const enviar = async () => {
    setEnviando(true);
    setErrorForm(null);

    const datos = {
      titulo: titulo.trim(),
      descripcion: descripcion.trim(),
      categoriaId: categoriaId || null,
      precioReferencial: precio.trim() === '' ? null : precio.trim(),
      imagen,
    };

    try {
      if (editando) {
        await actualizarPublicacion(editando.id, datos);
      } else {
        await crearPublicacion(datos);
      }

      setFormAbierto(false);
      limpiarFormulario();
      await cargar();
    } catch (e) {
      // El 422 del limite llega con el texto que escribio el backend; se
      // muestra literal para no inventar una segunda version de la regla.
      setErrorForm(e.message);
    } finally {
      setEnviando(false);
    }
  };

  const ejecutarAccion = async (id, accion) => {
    setAccionEnCurso(id);
    setError(null);

    try {
      await accion(id);
      await cargar();
    } catch (e) {
      setError(e.message);
    } finally {
      setAccionEnCurso(null);
    }
  };

  const sinCupo = cupos ? cupos.disponibles <= 0 : false;

  return (
    <ScrollView contentContainerStyle={estilos.pantalla}>
      <View style={estilos.encabezado}>
        <View style={estilos.encabezadoTexto}>
          <Text style={estilos.titulo}>Mis publicaciones</Text>
          <Text style={estilos.subtitulo}>
            Los servicios que ofreces aparecen en tu perfil publico y en el catalogo.
          </Text>
        </View>

        {cupos ? (
          <View style={estilos.contador} accessibilityLabel={`Publicaciones activas: ${cupos.activas} de ${cupos.limite}`}>
            <Text style={estilos.contadorNumero}>{cupos.activas}/{cupos.limite}</Text>
            <Text style={estilos.contadorEtiqueta}>activas</Text>
          </View>
        ) : null}
      </View>

      {cupos && sinCupo ? (
        <PublicacionesLimiteAlcanzado
          cupos={cupos}
          onVerPremium={() => navigation?.navigate?.('Creditos')}
        />
      ) : null}

      {!formAbierto ? (
        <Pressable
          onPress={abrirCreacion}
          disabled={sinCupo}
          accessibilityRole="button"
          accessibilityState={{ disabled: sinCupo }}
          style={[estilos.botonPrimario, sinCupo && estilos.botonApagado]}
        >
          <Feather name="plus" size={16} color={T.white} />
          <Text style={estilos.botonPrimarioTexto}>Nueva publicacion</Text>
        </Pressable>
      ) : null}

      {formAbierto ? (
        <View style={estilos.formulario}>
          <Text style={estilos.formularioTitulo}>
            {editando ? 'Editar publicacion' : 'Nueva publicacion'}
          </Text>

          <Text style={estilos.etiqueta}>Titulo</Text>
          <TextInput
            style={estilos.input}
            value={titulo}
            onChangeText={setTitulo}
            placeholder="Ej. Instalacion de tuberia PVC"
            placeholderTextColor={T.faint}
            accessibilityLabel="Titulo de la publicacion"
          />

          <Text style={estilos.etiqueta}>Descripcion</Text>
          <TextInput
            style={[estilos.input, estilos.inputMultilinea]}
            value={descripcion}
            onChangeText={setDescripcion}
            multiline
            numberOfLines={4}
            placeholder="Que incluye, que no incluye, tiempos estimados..."
            placeholderTextColor={T.faint}
            accessibilityLabel="Descripcion de la publicacion"
          />

          <Text style={estilos.etiqueta}>Precio referencial (opcional)</Text>
          <TextInput
            style={estilos.input}
            value={precio}
            onChangeText={setPrecio}
            keyboardType="numeric"
            placeholder="Dejalo vacio para cotizar cada caso"
            placeholderTextColor={T.faint}
            accessibilityLabel="Precio referencial"
          />

          <Text style={estilos.etiqueta}>Categoria</Text>
          <View style={estilos.categorias}>
            {categorias.map((categoria) => {
              const activa = String(categoria.id) === String(categoriaId);
              return (
                <Pressable
                  key={categoria.id}
                  onPress={() => setCategoriaId(activa ? '' : String(categoria.id))}
                  style={[estilos.chipCategoria, activa && estilos.chipCategoriaActiva]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: activa }}
                >
                  <Text style={[estilos.chipCategoriaTexto, activa && estilos.chipCategoriaTextoActivo]}>
                    {categoria.nombre}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {Platform.OS === 'web' ? (
            <>
              <input
                ref={inputArchivo}
                type="file"
                accept=".jpg,.jpeg,.png,.webp"
                style={{ display: 'none' }}
                onChange={(evento) => setImagen(evento.target?.files?.[0] ?? null)}
              />
              <Pressable
                onPress={() => inputArchivo.current?.click()}
                style={estilos.botonSecundario}
                accessibilityRole="button"
              >
                <Feather name="image" size={16} color={T.deep} />
                <Text style={estilos.botonSecundarioTexto}>
                  {imagen ? imagen.name : 'Elegir imagen (opcional)'}
                </Text>
              </Pressable>
            </>
          ) : (
            <Text style={estilos.nota}>
              La carga de imagenes esta disponible en la version web.
            </Text>
          )}

          {errorForm ? (
            <Text style={estilos.errorForm} accessibilityRole="alert">{errorForm}</Text>
          ) : null}

          <View style={estilos.filaBotones}>
            <Pressable
              onPress={enviar}
              disabled={enviando}
              style={[estilos.botonPrimario, enviando && estilos.botonApagado]}
              accessibilityRole="button"
            >
              {enviando
                ? <ActivityIndicator color={T.white} />
                : <Text style={estilos.botonPrimarioTexto}>{editando ? 'Guardar cambios' : 'Publicar'}</Text>}
            </Pressable>

            <Pressable
              onPress={() => { setFormAbierto(false); limpiarFormulario(); }}
              style={estilos.botonTexto}
              accessibilityRole="button"
            >
              <Text style={estilos.botonTextoTexto}>Cancelar</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      {cargando ? (
        <PublicacionesCargando />
      ) : error ? (
        <PublicacionesError mensaje={error} onReintentar={cargar} />
      ) : publicaciones.length === 0 ? (
        <PublicacionesVacias mensaje="Todavia no publicaste ningun servicio." />
      ) : (
        <View style={estilos.lista}>
          {publicaciones.map((publicacion) => (
            <PublicacionCard
              key={publicacion.id}
              publicacion={publicacion}
              modo="gestion"
              resolverImagen={storageUrl}
            >
              <View style={estilos.acciones}>
                <Pressable
                  onPress={() => abrirEdicion(publicacion)}
                  style={estilos.accion}
                  accessibilityRole="button"
                >
                  <Feather name="edit-2" size={14} color={T.deep} />
                  <Text style={estilos.accionTexto}>Editar</Text>
                </Pressable>

                <Pressable
                  onPress={() => ejecutarAccion(
                    publicacion.id,
                    publicacion.estado === 'activa' ? desactivarPublicacion : activarPublicacion,
                  )}
                  disabled={accionEnCurso === publicacion.id}
                  style={estilos.accion}
                  accessibilityRole="button"
                >
                  <Feather
                    name={publicacion.estado === 'activa' ? 'eye-off' : 'eye'}
                    size={14}
                    color={T.deep}
                  />
                  <Text style={estilos.accionTexto}>
                    {publicacion.estado === 'activa' ? 'Desactivar' : 'Activar'}
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => ejecutarAccion(publicacion.id, eliminarPublicacion)}
                  disabled={accionEnCurso === publicacion.id}
                  style={estilos.accion}
                  accessibilityRole="button"
                >
                  <Feather name="trash-2" size={14} color={T.danger} />
                  <Text style={[estilos.accionTexto, estilos.accionPeligro]}>Eliminar</Text>
                </Pressable>
              </View>
            </PublicacionCard>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  pantalla: { padding: T.s5, gap: T.s4, maxWidth: 1180, width: '100%', alignSelf: 'center' },
  encabezado: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: T.s4,
    flexWrap: 'wrap',
  },
  encabezadoTexto: { flex: 1, minWidth: 220, gap: 2 },
  titulo: { fontSize: 22, fontWeight: '800', color: T.ink },
  subtitulo: { fontSize: 14, color: T.muted },
  contador: {
    alignItems: 'center',
    paddingHorizontal: T.s4,
    paddingVertical: T.s2,
    backgroundColor: T.tint,
    borderRadius: T.rMd,
  },
  contadorNumero: { fontSize: 20, fontWeight: '800', color: T.deep },
  contadorEtiqueta: { fontSize: 11, color: T.muted, textTransform: 'uppercase', letterSpacing: 0.5 },
  formulario: {
    backgroundColor: T.paper,
    borderRadius: T.rLg,
    borderWidth: 1,
    borderColor: T.border,
    padding: T.s5,
    gap: T.s2,
  },
  formularioTitulo: { fontSize: 17, fontWeight: '700', color: T.ink, marginBottom: T.s2 },
  etiqueta: { fontSize: 13, fontWeight: '600', color: T.muted, marginTop: T.s2 },
  input: {
    backgroundColor: T.inputBg,
    borderWidth: 1,
    borderColor: T.inputBorder,
    borderRadius: T.rSm,
    paddingHorizontal: T.s3,
    paddingVertical: T.s3,
    fontSize: 14,
    color: T.text,
  },
  inputMultilinea: { minHeight: 96, textAlignVertical: 'top' },
  categorias: { flexDirection: 'row', flexWrap: 'wrap', gap: T.s2 },
  chipCategoria: {
    paddingHorizontal: T.s3,
    paddingVertical: T.s2,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: T.inputBorder,
    backgroundColor: T.white,
  },
  chipCategoriaActiva: { backgroundColor: T.deep, borderColor: T.deep },
  chipCategoriaTexto: { fontSize: 13, color: T.muted },
  chipCategoriaTextoActivo: { color: T.white, fontWeight: '700' },
  nota: { fontSize: 13, color: T.faint, marginTop: T.s2 },
  errorForm: { fontSize: 13, color: T.danger, marginTop: T.s2 },
  filaBotones: { flexDirection: 'row', alignItems: 'center', gap: T.s3, marginTop: T.s3 },
  botonPrimario: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: T.s2,
    backgroundColor: T.blue,
    paddingHorizontal: T.s5,
    paddingVertical: T.s3,
    borderRadius: T.rSm,
    alignSelf: 'flex-start',
  },
  botonApagado: { backgroundColor: T.soft },
  botonPrimarioTexto: { color: T.white, fontWeight: '700', fontSize: 14 },
  botonSecundario: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: T.s2,
    borderWidth: 1,
    borderColor: T.inputBorder,
    borderRadius: T.rSm,
    paddingHorizontal: T.s4,
    paddingVertical: T.s3,
    alignSelf: 'flex-start',
    marginTop: T.s3,
  },
  botonSecundarioTexto: { color: T.deep, fontWeight: '600', fontSize: 13 },
  botonTexto: { paddingHorizontal: T.s3, paddingVertical: T.s3 },
  botonTextoTexto: { color: T.muted, fontWeight: '600', fontSize: 14 },
  lista: { flexDirection: 'row', flexWrap: 'wrap', gap: T.s4 },
  acciones: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: T.s3,
    marginTop: T.s3,
    paddingTop: T.s3,
    borderTopWidth: 1,
    borderTopColor: T.border,
  },
  accion: { flexDirection: 'row', alignItems: 'center', gap: T.s1 },
  accionTexto: { fontSize: 13, fontWeight: '600', color: T.deep },
  accionPeligro: { color: T.danger },
});
