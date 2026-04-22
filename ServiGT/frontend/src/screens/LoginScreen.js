import { useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { login, getProviderByUser } from '../services/api';

const webHover = (onEnter, onLeave) =>
  Platform.OS === 'web' ? { onMouseEnter: onEnter, onMouseLeave: onLeave } : {};

export default function LoginScreen({ navigation, onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [btnHovered, setBtnHovered] = useState(false);
  const [btn2Hovered, setBtn2Hovered] = useState(false);
  const [btn3Hovered, setBtn3Hovered] = useState(false);

  const handleLogin = async () => {
    setErrorMsg('');
    if (!email.trim() && !password) {
      setErrorMsg('Ingresa tu correo y contrasena.');
      return;
    }
    if (!email.trim()) {
      setErrorMsg('Ingresa tu correo electronico.');
      return;
    }
    if (!password) {
      setErrorMsg('Ingresa tu contrasena.');
      return;
    }

    setLoading(true);
    try {
      const data = await login(email.trim(), password);
      const user = data.user;

      let providerProfile = null;
      if (user.role === 'proveedor') {
        try {
          const profileData = await getProviderByUser(user.id);
          providerProfile = profileData.proveedor;
        } catch {
          // Aun no tiene perfil de proveedor creado
        }
      }

      if (onLogin) onLogin(user, providerProfile);
    } catch (error) {
      setErrorMsg(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={[styles.container, Platform.OS === 'web' && { background: 'linear-gradient(236deg, rgba(26, 115, 232, 1) 0%, rgba(245, 245, 245, 1) 100%)' }]}>      <View style={styles.card}>
      <Text style={styles.title}>PServicios</Text>
      <Text style={styles.subtitle}>Iniciar sesion</Text>

      {errorMsg ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>⚠ {errorMsg}</Text>
        </View>
      ) : null}

      <Text style={styles.label}>Correo electronico</Text>
      <TextInput
        style={[styles.input, emailFocused && styles.inputFocused]}
        placeholder="correo@ejemplo.com"
        placeholderTextColor="#adb5bd"
        value={email}
        onChangeText={(t) => { setEmail(t); setErrorMsg(''); }}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        onFocus={() => setEmailFocused(true)}
        onBlur={() => setEmailFocused(false)}
      />

      <Text style={styles.label}>Contrasena</Text>
      <View style={[styles.passwordWrap, passwordFocused && styles.inputFocused]}>
        <TextInput
          style={styles.passwordInput}
          placeholder="Ingresa tu contrasena"
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

      <TouchableOpacity
        style={[styles.button, btnHovered && styles.buttonHovered, loading && styles.buttonDisabled]}
        onPress={handleLogin}
        disabled={loading}
        activeOpacity={0.82}
        {...webHover(() => setBtnHovered(true), () => setBtnHovered(false))}
      >
        {loading
          ? <ActivityIndicator color="#fff" />
          : <Text style={styles.buttonText}>Ingresar</Text>}
      </TouchableOpacity>

      <View style={styles.divider}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>O</Text>
        <View style={styles.dividerLine} />
      </View>

      <TouchableOpacity
        style={[styles.btnSecondary, btn2Hovered && styles.btnSecondaryHovered]}
        onPress={() => navigation?.navigate('Register')}
        activeOpacity={0.7}
        {...webHover(() => setBtn2Hovered(true), () => setBtn2Hovered(false))}
      >
        <Text style={styles.btnSecondaryText}>No tienes cuenta? Registrate</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.btnTertiary}
        onPress={() => navigation?.navigate('Home')}
        activeOpacity={0.7}
        {...webHover(() => setBtn3Hovered(true), () => setBtn3Hovered(false))}
      >
        <Text style={[styles.btnTertiaryText, btn3Hovered && styles.btnTertiaryTextHovered]}>
          Volver al inicio
        </Text>
      </TouchableOpacity>
    </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#e3f2fd',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 32,
    width: '100%',
    maxWidth: 420,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  title: {
    fontSize: 30,
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
  passwordWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d9e2ef',
    borderRadius: 8,
    marginBottom: 20,
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
  button: {
    backgroundColor: '#1a73e8',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonHovered: {
    backgroundColor: '#1557b0',
  },
  buttonDisabled: {
    backgroundColor: '#91b8f3',
  },
  buttonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
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
  btnTertiary: {
    padding: 8,
    alignItems: 'center',
  },
  btnTertiaryText: {
    color: '#999',
    fontSize: 13,
  },
  btnTertiaryTextHovered: {
    color: '#1a73e8',
  },
});