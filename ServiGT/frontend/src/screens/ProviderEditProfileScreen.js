import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { getCategorias, updateProvider, createProvider, uploadFotoPerfil, storageUrl } from '../services/api';
import { useToast } from '../context/ToastContext';
import { validateRequired, validatePhone, validateNumeric } from '../utils/validation';
import { T } from '../theme';
import { Button, Card, Input, StatusChip } from '../components/ui';

const DEPARTAMENTOS = [
  'Alta Verapaz', 'Baja Verapaz', 'Chimaltenango', 'Chiquimula', 'El Progreso',
  'Escuintla', 'Guatemala', 'Huehuetenango', 'Izabal', 'Jalapa', 'Jutiapa',
  'Peten', 'Quetzaltenango', 'Quiche', 'Retalhuleu', 'Sacatepequez',
  'San Marcos', 'Santa Rosa', 'Solola', 'Suchitepequez', 'Totonicapan', 'Zacapa',
];

const NIVELES = ['novato', 'intermedio', 'experto'];

export default function ProviderEditProfileScreen({
  navigation,
  user,
  providerProfile,
  onProfileUpdated,
}) {
  const toast = useToast();
  const { width } = useWindowDimensions();
  const wide = width >= 960;
  const fileInputRef = useRef(null);
  const isEditing = !!providerProfile;

  const [nombre, setNombre] = useState(providerProfile?.nombre || user?.name || '');
  const [telefono, setTelefono] = useState(providerProfile?.telefono || '');
  const [descripcion, setDescripcion] = useState(providerProfile?.descripcion || '');
  const [departamento, setDepartamento] = useState(providerProfile?.departamento || '');
  const [municipio, setMunicipio] = useState(providerProfile?.municipio || '');
  const [tarifaHora, setTarifaHora] = useState(providerProfile?.tarifa_hora ? String(providerProfile.tarifa_hora) : '');
  const [tarifaProyecto, setTarifaProyecto] = useState(providerProfile?.tarifa_proyecto ? String(providerProfile.tarifa_proyecto) : '');
  const [nivel, setNivel] = useState(providerProfile?.nivel || 'novato');
  const [categorias, setCategorias] = useState([]);
  const [loadingCats, setLoadingCats] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [categoriaIds, setCategoriaIds] = useState(() => {
    if (providerProfile?.categorias?.length > 0) return providerProfile.categorias.map((c) => String(c.id));
    if (providerProfile?.categoria_id) return [String(providerProfile.categoria_id)];
    return [];
  });
  const [localPhotoUri, setLocalPhotoUri] = useState(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [showDepartamentos, setShowDepartamentos] = useState(false);
  const [showNivelSelector, setShowNivelSelector] = useState(false);

  const clearError = (field) => setErrors((e) => ({ ...e, [field]: null }));

  useEffect(() => { loadCategorias(); }, []);

  const loadCategorias = async () => {
    setLoadingCats(true);
    try {
      const data = await getCategorias();
      setCategorias(data.categorias || []);
    } catch {
      toast('No se pudieron cargar las categorias.', 'warning');
    } finally {
      setLoadingCats(false);
    }
  };

  const handlePhotoSelect = async (event) => {
    const file = event.target?.files?.[0];
    if (!file || !providerProfile?.id) return;

    const previewUrl = URL.createObjectURL(file);
    setLocalPhotoUri(previewUrl);
    setUploadingPhoto(true);
    try {
      const data = await uploadFotoPerfil(providerProfile.id, file);
      toast('Foto de perfil actualizada.', 'success');
      onProfileUpdated && onProfileUpdated({ ...providerProfile, foto_perfil: data.foto_perfil });
    } catch (error) {
      toast(error.message, 'error');
      setLocalPhotoUri(null);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSave = async () => {
    const errs = {};
    if (!validateRequired(nombre)) errs.nombre = 'El nombre es requerido.';
    if (telefono && !validatePhone(telefono)) errs.telefono = 'Ingresa un numero de telefono valido.';
    if (!validateRequired(descripcion)) errs.descripcion = 'La descripcion es requerida.';
    else if (descripcion.trim().length < 20) errs.descripcion = 'La descripcion debe tener al menos 20 caracteres.';
    if (!departamento) errs.departamento = 'Selecciona tu departamento.';
    if (categoriaIds.length === 0) errs.categoriaIds = 'Selecciona al menos una categoria.';
    if (tarifaHora && !validateNumeric(tarifaHora)) errs.tarifaHora = 'Ingresa una tarifa valida.';
    if (tarifaProyecto && !validateNumeric(tarifaProyecto)) errs.tarifaProyecto = 'Ingresa una tarifa valida.';
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});

    setSaving(true);
    try {
      const payload = {
        nombre: nombre.trim(),
        telefono: telefono.trim() || null,
        descripcion: descripcion.trim(),
        departamento,
        municipio: municipio.trim() || null,
        categoria_id: parseInt(categoriaIds[0], 10),
        categoria_ids: categoriaIds.map((id) => parseInt(id, 10)),
        tarifa_hora: tarifaHora ? parseFloat(tarifaHora) : null,
        tarifa_proyecto: tarifaProyecto ? parseFloat(tarifaProyecto) : null,
        nivel,
      };

      const data = isEditing
        ? await updateProvider(providerProfile.id, payload)
        : await createProvider({ ...payload, user_id: user.id, email: user.email });

      toast(isEditing ? 'Perfil actualizado correctamente.' : 'Perfil de proveedor creado.', 'success');
      onProfileUpdated && onProfileUpdated(data.proveedor);
    } catch (error) {
      toast(error.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const currentPhoto = localPhotoUri || storageUrl(providerProfile?.foto_perfil);
  const initial = nombre.charAt(0).toUpperCase() || '?';

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <TouchableOpacity onPress={() => navigation?.navigate('ProviderDashboard')} style={s.backBtn}>
        <Text style={s.backText}>Volver</Text>
      </TouchableOpacity>

      <View style={[s.hero, wide && s.heroWide]}>
        <View style={s.heroCopy}>
          <Text style={s.eyebrow}>Perfil proveedor</Text>
          <Text style={s.headerTitle}>{isEditing ? 'Editar perfil' : 'Crear perfil'}</Text>
          <Text style={s.headerSubtitle}>
            Organiza la informacion que veran los clientes al comparar proveedores reales.
          </Text>
          <View style={s.heroChips}>
            <StatusChip label={isEditing ? 'Perfil activo' : 'Nuevo perfil'} variant="info" />
            <StatusChip label={nivel} variant="neutral" />
          </View>
        </View>

        {isEditing ? (
          <View style={s.photoSection}>
            <TouchableOpacity
              style={s.avatarWrap}
              onPress={() => fileInputRef.current?.click()}
              activeOpacity={0.85}
              disabled={uploadingPhoto}
            >
              {currentPhoto ? (
                <Image source={{ uri: currentPhoto }} style={s.avatar} />
              ) : (
                <View style={s.avatarPlaceholder}>
                  <Text style={s.avatarInitial}>{initial}</Text>
                </View>
              )}
              <View style={s.avatarBadge}>
                {uploadingPhoto ? <ActivityIndicator size="small" color={T.white} /> : <Text style={s.avatarBadgeIcon}>+</Text>}
              </View>
            </TouchableOpacity>
            <Text style={s.photoHint}>{uploadingPhoto ? 'Subiendo...' : 'Cambiar foto'}</Text>
            {Platform.OS === 'web' && (
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                style={{ display: 'none' }}
                onChange={handlePhotoSelect}
              />
            )}
          </View>
        ) : null}
      </View>

      <Card padding={24} style={s.card}>
        <Text style={s.sectionTitle}>Datos del proveedor</Text>

        <Text style={s.label}>Nombre *</Text>
        <Input
          placeholder="Nombre completo o nombre del negocio"
          value={nombre}
          onChangeText={(v) => { setNombre(v); clearError('nombre'); }}
          error={errors.nombre}
          style={s.field}
        />

        <Text style={s.label}>Telefono</Text>
        <Input
          icon="phone"
          placeholder="Ej: 5555-1234"
          value={telefono}
          onChangeText={(v) => { setTelefono(v); clearError('telefono'); }}
          keyboardType="phone-pad"
          error={errors.telefono}
          style={s.field}
        />

        <Text style={s.label}>Descripcion de servicios *</Text>
        <Input
          placeholder="Describe los servicios que ofreces, tu experiencia, horarios..."
          value={descripcion}
          onChangeText={(v) => { setDescripcion(v); clearError('descripcion'); }}
          multiline
          numberOfLines={5}
          error={errors.descripcion}
          style={s.field}
        />

        <Text style={s.label}>Departamento *</Text>
        <TouchableOpacity
          style={[s.selectBtn, errors.departamento && s.inputError]}
          onPress={() => setShowDepartamentos((v) => !v)}
        >
          <Text style={departamento ? s.selectBtnText : s.selectBtnPlaceholder}>
            {departamento || 'Selecciona un departamento'}
          </Text>
          <Text style={s.selectArrow}>{showDepartamentos ? '^' : 'v'}</Text>
        </TouchableOpacity>
        {errors.departamento ? <Text style={s.fieldError}>{errors.departamento}</Text> : null}
        {showDepartamentos && (
          <ScrollView style={s.dropdownList} nestedScrollEnabled>
            {DEPARTAMENTOS.map((dep) => (
              <TouchableOpacity
                key={dep}
                style={[s.dropdownOption, departamento === dep && s.dropdownOptionActive]}
                onPress={() => { setDepartamento(dep); clearError('departamento'); setShowDepartamentos(false); }}
              >
                <Text style={[s.dropdownOptionText, departamento === dep && s.dropdownOptionTextActive]}>
                  {dep}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        <Text style={s.label}>Municipio</Text>
        <Input
          icon="map-pin"
          placeholder="Municipio (opcional)"
          value={municipio}
          onChangeText={setMunicipio}
          style={s.field}
        />

        <View style={[s.twoCol, wide && s.twoColWide]}>
          <View style={s.col}>
            <Text style={s.label}>Tarifa por hora (Q)</Text>
            <Input
              icon="dollar-sign"
              placeholder="Ej: 75.00"
              value={tarifaHora}
              onChangeText={(v) => { setTarifaHora(v); clearError('tarifaHora'); }}
              keyboardType="decimal-pad"
              error={errors.tarifaHora}
              style={s.field}
            />
          </View>
          <View style={s.col}>
            <Text style={s.label}>Tarifa por proyecto (Q)</Text>
            <Input
              icon="briefcase"
              placeholder="Ej: 500.00"
              value={tarifaProyecto}
              onChangeText={(v) => { setTarifaProyecto(v); clearError('tarifaProyecto'); }}
              keyboardType="decimal-pad"
              error={errors.tarifaProyecto}
              style={s.field}
            />
          </View>
        </View>

        <Text style={s.label}>Nivel de experiencia</Text>
        <TouchableOpacity style={s.selectBtn} onPress={() => setShowNivelSelector((v) => !v)}>
          <Text style={s.selectBtnText}>{nivel.charAt(0).toUpperCase() + nivel.slice(1)}</Text>
          <Text style={s.selectArrow}>{showNivelSelector ? '^' : 'v'}</Text>
        </TouchableOpacity>
        {showNivelSelector && (
          <View style={s.dropdownList}>
            {NIVELES.map((n) => (
              <TouchableOpacity
                key={n}
                style={[s.dropdownOption, nivel === n && s.dropdownOptionActive]}
                onPress={() => { setNivel(n); setShowNivelSelector(false); }}
              >
                <Text style={[s.dropdownOptionText, nivel === n && s.dropdownOptionTextActive]}>
                  {n.charAt(0).toUpperCase() + n.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <Text style={s.label}>Categorias de servicio *</Text>
        {loadingCats ? (
          <ActivityIndicator color={T.blue} style={{ marginVertical: 10 }} />
        ) : (
          <View style={s.chipGrid}>
            {categorias.map((cat) => {
              const selected = categoriaIds.includes(String(cat.id));
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={[s.chip, selected && s.chipSelected]}
                  onPress={() => {
                    setCategoriaIds((prev) =>
                      prev.includes(String(cat.id))
                        ? prev.filter((x) => x !== String(cat.id))
                        : [...prev, String(cat.id)]
                    );
                    clearError('categoriaIds');
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={[s.chipText, selected && s.chipTextSelected]}>
                    {selected ? '* ' : ''}{cat.nombre}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
        {errors.categoriaIds ? <Text style={s.fieldError}>{errors.categoriaIds}</Text> : null}

        <Button full size="lg" loading={saving} disabled={saving} onPress={handleSave} style={s.saveButton}>
          {isEditing ? 'Guardar cambios' : 'Crear perfil'}
        </Button>

        <TouchableOpacity style={s.cancelBtn} onPress={() => navigation?.navigate('ProviderDashboard')}>
          <Text style={s.cancelBtnText}>Cancelar</Text>
        </TouchableOpacity>
      </Card>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.canvas },
  content: { padding: 24, paddingBottom: 44, width: '100%', maxWidth: 1120, alignSelf: 'center' },
  backBtn: { alignSelf: 'flex-start', paddingVertical: 8, paddingRight: 12, marginBottom: 12 },
  backText: { color: T.blue, fontSize: 14, fontWeight: '800' },
  hero: {
    backgroundColor: T.paper,
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
    gap: 18,
    ...T.sh2,
  },
  heroWide: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroCopy: { flex: 1, minWidth: 0 },
  eyebrow: { color: T.blue, fontSize: 12, fontWeight: '900', textTransform: 'uppercase' },
  headerTitle: { fontSize: 30, fontWeight: '900', color: T.ink, marginTop: 4 },
  headerSubtitle: { color: T.muted, fontSize: 14, lineHeight: 21, marginTop: 6, maxWidth: 620 },
  heroChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  photoSection: { alignItems: 'center', minWidth: 150 },
  avatarWrap: { width: 96, height: 96, borderRadius: 48, marginBottom: 10, position: 'relative' },
  avatar: { width: 96, height: 96, borderRadius: 48, backgroundColor: T.soft },
  avatarPlaceholder: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#e6effa',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: T.soft,
  },
  avatarInitial: { color: T.deep, fontSize: 36, fontWeight: '900' },
  avatarBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: T.blue,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: T.paper,
  },
  avatarBadgeIcon: { fontSize: 18, color: T.white, fontWeight: '900', lineHeight: 20 },
  photoHint: { fontSize: 12, color: T.muted, fontWeight: '700' },
  card: { maxWidth: 760, width: '100%', alignSelf: 'center' },
  sectionTitle: { fontSize: 22, fontWeight: '900', color: T.ink, marginBottom: 18 },
  label: { fontSize: 13, fontWeight: '800', color: T.ink, marginBottom: 6, marginTop: 4 },
  field: { marginBottom: 12 },
  inputError: { borderColor: T.danger, backgroundColor: '#fff5f5' },
  fieldError: { fontSize: 12, color: T.danger, marginBottom: 10, marginLeft: 2 },
  selectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: T.inputBg,
    borderWidth: 1,
    borderColor: T.inputBorder,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    marginBottom: 12,
  },
  selectBtnText: { flex: 1, fontSize: 15, color: T.text },
  selectBtnPlaceholder: { flex: 1, fontSize: 15, color: T.faint },
  selectArrow: { fontSize: 12, color: T.muted },
  dropdownList: {
    maxHeight: 200,
    backgroundColor: T.white,
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
  },
  dropdownOption: { paddingHorizontal: 14, paddingVertical: 10 },
  dropdownOptionActive: { backgroundColor: '#e6effa' },
  dropdownOptionText: { fontSize: 14, color: T.text },
  dropdownOptionTextActive: { color: T.deep, fontWeight: '800' },
  twoCol: { gap: 0 },
  twoColWide: { flexDirection: 'row', gap: 12 },
  col: { flex: 1, minWidth: 0 },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: T.inputBorder,
    backgroundColor: T.white,
  },
  chipSelected: { backgroundColor: T.blue, borderColor: T.blue },
  chipText: { fontSize: 13, color: T.text, fontWeight: '700' },
  chipTextSelected: { color: T.white },
  saveButton: { marginTop: 10 },
  cancelBtn: { padding: 14, borderRadius: 8, alignItems: 'center', marginTop: 4 },
  cancelBtnText: { color: T.muted, fontSize: 15, fontWeight: '700' },
});
