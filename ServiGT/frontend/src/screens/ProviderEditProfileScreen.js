import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { getCategorias, updateProvider, createProvider, uploadFotoPerfil } from '../services/api';
import { useToast } from '../context/ToastContext';
import { validateRequired, validatePhone, validateNumeric } from '../utils/validation';
import { T } from '../theme';

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
  const toast       = useToast();
  const fileInputRef = useRef(null);
  const isEditing   = !!providerProfile;

  const [nombre, setNombre]         = useState(providerProfile?.nombre || user?.name || '');
  const [telefono, setTelefono]     = useState(providerProfile?.telefono || '');
  const [descripcion, setDescripcion] = useState(providerProfile?.descripcion || '');
  const [departamento, setDepartamento] = useState(providerProfile?.departamento || '');
  const [municipio, setMunicipio]   = useState(providerProfile?.municipio || '');
  const [tarifaHora, setTarifaHora] = useState(
    providerProfile?.tarifa_hora ? String(providerProfile.tarifa_hora) : ''
  );
  const [tarifaProyecto, setTarifaProyecto] = useState(
    providerProfile?.tarifa_proyecto ? String(providerProfile.tarifa_proyecto) : ''
  );
  const [nivel, setNivel]           = useState(providerProfile?.nivel || 'novato');
  const [categorias, setCategorias] = useState([]);
  const [loadingCats, setLoadingCats] = useState(true);
  const [saving, setSaving]         = useState(false);
  const [errors, setErrors]         = useState({});

  // Multi-category state — init from existing profile
  const [categoriaIds, setCategoriaIds] = useState(() => {
    if (providerProfile?.categorias?.length > 0) {
      return providerProfile.categorias.map((c) => String(c.id));
    }
    if (providerProfile?.categoria_id) {
      return [String(providerProfile.categoria_id)];
    }
    return [];
  });

  // Photo state
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
      toast('No se pudieron cargar las categorías.', 'warning');
    } finally {
      setLoadingCats(false);
    }
  };

  // ── Photo handling ────────────────────────────────────────────────────────
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

  // ── Save profile ──────────────────────────────────────────────────────────
  const handleSave = async () => {
    const errs = {};
    if (!validateRequired(nombre))     errs.nombre      = 'El nombre es requerido.';
    if (telefono && !validatePhone(telefono)) errs.telefono = 'Ingresa un número de teléfono válido.';
    if (!validateRequired(descripcion)) errs.descripcion = 'La descripción es requerida.';
    else if (descripcion.trim().length < 20) errs.descripcion = 'La descripción debe tener al menos 20 caracteres.';
    if (!departamento) errs.departamento = 'Selecciona tu departamento.';
    if (categoriaIds.length === 0) errs.categoriaIds = 'Selecciona al menos una categoría.';
    if (tarifaHora && !validateNumeric(tarifaHora)) errs.tarifaHora = 'Ingresa una tarifa válida.';
    if (tarifaProyecto && !validateNumeric(tarifaProyecto)) errs.tarifaProyecto = 'Ingresa una tarifa válida.';
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});

    setSaving(true);
    try {
      const payload = {
        nombre:           nombre.trim(),
        telefono:         telefono.trim() || null,
        descripcion:      descripcion.trim(),
        departamento,
        municipio:        municipio.trim() || null,
        categoria_id:     parseInt(categoriaIds[0], 10),
        categoria_ids:    categoriaIds.map((id) => parseInt(id, 10)),
        tarifa_hora:      tarifaHora     ? parseFloat(tarifaHora)     : null,
        tarifa_proyecto:  tarifaProyecto ? parseFloat(tarifaProyecto) : null,
        nivel,
      };

      let data;
      if (isEditing) {
        data = await updateProvider(providerProfile.id, payload);
      } else {
        data = await createProvider({ ...payload, user_id: user.id, email: user.email });
      }

      toast(isEditing ? 'Perfil actualizado correctamente.' : 'Perfil de proveedor creado.', 'success');
      onProfileUpdated && onProfileUpdated(data.proveedor);
    } catch (error) {
      toast(error.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  const currentPhoto = localPhotoUri || providerProfile?.foto_perfil;
  const initial      = nombre.charAt(0).toUpperCase() || '?';

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation?.navigate('ProviderDashboard')} style={s.backBtn}>
          <Text style={s.backText}>← Volver</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>
          {isEditing ? 'Editar perfil' : 'Crear perfil'}
        </Text>
      </View>

      {/* ── Photo section (only when editing) ── */}
      {isEditing && (
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
              {uploadingPhoto
                ? <ActivityIndicator size="small" color={T.paper} />
                : <Text style={s.avatarBadgeIcon}>📷</Text>}
            </View>
          </TouchableOpacity>

          <Text style={s.photoHint}>
            {uploadingPhoto ? 'Subiendo...' : 'Toca la foto para cambiarla'}
          </Text>

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
      )}

      <View style={s.card}>
        <Text style={s.sectionTitle}>Datos del proveedor</Text>

        <Text style={s.label}>Nombre *</Text>
        <TextInput
          style={[s.input, errors.nombre && s.inputError]}
          placeholder="Nombre completo o nombre del negocio"
          value={nombre}
          onChangeText={(v) => { setNombre(v); clearError('nombre'); }}
        />
        {errors.nombre ? <Text style={s.fieldError}>{errors.nombre}</Text> : null}

        <Text style={s.label}>Teléfono</Text>
        <TextInput
          style={[s.input, errors.telefono && s.inputError]}
          placeholder="Ej: 5555-1234"
          value={telefono}
          onChangeText={(v) => { setTelefono(v); clearError('telefono'); }}
          keyboardType="phone-pad"
        />
        {errors.telefono ? <Text style={s.fieldError}>{errors.telefono}</Text> : null}

        <Text style={s.label}>Descripción de servicios *</Text>
        <TextInput
          style={[s.input, s.textArea, errors.descripcion && s.inputError]}
          placeholder="Describe los servicios que ofreces, tu experiencia, horarios..."
          value={descripcion}
          onChangeText={(v) => { setDescripcion(v); clearError('descripcion'); }}
          multiline
          numberOfLines={5}
        />
        {errors.descripcion ? <Text style={s.fieldError}>{errors.descripcion}</Text> : null}

        {/* Departamento */}
        <Text style={s.label}>Departamento *</Text>
        <TouchableOpacity
          style={[s.selectBtn, errors.departamento && s.inputError]}
          onPress={() => setShowDepartamentos((v) => !v)}
        >
          <Text style={departamento ? s.selectBtnText : s.selectBtnPlaceholder}>
            {departamento || 'Selecciona un departamento'}
          </Text>
          <Text style={s.selectArrow}>{showDepartamentos ? '▲' : '▼'}</Text>
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
        <TextInput
          style={s.input}
          placeholder="Municipio (opcional)"
          value={municipio}
          onChangeText={setMunicipio}
        />

        {/* Tarifas */}
        <Text style={s.label}>Tarifa por hora (Q)</Text>
        <TextInput
          style={[s.input, errors.tarifaHora && s.inputError]}
          placeholder="Ej: 75.00"
          value={tarifaHora}
          onChangeText={(v) => { setTarifaHora(v); clearError('tarifaHora'); }}
          keyboardType="decimal-pad"
        />
        {errors.tarifaHora ? <Text style={s.fieldError}>{errors.tarifaHora}</Text> : null}

        <Text style={s.label}>Tarifa por proyecto (Q)</Text>
        <TextInput
          style={[s.input, errors.tarifaProyecto && s.inputError]}
          placeholder="Ej: 500.00"
          value={tarifaProyecto}
          onChangeText={(v) => { setTarifaProyecto(v); clearError('tarifaProyecto'); }}
          keyboardType="decimal-pad"
        />
        {errors.tarifaProyecto ? <Text style={s.fieldError}>{errors.tarifaProyecto}</Text> : null}

        {/* Nivel */}
        <Text style={s.label}>Nivel de experiencia</Text>
        <TouchableOpacity style={s.selectBtn} onPress={() => setShowNivelSelector((v) => !v)}>
          <Text style={s.selectBtnText}>{nivel.charAt(0).toUpperCase() + nivel.slice(1)}</Text>
          <Text style={s.selectArrow}>{showNivelSelector ? '▲' : '▼'}</Text>
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

        {/* Multi-category chips */}
        <Text style={s.label}>
          Categorías de servicio * — selecciona todas las que apliquen
        </Text>
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
                  {selected && <Text style={s.chipCheck}>✓ </Text>}
                  <Text style={[s.chipText, selected && s.chipTextSelected]}>{cat.nombre}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
        {errors.categoriaIds ? <Text style={s.fieldError}>{errors.categoriaIds}</Text> : null}

        {/* Save */}
        <TouchableOpacity
          style={[s.saveBtn, saving && { opacity: 0.65 }]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving
            ? <ActivityIndicator color={T.paper} />
            : <Text style={s.saveBtnText}>{isEditing ? 'Guardar cambios' : 'Crear perfil'}</Text>}
        </TouchableOpacity>

        <TouchableOpacity
          style={s.cancelBtn}
          onPress={() => navigation?.navigate('ProviderDashboard')}
        >
          <Text style={s.cancelBtnText}>Cancelar</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.canvas },
  content:   { padding: 16, paddingBottom: 40 },

  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  backBtn: { paddingVertical: 8, paddingHorizontal: 4 },
  backText: { color: T.blue, fontSize: 15, fontWeight: '600' },
  headerTitle: { fontSize: 22, fontWeight: '700', color: T.ink },

  // Photo section
  photoSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    marginBottom: 10,
    position: 'relative',
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: T.soft,
  },
  avatarPlaceholder: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: T.blue,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: { color: T.paper, fontSize: 36, fontWeight: '800' },
  avatarBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: T.ink,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: T.canvas,
  },
  avatarBadgeIcon: { fontSize: 13 },
  photoHint: { fontSize: 12, color: T.muted },

  // Card
  card: {
    backgroundColor: T.paper,
    borderRadius: 14,
    padding: 20,
    shadowColor: T.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 2,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: T.ink, marginBottom: 16 },

  label: { fontSize: 13, fontWeight: '600', color: T.ink, marginBottom: 6, marginTop: 4 },
  input: {
    backgroundColor: T.white,
    borderWidth: 1,
    borderColor: T.inputBorder,
    borderRadius: 8,
    padding: 13,
    fontSize: 15,
    marginBottom: 4,
    color: T.text,
  },
  inputError: { borderColor: T.danger, backgroundColor: '#fff5f5' },
  fieldError:  { fontSize: 12, color: T.danger, marginBottom: 10, marginLeft: 2 },
  textArea:    { height: 120, textAlignVertical: 'top' },

  selectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: T.white,
    borderWidth: 1,
    borderColor: T.inputBorder,
    borderRadius: 8,
    padding: 13,
    marginBottom: 4,
  },
  selectBtnText:        { flex: 1, fontSize: 15, color: T.text },
  selectBtnPlaceholder: { flex: 1, fontSize: 15, color: T.faint },
  selectArrow:          { fontSize: 12, color: T.muted },

  dropdownList: {
    maxHeight: 200,
    backgroundColor: T.white,
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: 8,
    marginBottom: 12,
  },
  dropdownOption: { paddingHorizontal: 14, paddingVertical: 10 },
  dropdownOptionActive: { backgroundColor: '#e8f0fd' },
  dropdownOptionText: { fontSize: 14, color: '#555' },
  dropdownOptionTextActive: { color: T.blue, fontWeight: '600' },

  // Multi-select chips
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: T.inputBorder,
    backgroundColor: T.white,
  },
  chipSelected:     { backgroundColor: T.blue, borderColor: T.blue },
  chipCheck:        { fontSize: 11, color: T.paper, fontWeight: '700' },
  chipText:         { fontSize: 13, color: '#555', fontWeight: '500' },
  chipTextSelected: { color: T.paper, fontWeight: '600' },

  saveBtn: {
    backgroundColor: T.blue,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  saveBtnText: { color: T.paper, fontSize: 16, fontWeight: '600' },

  cancelBtn: { padding: 14, borderRadius: 8, alignItems: 'center', marginTop: 4 },
  cancelBtnText: { color: T.muted, fontSize: 15 },
});
