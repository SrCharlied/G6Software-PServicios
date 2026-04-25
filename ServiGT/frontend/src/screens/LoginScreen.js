import { useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { login, getProviderByUser } from '../services/api';
import { useToast } from '../context/ToastContext';
import { validateEmail } from '../utils/validation';
import ServiGTLogo from '../components/ServiGTLogo';
import { T } from '../theme';

export default function LoginScreen({ navigation, onLogin }) {
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const handleLogin = async () => {
    const errs = {};
    if (!email.trim()) errs.email = 'Ingresa tu correo electronico.';
    else if (!validateEmail(email)) errs.email = 'El formato del correo no es valido.';
    if (!password) errs.password = 'Ingresa tu contrasena.';
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});

    setLoading(true);
    try {
      const data = await login(email.trim().toLowerCase(), password);
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
      toast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.logoWrap}><ServiGTLogo size={28} mode="dark" /></View>
      <Text style={styles.subtitle}>Iniciar sesión</Text>

      <View style={styles.form}>
        <Text style={styles.label}>Correo electronico</Text>
        <TextInput
          style={[styles.input, errors.email && styles.inputError]}
          placeholder="correo@ejemplo.com"
          value={email}
          onChangeText={(v) => { setEmail(v); setErrors((e) => ({ ...e, email: null })); }}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />
        {errors.email ? <Text style={styles.fieldError}>{errors.email}</Text> : null}

        <Text style={styles.label}>Contrasena</Text>
        <TextInput
          style={[styles.input, errors.password && styles.inputError]}
          placeholder="••••••••"
          value={password}
          onChangeText={(v) => { setPassword(v); setErrors((e) => ({ ...e, password: null })); }}
          secureTextEntry
        />
        {errors.password ? <Text style={styles.fieldError}>{errors.password}</Text> : null}

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.buttonText}>Ingresar</Text>}
        </TouchableOpacity>
      </View>

      <TouchableOpacity onPress={() => navigation?.navigate('Register')}>
        <Text style={styles.link}>No tienes cuenta? Registrate</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation?.navigate('Home')}>
        <Text style={styles.linkSecondary}>Volver al inicio</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: T.canvas,
  },
  logoWrap: {
    alignItems: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 17,
    color: T.muted,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 32,
    letterSpacing: 0.1,
  },
  form: {
    backgroundColor: T.paper,
    borderRadius: 14,
    padding: 20,
    marginBottom: 20,
    shadowColor: T.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 2,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: T.ink,
    marginBottom: 6,
    marginTop: 4,
  },
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
  inputError: {
    borderColor: T.danger,
    backgroundColor: '#fff5f5',
  },
  fieldError: {
    fontSize: 12,
    color: T.danger,
    marginBottom: 10,
    marginLeft: 2,
  },
  button: {
    backgroundColor: T.blue,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 4,
  },
  buttonDisabled: {
    backgroundColor: T.soft,
  },
  buttonText: {
    color: T.paper,
    fontSize: 16,
    fontWeight: '600',
  },
  link: {
    color: T.blue,
    textAlign: 'center',
    marginBottom: 10,
    fontSize: 14,
  },
  linkSecondary: {
    color: T.faint,
    textAlign: 'center',
    fontSize: 14,
  },
});
