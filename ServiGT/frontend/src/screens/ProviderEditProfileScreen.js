import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { getCategorias, updateProvider, createProvider } from '../services/api';
import { useToast } from '../context/ToastContext';
import { validateRequired, validatePhone, validateNumeric } from '../utils/validation';

const DEPARTAMENTOS = [
  'Alta Verapaz', 'Baja Verapaz', 'Chimaltenango', 'Chiquimula', 'El Progreso',
  'Escuintla', 'Guatemala', 'Huehuetenango', 'Izabal', 'Jalapa', 'Jutiapa',
  'Peten', 'Quetzaltenango', 'Quiche', 'Retalhuleu', 'Sacatepequez',
  'San Marcos', 'Santa Rosa', 'Solola', 'Suchitepequez', 'Totonicapan',
  'Zacapa',
];

export default function ProviderEditProfileScreen({
  navigation,
  user,
  providerProfile,
  onProfileUpdated,
}) {
  const toast = useToast();
  const isEditing = !!providerProfile;

  const [nombre, setNombre] = useState(providerProfile?.nombre || user?.name || '');
  const [telefono, setTelefono] = useState(providerProfile?.telefono || '');
  const [descripcion, setDescripcion] = useState(providerProfile?.descripcion || '');
  const [departamento, setDepartamento] = useState(providerProfile?.departamento || '');
  const [municipio, setMunicipio] = useState(providerProfile?.municipio || '');
  const [categoriaId, setCategoriaId] = useState(
    providerProfile?.categoria_id ? String(providerProfile.categoria_id) : ''
  );
  const [tarifaHora, setTarifaHora] = useState(
    providerProfile?.tarifa_hora ? String(providerProfile.tarifa_hora) : ''
  );
  const [tarifaProyecto, setTarifaProyecto] = useState(
    providerProfile?.tarifa_proyecto ? String(providerProfile.tarifa_proyecto) : ''
  );
  const [nivel, setNivel] = useState(providerProfile?.nivel || 'novato');
  const [categorias, setCategorias] = useState([]);
  const [loadingCats, setLoadingCats] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  const [showDepartamentos, setShowDepartamentos] = useState(false);
  const [showNivelSelector, setShowNivelSelector] = useState(false);
  const NIVELES = ['novato', 'intermedio', 'experto'];

  const clearError = (field) => setErrors((e) => ({ ...e, [field]: null }));

  useEffect(() => {
    loadCategorias();
  }, []);

  const loadCategorias = async () => {
    setLoadingCats(true);
    try {
      const data = await getCategorias();
      setCategorias(data.categorias || []);
      if (!categoriaId && data.categorias?.length > 0) {
        setCategoriaId(String(data.categorias[0].id));
      }
    } catch {
      toast('No se pudieron cargar las categorias.', 'warning');
    } finally {
      setLoadingCats(false);
    }
  };

  const handleSave = async () => {
    const errs = {};
    if (!validateRequired(nombre)) errs.nombre = 'El nombre es requerido.';
    if (telefono && !validatePhone(telefono)) errs.telefono = 'Ingresa un numero de telefono valido.';
    if (!validateRequired(descripcion)) errs.descripcion = 'La descripcion es requerida.';
    else if (descripcion.trim().length < 20) errs.descripcion = 'La descripcion debe tener al menos 20 caracteres.';
    if (!departamento) errs.departamento = 'Selecciona tu departamento.';
    if (!categoriaId) errs.categoriaId = 'Selecciona una categoria.';
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
        categoria_id: parseInt(categoriaId, 10),
        tarifa_hora: tarifaHora ? parseFloat(tarifaHora) : null,
        tarifa_proyecto: tarifaProyecto ? parseFloat(tarifaProyecto) : null,
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

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation?.navigate('ProviderDashboard')} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Volver</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isEditing ? 'Editar perfil' : 'Crear perfil'}
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Datos del proveedor</Text>

        <Text style={styles.label}>Nombre *</Text>
        <TextInput
          style={[styles.input, errors.nombre && styles.inputError]}
          placeholder="Nombre completo o nombre del negocio"
          value={nombre}
          onChangeText={(v) => { setNombre(v); clearError('nombre'); }}
        />
        {errors.nombre ? <Text style={styles.fieldError}>{errors.nombre}</Text> : null}

        <Text style={styles.label}>Telefono</Text>
        <TextInput
          style={[styles.input, errors.telefono && styles.inputError]}
          placeholder="Ej: 5555-1234"
          value={telefono}
          onChangeText={(v) => { setTelefono(v); clearError('telefono'); }}
          keyboardType="phone-pad"
        />
        {errors.telefono ? <Text style={styles.fieldError}>{errors.telefono}</Text> : null}

        <Text style={styles.label}>Descripcion de servicios *</Text>
        <TextInput
          style={[styles.input, styles.textArea, errors.descripcion && styles.inputError]}
          placeholder="Describe los servicios que ofreces, tu experiencia, horarios de atencion..."
          value={descripcion}
          onChangeText={(v) => { setDescripcion(v); clearError('descripcion'); }}
          multiline
          numberOfLines={5}
        />
        {errors.descripcion ? <Text style={styles.fieldError}>{errors.descripcion}</Text> : null}

        <Text style={styles.label}>Departamento *</Text>
        <TouchableOpacity
          style={[styles.selectBtn, errors.departamento && styles.inputError]}
          onPress={() => setShowDepartamentos(!showDepartamentos)}
        >
          <Text style={departamento ? styles.selectBtnText : styles.selectBtnPlaceholder}>
            {departamento || 'Selecciona un departamento'}
          </Text>
          <Text style={styles.selectArrow}>{showDepartamentos ? '▲' : '▼'}</Text>
        </TouchableOpacity>
        {errors.departamento ? <Text style={styles.fieldError}>{errors.departamento}</Text> : null}

        {showDepartamentos && (
          <ScrollView style={styles.dropdownList} nestedScrollEnabled>
            {DEPARTAMENTOS.map((dep) => (
              <TouchableOpacity
                key={dep}
                style={[styles.dropdownOption, departamento === dep && styles.dropdownOptionActive]}
                onPress={() => {
                  setDepartamento(dep);
                  clearError('departamento');
                  setShowDepartamentos(false);
                }}
              >
                <Text style={[styles.dropdownOptionText, departamento === dep && styles.dropdownOptionTextActive]}>
                  {dep}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        <Text style={styles.label}>Municipio</Text>
        <TextInput
          style={styles.input}
          placeholder="Municipio (opcional)"
          value={municipio}
          onChangeText={setMunicipio}
        />

        <Text style={styles.label}>Tarifa por hora (Q)</Text>
        <TextInput
          style={[styles.input, errors.tarifaHora && styles.inputError]}
          placeholder="Ej: 75.00"
          value={tarifaHora}
          onChangeText={(v) => { setTarifaHora(v); clearError('tarifaHora'); }}
          keyboardType="decimal-pad"
        />
        {errors.tarifaHora ? <Text style={styles.fieldError}>{errors.tarifaHora}</Text> : null}

        <Text style={styles.label}>Tarifa por proyecto (Q)</Text>
        <TextInput
          style={[styles.input, errors.tarifaProyecto && styles.inputError]}
          placeholder="Ej: 500.00"
          value={tarifaProyecto}
          onChangeText={(v) => { setTarifaProyecto(v); clearError('tarifaProyecto'); }}
          keyboardType="decimal-pad"
        />
        {errors.tarifaProyecto ? <Text style={styles.fieldError}>{errors.tarifaProyecto}</Text> : null}

        <Text style={styles.label}>Nivel de experiencia</Text>
        <TouchableOpacity
          style={styles.selectBtn}
          onPress={() => setShowNivelSelector(!showNivelSelector)}
        >
          <Text style={styles.selectBtnText}>{nivel}</Text>
          <Text style={styles.selectArrow}>{showNivelSelector ? '▲' : '▼'}</Text>
        </TouchableOpacity>
        {showNivelSelector && (
          <View style={styles.dropdownList}>
            {NIVELES.map((n) => (
              <TouchableOpacity
                key={n}
                style={[styles.dropdownOption, nivel === n && styles.dropdownOptionActive]}
                onPress={() => { setNivel(n); setShowNivelSelector(false); }}
              >
                <Text style={[styles.dropdownOptionText, nivel === n && styles.dropdownOptionTextActive]}>
                  {n.charAt(0).toUpperCase() + n.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <Text style={styles.label}>Categoria de servicio *</Text>
        {loadingCats ? (
          <ActivityIndicator color="#1a73e8" style={{ marginVertical: 10 }} />
        ) : (
          <>
            <View style={styles.categoriaGrid}>
              {categorias.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  style={[styles.categoriaOption, categoriaId === String(cat.id) && styles.categoriaOptionActive]}
                  onPress={() => { setCategoriaId(String(cat.id)); clearError('categoriaId'); }}
                >
                  <Text style={[styles.categoriaOptionText, categoriaId === String(cat.id) && styles.categoriaOptionTextActive]}>
                    {cat.nombre}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {errors.categoriaId ? <Text style={styles.fieldError}>{errors.categoriaId}</Text> : null}
          </>
        )}

        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveBtnText}>{isEditing ? 'Guardar cambios' : 'Crear perfil'}</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.cancelBtn}
          onPress={() => navigation?.navigate('ProviderDashboard')}
        >
          <Text style={styles.cancelBtnText}>Cancelar</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  content: { padding: 16, paddingBottom: 40 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  backBtn: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  backBtnText: { color: '#1a73e8', fontSize: 15, fontWeight: '600' },
  headerTitle: { fontSize: 22, fontWeight: '700', color: '#333' },

  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#333', marginBottom: 16 },

  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#444',
    marginBottom: 6,
    marginTop: 4,
  },
  input: {
    backgroundColor: '#f7f9fc',
    borderWidth: 1,
    borderColor: '#d9e2ef',
    borderRadius: 8,
    padding: 13,
    fontSize: 15,
    marginBottom: 4,
    color: '#333',
  },
  inputError: {
    borderColor: '#c0392b',
    backgroundColor: '#fff5f5',
  },
  fieldError: {
    fontSize: 12,
    color: '#c0392b',
    marginBottom: 10,
    marginLeft: 2,
  },
  textArea: {
    height: 120,
    textAlignVertical: 'top',
  },

  selectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f7f9fc',
    borderWidth: 1,
    borderColor: '#d9e2ef',
    borderRadius: 8,
    padding: 13,
    marginBottom: 4,
  },
  selectBtnText: { flex: 1, fontSize: 15, color: '#333' },
  selectBtnPlaceholder: { flex: 1, fontSize: 15, color: '#aaa' },
  selectArrow: { fontSize: 12, color: '#999' },

  dropdownList: {
    maxHeight: 200,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    marginBottom: 12,
  },
  dropdownOption: { paddingHorizontal: 14, paddingVertical: 10 },
  dropdownOptionActive: { backgroundColor: '#e3f2fd' },
  dropdownOptionText: { fontSize: 14, color: '#555' },
  dropdownOptionTextActive: { color: '#1a73e8', fontWeight: '600' },

  categoriaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 4,
  },
  categoriaOption: {
    backgroundColor: '#f7f9fc',
    borderWidth: 1,
    borderColor: '#d9e2ef',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  categoriaOptionActive: {
    backgroundColor: '#1a73e8',
    borderColor: '#1a73e8',
  },
  categoriaOptionText: { fontSize: 13, color: '#555' },
  categoriaOptionTextActive: { color: '#fff', fontWeight: '600' },

  saveBtn: {
    backgroundColor: '#1a73e8',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },

  cancelBtn: {
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  cancelBtnText: { color: '#999', fontSize: 15 },
});
