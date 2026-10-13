import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { actualizarLoteMaterial, crearLoteMaterial, getMaterialDetalle, getServicio, storageUrl } from '../services/api';
import { Button, Input, ScreenHeader } from '../components/ui';
import MaterialConfirmModal from '../components/material/MaterialConfirmModal';
import { T } from '../theme';

const fields = [
  ['titulo', 'Titulo', 120], ['descripcion', 'Descripcion', 1000], ['cantidad', 'Cantidad'],
  ['unidad', 'Unidad', 30], ['precio_referencial', 'Precio referencial'],
  ['departamento', 'Departamento', 60], ['municipio', 'Municipio', 100],
];
const empty = Object.fromEntries(fields.map(([key]) => [key, '']));
const formats = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };

export default function MaterialFormScreen({ navigation, user, servicioId, materialId }) {
  const [data, setData] = useState(empty);
  const [existing, setExisting] = useState([]);
  const [removed, setRemoved] = useState([]);
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [selecting, setSelecting] = useState(false);
  const [removeTarget, setRemoveTarget] = useState(null);
  const busy = useRef(false);
  const generation = useRef(0);
  const provider = user?.role === 'proveedor';
  const editing = !!materialId;
  const kept = existing.filter((img) => !removed.includes(img.id));
  const load = async () => {
    const version = generation.current;
    setLoading(true); setError(''); setAllowed(false);
    try {
      if (!(editing ? materialId : servicioId)) throw new Error('Falta el servicio o lote seleccionado.');
      const response = editing ? await getMaterialDetalle(materialId) : await getServicio(servicioId);
      if (version !== generation.current) return;
      if (editing) {
        const lote = response.publicacion;
        if (!lote?.es_mio || lote.estado !== 'disponible') throw new Error('Solo puedes editar un lote propio disponible.');
        setData(Object.fromEntries(fields.map(([key]) => [key, String(lote[key] ?? '')])));
        setExisting(lote.imagenes || []);
      } else {
        const servicio = response.servicio;
        if (servicio?.publicacion_material_id) {
          navigation.navigate('MaterialDetail', { id: servicio.publicacion_material_id });
          return;
        }
        if (servicio?.puede_publicar_materiales !== true) throw new Error('Este servicio no permite publicar materiales.');
      }
      setAllowed(true);
    } catch (err) {
      if (version === generation.current) setError(err.message);
    } finally {
      if (version === generation.current) setLoading(false);
    }
  };
  useEffect(() => {
    setData(empty); setExisting([]); setRemoved([]); setImages([]);
    if (provider) load();
    return () => { generation.current += 1; };
  }, [provider, servicioId, materialId]);

  const pick = async () => {
    if (selecting || saving) return;
    setSelecting(true); setError('');
    const version = generation.current;
    try {
      if (Platform.OS !== 'web') {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) throw new Error('Permite el acceso a tus imagenes para adjuntarlas.');
      }
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: true, selectionLimit: 3 - kept.length - images.length, quality: 1 });
      if (result.canceled || version !== generation.current) return;
      const assets = result.assets || [];
      if (kept.length + images.length + assets.length > 3) throw new Error('Adjunta entre 1 y 3 imagenes.');
      const checked = [];
      for (const asset of assets) {
        const name = asset.fileName || asset.uri.split('/').pop();
        const extension = name?.split('.').pop()?.toLowerCase();
        const mime = asset.mimeType || formats[extension];
        if (!Object.values(formats).includes(mime) || (asset.fileName && !formats[extension])) throw new Error('Usa imagenes JPG, PNG o WebP.');
        let size = asset.fileSize ?? asset.file?.size;
        if (size == null && Platform.OS !== 'web') size = (await FileSystem.getInfoAsync(asset.uri)).size;
        if (size == null && Platform.OS === 'web') size = (await (await fetch(asset.uri)).blob()).size;
        if (!Number.isFinite(size) || size <= 0) throw new Error('No se pudo comprobar el archivo. Selecciona otra imagen.');
        if (size > 4 * 1024 * 1024) throw new Error('Cada imagen debe pesar como maximo 4 MB.');
        checked.push({ ...asset, fileName: name || `material.${extension || 'jpg'}`, mimeType: mime });
      }
      if (version === generation.current) setImages((prev) => [...prev, ...checked]);
    } catch (err) {
      if (version === generation.current) setError(err.message);
    } finally {
      if (version === generation.current) setSelecting(false);
    }
  };
  const validate = () => {
    if (data.titulo.trim().length < 3 || data.titulo.length > 120) return 'El titulo debe tener entre 3 y 120 caracteres.';
    if (data.descripcion.trim().length < 10 || data.descripcion.length > 1000) return 'La descripcion debe tener entre 10 y 1000 caracteres.';
    if (!data.cantidad.trim() || !Number.isFinite(Number(data.cantidad)) || Number(data.cantidad) <= 0 || Number(data.cantidad) > 99999999) return 'Ingresa una cantidad mayor que cero y menor o igual a 99999999.';
    if (!data.unidad.trim() || data.unidad.length > 30) return 'Ingresa una unidad de hasta 30 caracteres.';
    if (!data.precio_referencial.trim() || !Number.isFinite(Number(data.precio_referencial)) || Number(data.precio_referencial) < 0 || Number(data.precio_referencial) > 999999.99) return 'Ingresa un precio entre Q0 y Q999999.99.';
    if (!data.departamento.trim() || data.departamento.length > 60) return 'Ingresa un departamento de hasta 60 caracteres.';
    if (data.municipio.length > 100) return 'El municipio admite hasta 100 caracteres.';
    if (kept.length + images.length < 1 || kept.length + images.length > 3) return 'Adjunta entre 1 y 3 imagenes.';
    return '';
  };
  const submit = async () => {
    if (busy.current || selecting || !allowed) return;
    const validation = validate();
    if (validation) { setError(validation); return; }
    busy.current = true; setSaving(true); setError('');
    const version = generation.current;
    try {
      const payload = { ...Object.fromEntries(Object.entries(data).map(([key, value]) => [key, value.trim()])), imagenes: images, eliminar_imagenes: removed };
      if (!editing) payload.servicio_id = Number(servicioId);
      const response = editing ? await actualizarLoteMaterial(materialId, payload) : await crearLoteMaterial(payload);
      if (!response.publicacion?.id) throw new Error('El servidor no confirmo la publicacion.');
      if (version === generation.current) navigation.navigate('MaterialDetail', { id: response.publicacion.id });
    } catch (err) {
      if (version === generation.current) {
        setError(err.message);
        if (!editing && err.status === 409) await load();
      }
    } finally {
      busy.current = false;
      if (version === generation.current) setSaving(false);
    }
  };
  if (!provider) return <Text>La bolsa de materiales es exclusiva para proveedores.</Text>;
  if (loading) return <View style={s.center}><ActivityIndicator color={T.blue} /><Text>Cargando formulario...</Text></View>;
  return <ScrollView style={s.container} contentContainerStyle={s.content}>
    <ScreenHeader title={editing ? 'Editar lote' : 'Publicar materiales'} onBack={() => navigation.goBack()} />
    {error ? <Text style={s.error}>{error}</Text> : null}
    {!allowed ? <Button onPress={load}>Reintentar</Button> : <>
      {fields.map(([key, label, maxLength]) => <View key={key} style={s.field}>
        <Text style={s.label}>{label}{key === 'municipio' ? ' (opcional)' : ' *'}</Text>
        <Input accessibilityLabel={label} value={data[key]} onChangeText={(value) => setData((prev) => ({ ...prev, [key]: value }))} maxLength={maxLength} multiline={key === 'descripcion'} keyboardType={['cantidad', 'precio_referencial'].includes(key) ? 'decimal-pad' : 'default'} editable={!saving} />
      </View>)}
      <Text style={s.label}>Imagenes *</Text>
      <View style={s.images}>
        {[...kept.map((img) => ({ ...img, existing: true, uri: storageUrl(img.url) })), ...images].map((img, index) => <View key={img.existing ? `existing-${img.id}` : `new-${index}`} style={s.imageItem}>
          <Image source={{ uri: img.uri }} style={s.image} />
          <Text style={s.fileName} numberOfLines={1}>{img.fileName || `Imagen ${index + 1}`}</Text>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Eliminar imagen ${index + 1}`} disabled={saving} onPress={() => img.existing ? setRemoveTarget(img.id) : setImages((prev) => prev.filter((_, i) => i !== index - kept.length))} style={s.remove}>
            <Feather name="trash-2" size={18} color={T.danger} />
          </TouchableOpacity>
        </View>)}
      </View>
      {kept.length + images.length < 3 ? <Button kind="secondary" icon="image" onPress={pick} disabled={saving || selecting} loading={selecting}>Agregar imagenes</Button> : null}
      <Button onPress={submit} disabled={saving || selecting} loading={saving}>{editing ? 'Guardar cambios' : 'Publicar lote'}</Button>
    </>}
    <MaterialConfirmModal visible={removeTarget !== null} texto={{ titulo: 'Eliminar imagen', mensaje: 'La imagen se eliminara al guardar los cambios.', confirmar: 'Eliminar', kind: 'danger' }} procesando={saving} onCancel={() => setRemoveTarget(null)} onConfirm={() => { setRemoved((prev) => [...prev, removeTarget]); setRemoveTarget(null); }} />
  </ScrollView>;
}
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.canvas },
  content: { padding: T.s4, gap: T.s3, width: '100%', maxWidth: 760, alignSelf: 'center', paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: T.s3 },
  field: { gap: T.s2 },
  label: { fontSize: 14, fontWeight: '700', color: T.ink },
  error: { color: T.danger },
  images: { flexDirection: 'row', flexWrap: 'wrap', gap: T.s3 },
  imageItem: { width: 120, gap: T.s1 },
  image: { width: 120, height: 90, borderRadius: T.rSm },
  fileName: { fontSize: 12, color: T.muted },
  remove: { alignSelf: 'flex-end', padding: T.s2 },
});
