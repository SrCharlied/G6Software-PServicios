import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import {
  activarPublicacion,
  actualizarPublicacion,
  crearPublicacion,
  desactivarPublicacion,
  eliminarPublicacion,
  getCategorias,
  getMisPublicaciones,
  storageUrl,
} from '../services/api';
import { useToast } from '../context/ToastContext';
import { validateNumeric, validateRequired } from '../utils/validation';
import { T } from '../theme';
import { Button, Card, Input, ScreenHeader } from '../components/ui';
import PublicacionCard from '../components/PublicacionCard';

/**
 * Gestion de publicaciones del proveedor: listado, alta/edicion y
 * activar/desactivar. El cupo (1 gratis / hasta 3 Premium) se lee tal cual
 * lo devuelve GET /publicaciones/mias -> cupos.{activas,limite,disponibles};
 * la pantalla no recalcula esa regla, solo refleja lo que dice la API y deja
 * que el backend siga siendo quien la hace cumplir.
 */
export default function MisPublicacionesScreen({ navigation }) {
  const toast = useToast();
  const { width } = useWindowDimensions();
  const fileInputRef = useRef(null);

  const numColumns = width >= 1200 ? 3 : width >= 760 ? 2 : 1;
  const cardWidth = numColumns === 3 ? '32%' : numColumns === 2 ? '48%' : '100%';

  const [publicaciones, setPublicaciones] = useState([]);
  const [cupos, setCupos] = useState(null);
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [vista, setVista] = useState('lista'); // 'lista' | 'formulario'
  const [editando, setEditando] = useState(null); // publicacion | null

  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [categoriaId, setCategoriaId] = useState('');
  const [precio, setPrecio] = useState('');
  const [imagenFile, setImagenFile] = useState(null);
  const [imagenPreview, setImagenPreview] = useState(null);
  const [showCategorias, setShowCategorias] = useState(false);
  const [errores, setErrores] = useState({});
  const [guardando, setGuardando] = useState(false);

  const [mutandoId, setMutandoId] = useState(null);
  const [eliminarObjetivo, setEliminarObjetivo] = useState(null); // publicacion | null
  const [eliminando, setEliminando] = useState(false);

  useEffect(() => { cargar(); loadCategorias(); }, []);

  const cargar = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getMisPublicaciones();
      setPublicaciones(data.publicaciones || []);
      setCupos(data.cupos || null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadCategorias = async () => {
    try {
      const data = await getCategorias();
      setCategorias(data.categorias || data || []);
    } catch { /* el selector de categoria simplemente queda vacio */ }
  };

  const limiteAlcanzado = !!cupos && cupos.disponibles <= 0;

  const resetForm = () => {
    setTitulo('');
    setDescripcion('');
    setCategoriaId('');
    setPrecio('');
    setImagenFile(null);
    setImagenPreview(null);
    setErrores({});
    setShowCategorias(false);
  };

  const abrirCrear = () => {
    resetForm();
    setEditando(null);
    setVista('formulario');
  };

  const abrirEditar = (pub) => {
    setEditando(pub);
    setTitulo(pub.titulo || '');
    setDescripcion(pub.descripcion || '');
    setCategoriaId(pub.categoria?.id ? String(pub.categoria.id) : '');
    setPrecio(pub.precio_referencial != null ? String(pub.precio_referencial) : '');
    setImagenFile(null);
    setImagenPreview(null);
    setErrores({});
    setShowCategorias(false);
    setVista('formulario');
  };

  const cancelarForm = () => {
    if (guardando) return;
    setVista('lista');
    resetForm();
    setEditando(null);
  };

  const handleImagenSelect = (event) => {
    const file = event.target?.files?.[0];
    if (!file) return;
    setImagenFile(file);
    setImagenPreview(URL.createObjectURL(file));
  };

  const submitForm = async () => {
    const errs = {};
    if (!validateRequired(titulo) || titulo.trim().length < 5) {
      errs.titulo = 'El titulo debe tener al menos 5 caracteres.';
    }
    if (!validateRequired(descripcion) || descripcion.trim().length < 20) {
      errs.descripcion = 'La descripcion debe tener al menos 20 caracteres.';
    }
    if (precio && !validateNumeric(precio)) errs.precio = 'Ingresa un precio valido.';
    if (Object.keys(errs).length) { setErrores(errs); return; }
    setErrores({});

    setGuardando(true);
    try {
      const datos = {
        titulo: titulo.trim(),
        descripcion: descripcion.trim(),
        categoriaId: categoriaId || null,
        precioReferencial: precio || null,
        imagen: imagenFile,
      };
      if (editando) {
        await actualizarPublicacion(editando.id, datos);
        toast('Publicacion actualizada correctamente.', 'success');
      } else {
        await crearPublicacion(datos);
        toast('Publicacion creada correctamente.', 'success');
      }
      setVista('lista');
      resetForm();
      setEditando(null);
      await cargar();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setGuardando(false);
    }
  };

  const toggleEstado = async (pub) => {
    setMutandoId(pub.id);
    try {
      if (pub.estado === 'activa') {
        await desactivarPublicacion(pub.id);
        toast('Publicacion desactivada.', 'info');
      } else {
        await activarPublicacion(pub.id);
        toast('Publicacion activada.', 'success');
      }
      await cargar();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setMutandoId(null);
    }
  };

  const confirmarEliminar = async () => {
    if (!eliminarObjetivo) return;
    setEliminando(true);
    try {
      await eliminarPublicacion(eliminarObjetivo.id);
      toast('Publicacion eliminada.', 'info');
      setEliminarObjetivo(null);
      await cargar();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setEliminando(false);
    }
  };

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={s.centered}>
        <ActivityIndicator size="large" color={T.blue} />
        <Text style={s.loadingText}>Cargando tus publicaciones...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <ScreenHeader
        title="Mis publicaciones"
        subtitle="Publica los servicios que ofreces para que los clientes te encuentren en el catalogo."
        onBack={() => navigation.goBack()}
      />

      {error ? (
        <Card style={s.errorCard}>
          <Text style={s.errorText}>{error}</Text>
          <Button kind="primary" onPress={cargar} style={{ marginTop: 12 }}>Reintentar</Button>
        </Card>
      ) : vista === 'formulario' ? (
        <Card padding={24} style={s.formCard}>
          <Text style={s.formTitle}>{editando ? 'Editar publicacion' : 'Nueva publicacion'}</Text>

          <Text style={s.label}>Titulo *</Text>
          <Input
            placeholder="Ej: Instalacion electrica residencial"
            value={titulo}
            onChangeText={(v) => { setTitulo(v); setErrores((e) => ({ ...e, titulo: null })); }}
            error={errores.titulo}
            style={s.field}
          />

          <Text style={s.label}>Descripcion *</Text>
          <Input
            placeholder="Describe el servicio que ofreces..."
            value={descripcion}
            onChangeText={(v) => { setDescripcion(v); setErrores((e) => ({ ...e, descripcion: null })); }}
            multiline
            numberOfLines={4}
            error={errores.descripcion}
            style={s.field}
          />

          <Text style={s.label}>Categoria</Text>
          <TouchableOpacity style={s.selectBtn} onPress={() => setShowCategorias((v) => !v)}>
            <Text style={categoriaId ? s.selectBtnText : s.selectBtnPlaceholder}>
              {categorias.find((c) => String(c.id) === categoriaId)?.nombre || 'Selecciona una categoria (opcional)'}
            </Text>
            <Text style={s.selectArrow}>{showCategorias ? '^' : 'v'}</Text>
          </TouchableOpacity>
          {showCategorias && (
            <ScrollView style={s.dropdownList} nestedScrollEnabled showsVerticalScrollIndicator>
              {categorias.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  style={s.dropdownOption}
                  onPress={() => { setCategoriaId(String(cat.id)); setShowCategorias(false); }}
                >
                  <Text style={s.dropdownOptionText}>{cat.nombre}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          <Text style={s.label}>Precio referencial (Q)</Text>
          <Input
            placeholder="Ej: 250.00 (opcional)"
            value={precio}
            onChangeText={(v) => { setPrecio(v); setErrores((e) => ({ ...e, precio: null })); }}
            keyboardType="decimal-pad"
            error={errores.precio}
            style={s.field}
          />

          <Text style={s.label}>Imagen</Text>
          <TouchableOpacity style={s.imagenWrap} onPress={() => fileInputRef.current?.click()} activeOpacity={0.85}>
            {imagenPreview || editando?.imagen ? (
              <Image
                source={{ uri: imagenPreview || storageUrl(editando?.imagen) }}
                style={s.imagenPreview}
                resizeMode="cover"
              />
            ) : (
              <Text style={s.imagenPlaceholder}>Toca para subir una imagen (opcional)</Text>
            )}
          </TouchableOpacity>
          {Platform.OS === 'web' && (
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              style={{ display: 'none' }}
              onChange={handleImagenSelect}
            />
          )}

          <View style={s.formActions}>
            <Button kind="ghost" onPress={cancelarForm} disabled={guardando}>Cancelar</Button>
            <Button kind="primary" loading={guardando} disabled={guardando} onPress={submitForm}>
              {editando ? 'Guardar cambios' : 'Crear publicacion'}
            </Button>
          </View>
        </Card>
      ) : (
        <>
          <View style={s.cuposRow}>
            <Card style={s.cuposCard}>
              <Text style={s.cuposLabel}>Cupos activos</Text>
              <Text style={s.cuposValue}>{cupos ? `${cupos.activas}/${cupos.limite}` : '—'}</Text>
              {limiteAlcanzado ? (
                <Text style={s.cuposHint}>
                  Alcanzaste tu limite de publicaciones activas. Desactiva una o activa Premium para publicar mas.
                </Text>
              ) : null}
            </Card>
            <Button kind="primary" icon="plus" onPress={abrirCrear} disabled={limiteAlcanzado} style={s.crearBtn}>
              Nueva publicacion
            </Button>
          </View>

          {publicaciones.length === 0 ? (
            <View style={s.emptyWrap}>
              <Text style={s.emptyTitle}>Aun no tienes publicaciones</Text>
              <Text style={s.emptyDesc}>
                Crea tu primera publicacion para aparecer en el catalogo de servicios.
              </Text>
              <Button kind="primary" size="lg" onPress={abrirCrear} disabled={limiteAlcanzado}>
                Crear mi primera publicacion
              </Button>
            </View>
          ) : (
            <View style={s.grid}>
              {publicaciones.map((pub) => (
                <PublicacionCard
                  key={pub.id}
                  publicacion={pub}
                  style={{ width: cardWidth }}
                  footer={(
                    <View style={s.cardActions}>
                      <TouchableOpacity
                        style={s.actionBtn}
                        onPress={() => abrirEditar(pub)}
                        disabled={mutandoId === pub.id}
                      >
                        <Text style={s.actionBtnText}>Editar</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={s.actionBtn}
                        onPress={() => toggleEstado(pub)}
                        disabled={mutandoId === pub.id || (pub.estado !== 'activa' && limiteAlcanzado)}
                      >
                        {mutandoId === pub.id ? (
                          <ActivityIndicator size="small" color={T.blue} />
                        ) : (
                          <Text style={s.actionBtnText}>{pub.estado === 'activa' ? 'Desactivar' : 'Activar'}</Text>
                        )}
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={s.actionBtnDanger}
                        onPress={() => setEliminarObjetivo(pub)}
                        disabled={mutandoId === pub.id}
                      >
                        <Text style={s.actionBtnDangerText}>Eliminar</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                />
              ))}
            </View>
          )}
        </>
      )}

      <ConfirmModal
        visible={!!eliminarObjetivo}
        titulo="Eliminar publicacion"
        mensaje={`Esta accion no se puede deshacer. ¿Eliminar "${eliminarObjetivo?.titulo ?? ''}"?`}
        procesando={eliminando}
        onCancel={() => setEliminarObjetivo(null)}
        onConfirm={confirmarEliminar}
      />
    </ScrollView>
  );
}

function ConfirmModal({ visible, titulo, mensaje, procesando, onCancel, onConfirm }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={s.modalBackdrop} onPress={onCancel}>
        <Pressable style={s.modalSheet} onPress={() => {}}>
          <Text style={s.modalTitle}>{titulo}</Text>
          <Text style={s.modalMensaje}>{mensaje}</Text>
          <View style={s.formActions}>
            <Button kind="ghost" onPress={onCancel} disabled={procesando}>Cancelar</Button>
            <Button kind="danger" loading={procesando} disabled={procesando} onPress={onConfirm}>
              Eliminar
            </Button>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.canvas },
  content: { padding: T.s4, paddingBottom: 44, width: '100%', maxWidth: 1200, alignSelf: 'center', gap: T.s4 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { fontSize: 15, color: T.muted },

  errorCard: { padding: 20, alignItems: 'center' },
  errorText: { fontSize: 15, color: T.danger, textAlign: 'center' },

  cuposRow: { flexDirection: 'row', flexWrap: 'wrap', gap: T.s3, alignItems: 'stretch' },
  cuposCard: { flex: 1, minWidth: 220, padding: 16 },
  cuposLabel: { fontSize: 12, fontWeight: '700', color: T.muted, textTransform: 'uppercase', letterSpacing: 0.5 },
  cuposValue: { fontSize: 26, fontWeight: '800', color: T.blue, marginTop: 4 },
  cuposHint: { fontSize: 12, color: T.warn, marginTop: 8, lineHeight: 17 },
  crearBtn: { alignSelf: 'flex-start' },

  emptyWrap: {
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 24, paddingVertical: 48, gap: 10,
    backgroundColor: T.white, borderRadius: T.rLg, borderWidth: 1, borderColor: T.border,
  },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: T.ink },
  emptyDesc: { fontSize: 14, color: T.muted, textAlign: 'center', lineHeight: 20, marginBottom: 8, maxWidth: 420 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: T.s4 },

  cardActions: { flexDirection: 'row', gap: 8, marginTop: 14, flexWrap: 'wrap', borderTopWidth: 1, borderTopColor: T.paper, paddingTop: 12 },
  actionBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: T.rSm, borderWidth: 1, borderColor: T.border, backgroundColor: T.white },
  actionBtnText: { fontSize: 12, fontWeight: '700', color: T.deep },
  actionBtnDanger: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: T.rSm, borderWidth: 1, borderColor: '#fee2e2', backgroundColor: '#fef2f2' },
  actionBtnDangerText: { fontSize: 12, fontWeight: '700', color: T.danger },

  formCard: { maxWidth: 640, width: '100%', alignSelf: 'center' },
  formTitle: { fontSize: 20, fontWeight: '800', color: T.ink, marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '800', color: T.ink, marginBottom: 6, marginTop: 4 },
  field: { marginBottom: 12 },

  selectBtn: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: T.inputBg, borderWidth: 1, borderColor: T.inputBorder, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 13, marginBottom: 12,
  },
  selectBtnText: { flex: 1, fontSize: 15, color: T.text },
  selectBtnPlaceholder: { flex: 1, fontSize: 15, color: T.faint },
  selectArrow: { fontSize: 12, color: T.muted },
  dropdownList: {
    maxHeight: 220, backgroundColor: T.white, borderWidth: 1, borderColor: T.border,
    borderRadius: 12, marginBottom: 12, overflow: 'hidden',
  },
  dropdownOption: { paddingHorizontal: 14, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: T.paper },
  dropdownOptionText: { fontSize: 14, color: T.text },

  imagenWrap: {
    borderRadius: 12, overflow: 'hidden', marginBottom: 16, minHeight: 120,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: T.inputBg, borderWidth: 1, borderColor: T.inputBorder, borderStyle: 'dashed',
  },
  imagenPreview: { width: '100%', height: 160 },
  imagenPlaceholder: { fontSize: 13, color: T.muted, fontWeight: '600', padding: 20, textAlign: 'center' },

  formActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 8 },

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(14,20,36,0.45)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalSheet: { width: '100%', maxWidth: 380, backgroundColor: T.white, borderRadius: T.rMd, padding: 22, ...T.sh3 },
  modalTitle: { fontSize: 17, fontWeight: '800', color: T.ink, marginBottom: 8 },
  modalMensaje: { fontSize: 14, color: T.muted, lineHeight: 20 },
});