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
      <Text style={styles.title}>PServicios</Text>
      <Text style={styles.subtitle}>Iniciar sesion</Text>

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
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1a73e8',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 32,
  },
  form: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
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
  button: {
    backgroundColor: '#1a73e8',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 4,
  },
  buttonDisabled: {
    backgroundColor: '#91b8f3',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  link: {
    color: '#1a73e8',
    textAlign: 'center',
    marginBottom: 10,
    fontSize: 14,
  },
  linkSecondary: {
    color: '#999',
    textAlign: 'center',
    fontSize: 14,
  },
});
