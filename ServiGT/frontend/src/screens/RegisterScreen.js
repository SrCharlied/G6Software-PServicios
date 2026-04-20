import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { register, createProvider, getCategorias, uploadDocumento } from '../services/api';

const DEPARTAMENTOS = [
  'Alta Verapaz', 'Baja Verapaz', 'Chimaltenango', 'Chiquimula', 'El Progreso',
  'Escuintla', 'Guatemala', 'Huehuetenango', 'Izabal', 'Jalapa', 'Jutiapa',
  'Peten', 'Quetzaltenango', 'Quiche', 'Retalhuleu', 'Sacatepequez',
  'San Marcos', 'Santa Rosa', 'Solola', 'Suchitepequez', 'Totonicapan', 'Zacapa',
];

const TIPOS_DOCUMENTO = [
  'DPI (Documento Personal de Identificacion)',
  'Pasaporte',
  'NIT (Numero de Identificacion Tributaria)',
  'Patente de Comercio',
  'Titulo Universitario',
  'Certificado de Antecedentes',
  'Otro',
];

// ── Componente Dropdown reutilizable ──────────────────────────────────────
function Dropdown({ label, value, options, onSelect, placeholder = 'Selecciona...' }) {
  const [open, setOpen] = useState(false);
  return (
    <View style={dd.wrapper}>
      <Text style={dd.label}>{label}</Text>
      <TouchableOpacity style={dd.selector} onPress={() => setOpen(!open)}>
        <Text style={value ? dd.selectorText : dd.selectorPlaceholder} numberOfLines={1}>
          {value || placeholder}
        </Text>
        <Text style={dd.arrow}>{open ? '▲' : '▼'}</Text>
      </TouchableOpacity>
      {open && (
        <View style={dd.list}>
          {options.map((opt) => {
            const label2 = typeof opt === 'string' ? opt : opt.label;
            const val2   = typeof opt === 'string' ? opt : opt.value;
            return (
              <TouchableOpacity
                key={val2}
                style={[dd.option, value === val2 && dd.optionActive]}
                onPress={() => { onSelect(val2); setOpen(false); }}
              >
                <Text style={[dd.optionText, value === val2 && dd.optionTextActive]}>
                  {label2}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
}

const dd = StyleSheet.create({
  wrapper: { marginBottom: 14 },
  label: { fontSize: 13, fontWeight: '600', color: '#444', marginBottom: 6 },
  selector: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#f7f9fc', borderWidth: 1, borderColor: '#d9e2ef',
    borderRadius: 8, paddingHorizontal: 13, paddingVertical: 13,
  },
  selectorText: { flex: 1, fontSize: 15, color: '#333' },
  selectorPlaceholder: { flex: 1, fontSize: 15, color: '#aaa' },
  arrow: { fontSize: 12, color: '#999', marginLeft: 8 },
  list: {
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#e0e0e0',
    borderRadius: 8, maxHeight: 220, overflow: 'hidden',
  },
  option: { paddingHorizontal: 14, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
  optionActive: { backgroundColor: '#e3f2fd' },
  optionText: { fontSize: 14, color: '#555' },
  optionTextActive: { color: '#1a73e8', fontWeight: '600' },
});

// ── Pantalla principal ────────────────────────────────────────────────────
export default function RegisterScreen({ navigation, onRegisterSuccess }) {
  const [step, setStep] = useState(1);

  // Paso 1
  const [name, setName]       = useState('');
  const [email, setEmail]     = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole]       = useState('cliente');

  // Paso 2
  const [telefono, setTelefono]       = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [departamento, setDepartamento] = useState('');
  const [municipio, setMunicipio]     = useState('');
  const [categoriaId, setCategoriaId] = useState('');
  const [categorias, setCategorias]   = useState([]);
  const [loadingCats, setLoadingCats] = useState(false);

  // Paso 3
  const [documentos, setDocumentos]       = useState([]);
  const [tipoDocumento, setTipoDocumento] = useState(TIPOS_DOCUMENTO[0]);
  const [uploading, setUploading]         = useState(false);

  // Compartido
  const [loading, setLoading]             = useState(false);
  const [registeredUser, setRegisteredUser] = useState(null);
  const [providerProfile, setProviderProfile] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (step === 2 && categorias.length === 0) loadCategorias();
  }, [step]);

  const loadCategorias = async () => {
    setLoadingCats(true);
    try {
      const data = await getCategorias();
      const cats = data.categorias || [];
      setCategorias(cats);
      if (cats.length > 0) setCategoriaId(String(cats[0].id));
    } catch {
      Alert.alert('Aviso', 'No se pudieron cargar las categorias.');
    } finally {
      setLoadingCats(false);
    }
  };

  // ── Paso 1: registrar usuario ─────────────────────────────────────────
  const handleStep1 = async () => {
    if (!name.trim() || !email.trim() || !password.trim()) {
      Alert.alert('Campos incompletos', 'Completa nombre, correo y contrasena.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Contrasena muy corta', 'Debe tener al menos 6 caracteres.');
      return;
    }
    setLoading(true);
    try {
      const data = await register(name.trim(), email.trim(), password, role);
      setRegisteredUser(data.user);
      if (role === 'proveedor') {
        setStep(2);
      } else {
        // Cliente → directo al main
        onRegisterSuccess && onRegisterSuccess(data.user, null);
      }
    } catch (error) {
      Alert.alert('Error en el registro', error.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Paso 2: crear perfil de proveedor ────────────────────────────────
  const handleStep2 = async () => {
    if (!telefono.trim()) {
      Alert.alert('Campo requerido', 'Ingresa tu numero de telefono.');
      return;
    }
    if (!descripcion.trim()) {
      Alert.alert('Campo requerido', 'Describe los servicios que ofreces.');
      return;
    }
    if (!departamento) {
      Alert.alert('Campo requerido', 'Selecciona tu departamento.');
      return;
    }
    if (!categoriaId) {
      Alert.alert('Campo requerido', 'Selecciona una categoria de servicio.');
      return;
    }
    setLoading(true);
    try {
      const data = await createProvider({
        user_id:      registeredUser.id,
        nombre:       registeredUser.name,
        email:        registeredUser.email,
        telefono:     telefono.trim(),
        descripcion:  descripcion.trim(),
        departamento,
        municipio:    municipio.trim() || null,
        categoria_id: parseInt(categoriaId, 10),
      });
      setProviderProfile(data.proveedor);
      setStep(3);
    } catch (error) {
      Alert.alert('Error al crear perfil', error.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Paso 3: documentos → finalizar ──────────────────────────────────
  const handleFileSelect = (event) => {
    const file = event.target?.files?.[0];
    if (file) uploadFile(file);
  };

  const uploadFile = async (file) => {
    if (!providerProfile) return;
    setUploading(true);
    try {
      const data = await uploadDocumento(providerProfile.id, file, tipoDocumento);
      setDocumentos((prev) => [...prev, data.documento]);
    } catch (error) {
      Alert.alert('Error al subir documento', error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleFinish = () => {
    onRegisterSuccess && onRegisterSuccess(registeredUser, providerProfile);
  };

  // ── Indicador de pasos ────────────────────────────────────────────────
  const StepIndicator = () => (
    <View style={styles.stepRow}>
      {['Cuenta', 'Perfil', 'Documentos'].map((label, i) => {
        const n = i + 1;
        const active = step >= n;
        const current = step === n;
        return (
          <View key={n} style={styles.stepItem}>
            <View style={[styles.stepCircle, active && styles.stepCircleActive, current && styles.stepCircleCurrent]}>
              {step > n
                ? <Text style={styles.stepCheck}>✓</Text>
                : <Text style={[styles.stepNum, active && styles.stepNumActive]}>{n}</Text>}
            </View>
            <Text style={[styles.stepLabel, active && styles.stepLabelActive]}>{label}</Text>
          </View>
        );
      })}
      {/* Lineas entre pasos */}
      <View style={[styles.stepLine, styles.stepLine1, step >= 2 && styles.stepLineActive]} />
      <View style={[styles.stepLine, styles.stepLine2, step >= 3 && styles.stepLineActive]} />
    </View>
  );

  // ── Render paso 1 ─────────────────────────────────────────────────────
  const renderStep1 = () => (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Datos de la cuenta</Text>

      <Text style={styles.inputLabel}>Nombre completo</Text>
      <TextInput style={styles.input} placeholder="Tu nombre" value={name} onChangeText={setName} />

      <Text style={styles.inputLabel}>Correo electronico</Text>
      <TextInput
        style={styles.input} placeholder="correo@ejemplo.com"
        value={email} onChangeText={setEmail}
        keyboardType="email-address" autoCapitalize="none"
      />

      <Text style={styles.inputLabel}>Contrasena</Text>
      <TextInput
        style={styles.input} placeholder="Minimo 6 caracteres"
        value={password} onChangeText={setPassword} secureTextEntry
      />

      <Text style={styles.inputLabel}>Tipo de cuenta</Text>
      <View style={styles.roleRow}>
        {[
          { val: 'cliente',   label: 'Cliente',    sub: 'Busco servicios' },
          { val: 'proveedor', label: 'Proveedor',  sub: 'Ofrezco servicios' },
        ].map((r) => (
          <TouchableOpacity
            key={r.val}
            style={[styles.roleBtn, role === r.val && styles.roleBtnActive]}
            onPress={() => setRole(r.val)}
          >
            <Text style={[styles.roleText, role === r.val && styles.roleTextActive]}>{r.label}</Text>
            <Text style={[styles.roleSub, role === r.val && styles.roleSubActive]}>{r.sub}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        style={[styles.btnPrimary, loading && styles.btnDisabled]}
        onPress={handleStep1}
        disabled={loading}
      >
        {loading
          ? <ActivityIndicator color="#fff" />
          : <Text style={styles.btnPrimaryText}>
              {role === 'proveedor' ? 'Continuar →' : 'Crear cuenta'}
            </Text>}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation?.navigate('Login')}>
        <Text style={styles.linkText}>Ya tienes cuenta? Inicia sesion</Text>
      </TouchableOpacity>
    </View>
  );

  // ── Render paso 2 ─────────────────────────────────────────────────────
  const renderStep2 = () => (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Perfil de proveedor</Text>
      <Text style={styles.cardSub}>
        Esta informacion aparecera en el listado publico de proveedores.
      </Text>

      <Text style={styles.inputLabel}>Telefono *</Text>
      <TextInput
        style={styles.input} placeholder="Ej: 5555-1234"
        value={telefono} onChangeText={setTelefono} keyboardType="phone-pad"
      />

      <Text style={styles.inputLabel}>Descripcion de tus servicios *</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        placeholder="Describe que servicios ofreces, tu experiencia y horarios..."
        value={descripcion} onChangeText={setDescripcion}
        multiline numberOfLines={4}
      />

      <Dropdown
        label="Departamento *"
        value={departamento}
        placeholder="Selecciona tu departamento"
        options={DEPARTAMENTOS}
        onSelect={setDepartamento}
      />

      <Text style={styles.inputLabel}>Municipio (opcional)</Text>
      <TextInput
        style={styles.input} placeholder="Municipio"
        value={municipio} onChangeText={setMunicipio}
      />

      {loadingCats
        ? <ActivityIndicator color="#1a73e8" style={{ marginVertical: 12 }} />
        : (
          <Dropdown
            label="Categoria de servicio *"
            value={categorias.find((c) => String(c.id) === categoriaId)?.nombre || ''}
            placeholder="Selecciona una categoria"
            options={categorias.map((c) => ({ label: c.nombre, value: String(c.id) }))}
            onSelect={setCategoriaId}
          />
        )}

      <TouchableOpacity
        style={[styles.btnPrimary, loading && styles.btnDisabled]}
        onPress={handleStep2}
        disabled={loading}
      >
        {loading
          ? <ActivityIndicator color="#fff" />
          : <Text style={styles.btnPrimaryText}>Continuar →</Text>}
      </TouchableOpacity>
    </View>
  );

  // ── Render paso 3 ─────────────────────────────────────────────────────
  const renderStep3 = () => (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Documentos de identidad</Text>
      <Text style={styles.cardSub}>
        Sube tus documentos para validar tu identidad. Puedes omitirlo y hacerlo despues desde tu perfil.
      </Text>

      <View style={styles.infoBox}>
        <Text style={styles.infoText}>
          Formatos aceptados: PDF, JPG, PNG — maximo 5 MB por archivo.
        </Text>
      </View>

      <Dropdown
        label="Tipo de documento"
        value={tipoDocumento}
        options={TIPOS_DOCUMENTO}
        onSelect={setTipoDocumento}
      />

      {Platform.OS === 'web' ? (
        <>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            style={{ display: 'none' }}
            onChange={handleFileSelect}
          />
          <TouchableOpacity
            style={[styles.btnSecondary, uploading && styles.btnDisabled]}
            onPress={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading
              ? <ActivityIndicator color="#1a73e8" />
              : <Text style={styles.btnSecondaryText}>+ Subir documento</Text>}
          </TouchableOpacity>
        </>
      ) : (
        <View style={styles.uploadNote}>
          <Text style={styles.uploadNoteText}>La carga de archivos esta disponible en la version web.</Text>
        </View>
      )}

      {documentos.length > 0 && (
        <View style={styles.docsList}>
          <Text style={styles.docsListTitle}>Subidos ({documentos.length})</Text>
          {documentos.map((doc, i) => (
            <View key={i} style={styles.docRow}>
              <Text style={styles.docName} numberOfLines={1}>{doc.nombre_archivo}</Text>
              <View style={styles.docBadge}><Text style={styles.docBadgeText}>Pendiente</Text></View>
            </View>
          ))}
        </View>
      )}

      {/* Boton principal: finalizar y ir al main */}
      <TouchableOpacity style={styles.btnPrimary} onPress={handleFinish}>
        <Text style={styles.btnPrimaryText}>
          {documentos.length > 0 ? 'Finalizar registro' : 'Ir al inicio →'}
        </Text>
      </TouchableOpacity>

      {documentos.length === 0 && (
        <Text style={styles.skipText}>
          Podras subir documentos despues desde "Mi perfil"
        </Text>
      )}
    </View>
  );

  // ── Render principal ──────────────────────────────────────────────────
  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.appTitle}>PServicios</Text>
      <Text style={styles.appSubtitle}>Crear cuenta</Text>

      {/* Indicador de pasos solo para proveedor (o si ya paso del paso 1) */}
      {(role === 'proveedor' || step > 1) && <StepIndicator />}

      {step === 1 && renderStep1()}
      {step === 2 && renderStep2()}
      {step === 3 && renderStep3()}
    </ScrollView>
  );
}

// ── Estilos ────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    paddingTop: 36,
    backgroundColor: '#f0f4f8',
  },
  appTitle: {
    fontSize: 30,
    fontWeight: 'bold',
    color: '#1a73e8',
    textAlign: 'center',
  },
  appSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 20,
  },

  // Step indicator
  stepRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-start',
    marginBottom: 24,
    paddingHorizontal: 10,
    position: 'relative',
  },
  stepItem: {
    alignItems: 'center',
    width: 80,
  },
  stepCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#dde3ea',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  stepCircleActive: {
    backgroundColor: '#1a73e8',
  },
  stepCircleCurrent: {
    borderWidth: 3,
    borderColor: '#a8c4f5',
  },
  stepNum: { fontSize: 15, fontWeight: '700', color: '#999' },
  stepNumActive: { color: '#fff' },
  stepCheck: { fontSize: 14, color: '#fff', fontWeight: '700' },
  stepLabel: { fontSize: 11, color: '#999', marginTop: 5, textAlign: 'center' },
  stepLabelActive: { color: '#1a73e8', fontWeight: '600' },
  stepLine: {
    position: 'absolute',
    top: 17,
    height: 2,
    width: 60,
    backgroundColor: '#dde3ea',
  },
  stepLine1: { left: '26%' },
  stepLine2: { right: '26%' },
  stepLineActive: { backgroundColor: '#1a73e8' },

  // Card
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#222',
    marginBottom: 4,
  },
  cardSub: {
    fontSize: 13,
    color: '#777',
    marginBottom: 18,
    lineHeight: 18,
  },

  // Inputs
  inputLabel: {
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
    paddingHorizontal: 13,
    paddingVertical: 13,
    fontSize: 15,
    marginBottom: 14,
    color: '#333',
  },
  textArea: {
    height: 110,
    textAlignVertical: 'top',
  },

  // Role selector
  roleRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 18,
  },
  roleBtn: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#d9e2ef',
    backgroundColor: '#f7f9fc',
    alignItems: 'center',
  },
  roleBtnActive: {
    backgroundColor: '#1a73e8',
    borderColor: '#1a73e8',
  },
  roleText: { fontSize: 14, fontWeight: '700', color: '#555' },
  roleTextActive: { color: '#fff' },
  roleSub: { fontSize: 11, color: '#999', marginTop: 2 },
  roleSubActive: { color: 'rgba(255,255,255,0.8)' },

  // Botones
  btnPrimary: {
    backgroundColor: '#1a73e8',
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 6,
    marginBottom: 12,
  },
  btnDisabled: { backgroundColor: '#a0bfef' },
  btnPrimaryText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  btnSecondary: {
    borderWidth: 1.5,
    borderColor: '#1a73e8',
    paddingVertical: 13,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 6,
    marginBottom: 12,
  },
  btnSecondaryText: { color: '#1a73e8', fontSize: 15, fontWeight: '600' },

  linkText: {
    color: '#1a73e8',
    textAlign: 'center',
    fontSize: 14,
    paddingVertical: 4,
  },
  skipText: {
    color: '#aaa',
    textAlign: 'center',
    fontSize: 13,
    marginTop: 4,
  },

  // Info box
  infoBox: {
    backgroundColor: '#e8f4fd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  infoText: { fontSize: 13, color: '#1a5f8c', lineHeight: 18 },

  // Upload
  uploadNote: {
    borderWidth: 1.5,
    borderColor: '#d9e2ef',
    borderStyle: 'dashed',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    marginBottom: 14,
  },
  uploadNoteText: { fontSize: 13, color: '#aaa' },

  // Docs list
  docsList: {
    borderWidth: 1,
    borderColor: '#e8edf3',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  docsListTitle: { fontSize: 13, fontWeight: '700', color: '#444', marginBottom: 8 },
  docRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
    gap: 8,
  },
  docName: { flex: 1, fontSize: 13, color: '#555' },
  docBadge: { backgroundColor: '#fff3cd', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  docBadgeText: { fontSize: 11, color: '#856404', fontWeight: '600' },
});
