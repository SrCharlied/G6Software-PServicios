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

const webHover = (onEnter, onLeave) =>
  Platform.OS === 'web' ? { onMouseEnter: onEnter, onMouseLeave: onLeave } : {};

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
            const val2 = typeof opt === 'string' ? opt : opt.value;
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
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#d9e2ef',
    borderRadius: 8, paddingHorizontal: 13, paddingVertical: 13,
  },
  selectorText: { flex: 1, fontSize: 14, color: '#333' },
  selectorPlaceholder: { flex: 1, fontSize: 14, color: '#adb5bd' },
  arrow: { fontSize: 11, color: '#999', marginLeft: 8 },
  list: {
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#d9e2ef',
    borderRadius: 8, maxHeight: 220, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08, shadowRadius: 8, elevation: 4,
  },
  option: { paddingHorizontal: 14, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
  optionActive: { backgroundColor: '#e3f2fd' },
  optionText: { fontSize: 14, color: '#444' },
  optionTextActive: { color: '#1a73e8', fontWeight: '600' },
});

// ── Pantalla principal ────────────────────────────────────────────────────
export default function RegisterScreen({ navigation, onRegisterSuccess }) {
  const [step, setStep] = useState(1);

  // Paso 1
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('cliente');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [nameFocused, setNameFocused] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Hover states paso 1
  const [btnClienteHovered, setBtnClienteHovered] = useState(false);
  const [btnProveedorHovered, setBtnProveedorHovered] = useState(false);
  const [btnContinuarHovered, setBtnContinuarHovered] = useState(false);
  const [btnLoginHovered, setBtnLoginHovered] = useState(false);

  // Hover states paso 2
  const [btnContinuar2Hovered, setBtnContinuar2Hovered] = useState(false);

  // Hover states paso 3
  const [btnFinishHovered, setBtnFinishHovered] = useState(false);
  const [btnUploadHovered, setBtnUploadHovered] = useState(false);

  // Paso 2
  const [telefono, setTelefono] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [departamento, setDepartamento] = useState('');
  const [municipio, setMunicipio] = useState('');
  const [categoriaId, setCategoriaId] = useState('');
  const [categorias, setCategorias] = useState([]);
  const [loadingCats, setLoadingCats] = useState(false);

  // Paso 3
  const [documentos, setDocumentos] = useState([]);
  const [tipoDocumento, setTipoDocumento] = useState(TIPOS_DOCUMENTO[0]);
  const [uploading, setUploading] = useState(false);

  // Compartido
  const [loading, setLoading] = useState(false);
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
    setErrorMsg('');
    if (!name.trim() || !email.trim() || !password.trim()) {
      setErrorMsg('Completa nombre, correo y contrasena.');
      return;
    }
    if (password.length < 6) {
      setErrorMsg('La contrasena debe tener al menos 6 caracteres.');
      return;
    }
    setLoading(true);
    try {
      const data = await register(name.trim(), email.trim(), password, role);
      setRegisteredUser(data.user);
      if (role === 'proveedor') {
        setStep(2);
      } else {
        onRegisterSuccess && onRegisterSuccess(data.user, null);
      }
    } catch (error) {
      setErrorMsg(error.message);
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
        user_id: registeredUser.id,
        nombre: registeredUser.name,
        email: registeredUser.email,
        telefono: telefono.trim(),
        descripcion: descripcion.trim(),
        departamento,
        municipio: municipio.trim() || null,
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
            <View style={[
              styles.stepCircle,
              active && styles.stepCircleActive,
              current && styles.stepCircleCurrent,
            ]}>
              {step > n
                ? <Text style={styles.stepCheck}>✓</Text>
                : <Text style={[styles.stepNum, active && styles.stepNumActive]}>{n}</Text>}
            </View>
            <Text style={[styles.stepLabel, active && styles.stepLabelActive]}>{label}</Text>
          </View>
        );
      })}
      <View style={[styles.stepLine, styles.stepLine1, step >= 2 && styles.stepLineActive]} />
      <View style={[styles.stepLine, styles.stepLine2, step >= 3 && styles.stepLineActive]} />
    </View>
  );

  // ── Render paso 1 ─────────────────────────────────────────────────────
  const renderStep1 = () => (
    <View style={styles.card}>
      <Text style={styles.title}>PServicios</Text>
      <Text style={styles.subtitle}>Crear cuenta</Text>

      {errorMsg ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>⚠ {errorMsg}</Text>
        </View>
      ) : null}

      <Text style={styles.label}>Nombre completo</Text>
      <TextInput
        style={[styles.input, nameFocused && styles.inputFocused]}
        placeholder="Tu nombre"
        placeholderTextColor="#adb5bd"
        value={name}
        onChangeText={(t) => { setName(t); setErrorMsg(''); }}
        onFocus={() => setNameFocused(true)}
        onBlur={() => setNameFocused(false)}
      />

      <Text style={styles.label}>Correo electronico</Text>
      <TextInput
        style={[styles.input, emailFocused && styles.inputFocused]}
        placeholder="correo@ejemplo.com"
        placeholderTextColor="#adb5bd"
        value={email}
        onChangeText={(t) => { setEmail(t); setErrorMsg(''); }}
        keyboardType="email-address"
        autoCapitalize="none"
        onFocus={() => setEmailFocused(true)}
        onBlur={() => setEmailFocused(false)}
      />

      <Text style={styles.label}>Contrasena</Text>
      <View style={[styles.passwordWrap, passwordFocused && styles.inputFocused]}>
        <TextInput
          style={styles.passwordInput}
          placeholder="Minimo 6 caracteres"
          placeholderTextColor="#adb5bd"
          value={password}
          onChangeText={(t) => { setPassword(t); setErrorMsg(''); }}
          secureTextEntry={!showPassword}
          onFocus={() => setPasswordFocused(true)}
          onBlur={() => setPasswordFocused(false)}
        />
        <TouchableOpacity
          onPress={() => setShowPassword(!showPassword)}
          style={styles.eyeBtn}
        >
          <Text style={styles.eyeIcon}>{showPassword ? '( )' : '( • )'}</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.label}>Tipo de cuenta</Text>
      <View style={styles.roleRow}>
        <TouchableOpacity
          style={[
            styles.roleBtn,
            role === 'cliente' && styles.roleBtnActive,
            role !== 'cliente' && btnClienteHovered && styles.roleBtnHovered,
          ]}
          onPress={() => setRole('cliente')}
          {...webHover(() => setBtnClienteHovered(true), () => setBtnClienteHovered(false))}
        >
          <Text style={[styles.roleText, role === 'cliente' && styles.roleTextActive]}>Cliente</Text>
          <Text style={[styles.roleSub, role === 'cliente' && styles.roleSubActive]}>Busco servicios</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.roleBtn,
            role === 'proveedor' && styles.roleBtnActive,
            role !== 'proveedor' && btnProveedorHovered && styles.roleBtnHovered,
          ]}
          onPress={() => setRole('proveedor')}
          {...webHover(() => setBtnProveedorHovered(true), () => setBtnProveedorHovered(false))}
        >
          <Text style={[styles.roleText, role === 'proveedor' && styles.roleTextActive]}>Proveedor</Text>
          <Text style={[styles.roleSub, role === 'proveedor' && styles.roleSubActive]}>Ofrezco servicios</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={[styles.btnPrimary, loading && styles.btnDisabled, btnContinuarHovered && !loading && styles.btnPrimaryHovered]}
        onPress={handleStep1}
        disabled={loading}
        activeOpacity={0.82}
        {...webHover(() => setBtnContinuarHovered(true), () => setBtnContinuarHovered(false))}
      >
        {loading
          ? <ActivityIndicator color="#fff" />
          : <Text style={styles.btnPrimaryText}>
            {role === 'proveedor' ? 'Continuar →' : 'Crear cuenta'}
          </Text>}
      </TouchableOpacity>

      <View style={styles.divider}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>O</Text>
        <View style={styles.dividerLine} />
      </View>

      <TouchableOpacity
        style={[styles.btnSecondary, btnLoginHovered && styles.btnSecondaryHovered]}
        onPress={() => navigation?.navigate('Login')}
        activeOpacity={0.7}
        {...webHover(() => setBtnLoginHovered(true), () => setBtnLoginHovered(false))}
      >
        <Text style={styles.btnSecondaryText}>Ya tienes cuenta? Inicia sesion</Text>
      </TouchableOpacity>
    </View>
  );

  // ── Render paso 2 ─────────────────────────────────────────────────────
  const renderStep2 = () => (
    <View style={styles.card}>
      <Text style={styles.title}>PServicios</Text>
      <Text style={styles.subtitle}>Perfil de proveedor</Text>

      <Text style={styles.cardDesc}>
        Esta informacion aparecera en el listado publico de proveedores.
      </Text>

      <Text style={styles.label}>Telefono *</Text>
      <TextInput
        style={styles.input}
        placeholder="Ej: 5555-1234"
        placeholderTextColor="#adb5bd"
        value={telefono}
        onChangeText={setTelefono}
        keyboardType="phone-pad"
      />

      <Text style={styles.label}>Descripcion de tus servicios *</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        placeholder="Describe que servicios ofreces, tu experiencia y horarios..."
        placeholderTextColor="#adb5bd"
        value={descripcion}
        onChangeText={setDescripcion}
        multiline
        numberOfLines={4}
      />

      <Dropdown
        label="Departamento *"
        value={departamento}
        placeholder="Selecciona tu departamento"
        options={DEPARTAMENTOS}
        onSelect={setDepartamento}
      />

      <Text style={styles.label}>Municipio (opcional)</Text>
      <TextInput
        style={styles.input}
        placeholder="Municipio"
        placeholderTextColor="#adb5bd"
        value={municipio}
        onChangeText={setMunicipio}
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
        style={[styles.btnPrimary, loading && styles.btnDisabled, btnContinuar2Hovered && !loading && styles.btnPrimaryHovered]}
        onPress={handleStep2}
        disabled={loading}
        activeOpacity={0.82}
        {...webHover(() => setBtnContinuar2Hovered(true), () => setBtnContinuar2Hovered(false))}
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
      <Text style={styles.title}>PServicios</Text>
      <Text style={styles.subtitle}>Documentos de identidad</Text>

      <Text style={styles.cardDesc}>
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
            style={[styles.btnSecondary, uploading && styles.btnDisabled, btnUploadHovered && !uploading && styles.btnSecondaryHovered]}
            onPress={() => fileInputRef.current?.click()}
            disabled={uploading}
            activeOpacity={0.7}
            {...webHover(() => setBtnUploadHovered(true), () => setBtnUploadHovered(false))}
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

      <TouchableOpacity
        style={[styles.btnPrimary, btnFinishHovered && styles.btnPrimaryHovered]}
        onPress={handleFinish}
        activeOpacity={0.82}
        {...webHover(() => setBtnFinishHovered(true), () => setBtnFinishHovered(false))}
      >
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
    <ScrollView
      contentContainerStyle={[
        styles.container,
        Platform.OS === 'web' && { background: 'linear-gradient(236deg, rgba(26, 115, 232, 1) 0%, rgba(245, 245, 245, 1) 100%)' },
      ]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
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
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    paddingTop: 40,
    paddingBottom: 40,
    backgroundColor: '#e3f2fd',
  },

  // Step indicator
  stepRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-start',
    marginBottom: 24,
    paddingHorizontal: 10,
    position: 'relative',
    width: '100%',
    maxWidth: 560,
  },
  stepItem: { alignItems: 'center', width: 80 },
  stepCircle: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#d9e2ef',
    alignItems: 'center', justifyContent: 'center', zIndex: 1,
  },
  stepCircleActive: { backgroundColor: '#1a73e8' },
  stepCircleCurrent: { borderWidth: 3, borderColor: '#91b8f3' },
  stepNum: { fontSize: 14, fontWeight: '700', color: '#999' },
  stepNumActive: { color: '#fff' },
  stepCheck: { fontSize: 13, color: '#fff', fontWeight: '700' },
  stepLabel: { fontSize: 11, color: '#999', marginTop: 5, textAlign: 'center' },
  stepLabelActive: { color: '#fff', fontWeight: '600' },
  stepLine: {
    position: 'absolute', top: 17, height: 2, width: 60, backgroundColor: '#d9e2ef',
  },
  stepLine1: { left: '26%' },
  stepLine2: { right: '26%' },
  stepLineActive: { backgroundColor: '#1a73e8' },

  // Card
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 32,
    width: '100%',
    maxWidth: 560,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1557b0',
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  cardDesc: {
    fontSize: 13,
    color: '#777',
    marginBottom: 18,
    lineHeight: 18,
  },

  // Error
  errorBox: {
    backgroundColor: '#fff5f5',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 13,
    color: '#dc2626',
  },

  // Inputs
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#444',
    marginBottom: 6,
    marginTop: 4,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d9e2ef',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    marginBottom: 14,
    color: '#333',
    outlineStyle: 'none',
  },
  inputFocused: {
    borderColor: '#111',
    borderWidth: 1.5,
  },
  textArea: {
    height: 110,
    textAlignVertical: 'top',
  },
  passwordWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d9e2ef',
    borderRadius: 8,
    marginBottom: 14,
    overflow: 'hidden',
  },
  passwordInput: {
    flex: 1,
    padding: 12,
    fontSize: 14,
    color: '#333',
    outlineStyle: 'none',
  },
  eyeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderLeftWidth: 1,
    borderLeftColor: '#d9e2ef',
    backgroundColor: '#f7f9fc',
  },
  eyeIcon: {
    fontSize: 12,
    color: '#888',
  },

  // Role selector
  roleRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 18,
    marginTop: 4,
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
  roleBtnHovered: {
    backgroundColor: '#e3f2fd',
    borderColor: '#1a73e8',
  },
  roleText: { fontSize: 14, fontWeight: '700', color: '#555' },
  roleTextActive: { color: '#fff' },
  roleSub: { fontSize: 11, color: '#999', marginTop: 2 },
  roleSubActive: { color: 'rgba(255,255,255,0.8)' },

  // Botones
  btnPrimary: {
    backgroundColor: '#1a73e8',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 6,
    marginBottom: 12,
  },
  btnPrimaryHovered: {
    backgroundColor: '#1557b0',
  },
  btnDisabled: { backgroundColor: '#91b8f3' },
  btnPrimaryText: { color: '#fff', fontSize: 15, fontWeight: '600' },

  btnSecondary: {
    borderWidth: 1,
    borderColor: '#d9e2ef',
    borderRadius: 8,
    padding: 13,
    alignItems: 'center',
    marginBottom: 10,
    backgroundColor: '#fff',
  },
  btnSecondaryHovered: {
    backgroundColor: '#e3f2fd',
    borderColor: '#1a73e8',
  },
  btnSecondaryText: {
    color: '#333',
    fontSize: 14,
    fontWeight: '500',
  },

  // Divider
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
    gap: 10,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e5e7eb',
  },
  dividerText: {
    fontSize: 12,
    color: '#9ca3af',
    fontWeight: '500',
  },

  // Info box
  infoBox: {
    backgroundColor: '#e3f2fd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  infoText: { fontSize: 13, color: '#1a73e8', lineHeight: 18 },

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
  uploadNoteText: { fontSize: 13, color: '#adb5bd' },

  // Docs list
  docsList: {
    borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10,
    padding: 12, marginBottom: 16,
  },
  docsListTitle: { fontSize: 13, fontWeight: '700', color: '#444', marginBottom: 8 },
  docRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#f5f5f5', gap: 8,
  },
  docName: { flex: 1, fontSize: 13, color: '#555' },
  docBadge: { backgroundColor: '#fff3cd', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  docBadgeText: { fontSize: 11, color: '#856404', fontWeight: '600' },

  skipText: { color: '#999', textAlign: 'center', fontSize: 13, marginTop: 4 },
});