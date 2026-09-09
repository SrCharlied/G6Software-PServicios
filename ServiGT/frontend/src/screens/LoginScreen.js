import { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { login, getMiProveedor } from '../services/api';
import { useToast } from '../context/ToastContext';
import { validateEmail } from '../utils/validation';
import ServiGTLogo from '../components/ServiGTLogo';
import { T } from '../theme';
import { Button, Card, Input } from '../components/ui';

export default function LoginScreen({ navigation, onLogin }) {
  const { width } = useWindowDimensions();
  const compact = width < 760;
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
          const profileData = await getMiProveedor();
          providerProfile = profileData.proveedor;
        } catch {
          // Aun no tiene perfil de proveedor creado.
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
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <View style={[styles.shell, compact && styles.shellCompact]}>
        {!compact ? (
          <View style={styles.brandPanel}>
            <ServiGTLogo size={30} mode="light" />
            <View>
              <Text style={styles.brandTitle}>Bienvenido de vuelta</Text>
              <Text style={styles.brandText}>
                Gestiona servicios, solicitudes y proveedores reales desde tu cuenta de ServiGT.
              </Text>
            </View>
            <View style={styles.brandStats}>
              <View>
                <Text style={styles.brandStatValue}>GT</Text>
                <Text style={styles.brandStatLabel}>Marketplace local</Text>
              </View>
              <View>
                <Text style={styles.brandStatValue}>24/7</Text>
                <Text style={styles.brandStatLabel}>Solicitudes activas</Text>
              </View>
            </View>
          </View>
        ) : null}

        <View style={styles.formPanel}>
          <View style={styles.logoWrap}><ServiGTLogo size={28} mode="dark" /></View>
          <Text style={styles.title}>Iniciar sesion</Text>
          <Text style={styles.subtitle}>Ingresa con tu cuenta de ServiGT</Text>

          <Card padding={20} style={styles.form}>
            <Text style={styles.label}>Correo electronico</Text>
            <Input
              icon="mail"
              placeholder="correo@ejemplo.com"
              value={email}
              onChangeText={(v) => { setEmail(v); setErrors((e) => ({ ...e, email: null })); }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              error={errors.email}
              style={styles.field}
            />

            <Text style={styles.label}>Contrasena</Text>
            <Input
              icon="lock"
              placeholder="Contrasena"
              value={password}
              onChangeText={(v) => { setPassword(v); setErrors((e) => ({ ...e, password: null })); }}
              secureTextEntry
              error={errors.password}
              style={styles.field}
            />

            <Button
              full
              size="lg"
              loading={loading}
              onPress={handleLogin}
            >
              Ingresar
            </Button>
          </Card>

          <TouchableOpacity onPress={() => navigation?.navigate('Register')}>
            <Text style={styles.link}>No tienes cuenta? Registrate</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation?.navigate('Home')}>
            <Text style={styles.linkSecondary}>Volver al inicio</Text>
          </TouchableOpacity>
        </View>
      </View>
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
  shell: {
    width: '100%',
    maxWidth: 980,
    minHeight: 560,
    alignSelf: 'center',
    flexDirection: 'row',
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: T.border,
    backgroundColor: T.paper,
    ...T.sh2,
  },
  shellCompact: {
    maxWidth: 440,
    minHeight: 0,
  },
  brandPanel: {
    flex: 1,
    padding: 42,
    justifyContent: 'space-between',
    backgroundColor: T.deep,
  },
  brandTitle: {
    color: T.white,
    fontSize: 38,
    lineHeight: 43,
    fontWeight: '900',
  },
  brandText: {
    color: 'rgba(255,255,255,0.86)',
    fontSize: 16,
    lineHeight: 24,
    marginTop: 12,
    maxWidth: 390,
  },
  brandStats: {
    flexDirection: 'row',
    gap: 26,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.18)',
    paddingTop: 22,
  },
  brandStatValue: { color: T.white, fontSize: 24, fontWeight: '900' },
  brandStatLabel: { color: 'rgba(255,255,255,0.74)', fontSize: 12, marginTop: 2 },
  formPanel: {
    flex: 1,
    padding: 34,
    justifyContent: 'center',
  },
  logoWrap: {
    alignItems: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: T.ink,
  },
  subtitle: {
    fontSize: 14,
    color: T.muted,
    marginTop: 6,
    marginBottom: 24,
  },
  form: {
    marginBottom: 18,
  },
  label: {
    color: T.ink,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 6,
  },
  field: { marginBottom: 14 },
  link: {
    color: T.blue,
    textAlign: 'center',
    marginBottom: 10,
    fontSize: 14,
    fontWeight: '700',
  },
  linkSecondary: {
    color: T.faint,
    textAlign: 'center',
    fontSize: 14,
  },
});
