import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { getCategorias, updateProvider, createProvider } from '../services/api';

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

  const [showDepartamentos, setShowDepartamentos] = useState(false);
  const [showNivelSelector, setShowNivelSelector] = useState(false);
  const NIVELES = ['novato', 'intermedio', 'experto'];

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
      Alert.alert('Aviso', 'No se pudieron cargar las categorias.');
    } finally {
      setLoadingCats(false);
    }
  };

  const handleSave = async () => {
    if (!nombre.trim() || !descripcion.trim() || !departamento || !categoriaId) {
      Alert.alert('Error', 'Completa los campos obligatorios: nombre, descripcion, departamento y categoria.');
      return;
    }

    setSaving(true);
    try {
      let data;
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

      if (isEditing) {
        data = await updateProvider(providerProfile.id, payload);
      } else {
        data = await createProvider({ ...payload, user_id: user.id, email: user.email });
      }

      Alert.alert(
        'Perfil guardado',
        isEditing ? 'Tus datos han sido actualizados.' : 'Perfil de proveedor creado.',
        [{ text: 'OK', onPress: () => onProfileUpdated && onProfileUpdated(data.proveedor) }]
      );
    } catch (error) {
      Alert.alert('Error al guardar', error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
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
          style={styles.input}
          placeholder="Nombre completo o nombre del negocio"
          value={nombre}
          onChangeText={setNombre}
        />

        <Text style={styles.label}>Telefono</Text>
        <TextInput
          style={styles.input}
          placeholder="Ej: 5555-1234"
          value={telefono}
          onChangeText={setTelefono}
          keyboardType="phone-pad"
        />

        <Text style={styles.label}>Descripcion de servicios *</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Describe los servicios que ofreces, tu experiencia, horarios de atencion..."
          value={descripcion}
          onChangeText={setDescripcion}
          multiline
          numberOfLines={5}
        />

        {/* Departamento */}
        <Text style={styles.label}>Departamento *</Text>
        <TouchableOpacity
          style={styles.selectBtn}
          onPress={() => setShowDepartamentos(!showDepartamentos)}
        >
          <Text style={departamento ? styles.selectBtnText : styles.selectBtnPlaceholder}>
            {departamento || 'Selecciona un departamento'}
          </Text>
          <Text style={styles.selectArrow}>{showDepartamentos ? '▲' : '▼'}</Text>
        </TouchableOpacity>

        {showDepartamentos && (
          <ScrollView style={styles.dropdownList} nestedScrollEnabled>
            {DEPARTAMENTOS.map((dep) => (
              <TouchableOpacity
                key={dep}
                style={[styles.dropdownOption, departamento === dep && styles.dropdownOptionActive]}
                onPress={() => {
                  setDepartamento(dep);
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

        {/* Tarifas */}
        <Text style={styles.label}>Tarifa por hora (Q)</Text>
        <TextInput
          style={styles.input}
          placeholder="Ej: 75.00"
          value={tarifaHora}
          onChangeText={setTarifaHora}
          keyboardType="decimal-pad"
        />

        <Text style={styles.label}>Tarifa por proyecto (Q)</Text>
        <TextInput
          style={styles.input}
          placeholder="Ej: 500.00"
          value={tarifaProyecto}
          onChangeText={setTarifaProyecto}
          keyboardType="decimal-pad"
        />

        {/* Nivel */}
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

        {/* Categoria */}
        <Text style={styles.label}>Categoria de servicio *</Text>
        {loadingCats ? (
          <ActivityIndicator color="#1a73e8" style={{ marginVertical: 10 }} />
        ) : (
          <View style={styles.categoriaGrid}>
            {categorias.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                style={[styles.categoriaOption, categoriaId === String(cat.id) && styles.categoriaOptionActive]}
                onPress={() => setCategoriaId(String(cat.id))}
              >
                <Text style={[styles.categoriaOptionText, categoriaId === String(cat.id) && styles.categoriaOptionTextActive]}>
                  {cat.nombre}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
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
    marginBottom: 12,
    color: '#333',
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
    marginBottom: 6,
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
    marginBottom: 16,
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
