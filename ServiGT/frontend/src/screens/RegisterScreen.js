import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { register } from '../services/api';

export default function RegisterScreen({ navigation }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('cliente');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!name || !email || !password) {
      Alert.alert('Error', 'Completa todos los campos');
      return;
    }

    setLoading(true);
    try {
      const data = await register(name, email, password, role);
      console.log('Registro exitoso:', data);
      Alert.alert('Registro exitoso', `Bienvenido ${data.user.name}`, [
        { text: 'Ir a Login', onPress: () => navigation?.navigate('Login') },
      ]);
    } catch (error) {
      console.log('Error registro:', error.message);
      Alert.alert('Registro no disponible', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>PServicios</Text>
      <Text style={styles.subtitle}>Crear Cuenta</Text>
      <Text style={styles.helperText}>
        Esta pantalla queda lista para UI y flujo basico, aunque el guardado real aun no dependa de base de datos.
      </Text>

      <TextInput
        style={styles.input}
        placeholder="Nombre completo"
        value={name}
        onChangeText={setName}
      />

      <TextInput
        style={styles.input}
        placeholder="Correo electronico"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <TextInput
        style={styles.input}
        placeholder="Contrasena"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <Text style={styles.roleLabel}>Tipo de cuenta:</Text>
      <View style={styles.roleRow}>
        <TouchableOpacity
          style={[styles.roleBtn, role === 'cliente' && styles.roleBtnActive]}
          onPress={() => setRole('cliente')}
        >
          <Text style={[styles.roleText, role === 'cliente' && styles.roleTextActive]}>Cliente</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.roleBtn, role === 'proveedor' && styles.roleBtnActive]}
          onPress={() => setRole('proveedor')}
        >
          <Text style={[styles.roleText, role === 'proveedor' && styles.roleTextActive]}>Proveedor</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.button} onPress={handleRegister} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Registrarse</Text>}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation?.navigate('Login')}>
        <Text style={styles.link}>Ya tienes cuenta? Inicia sesion</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    marginBottom: 12,
    marginTop: 4,
  },
  helperText: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 18,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
    marginBottom: 12,
  },
  roleLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  roleRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  roleBtn: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  roleBtnActive: {
    backgroundColor: '#1a73e8',
    borderColor: '#1a73e8',
  },
  roleText: {
    fontSize: 14,
    color: '#666',
  },
  roleTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  button: {
    backgroundColor: '#1a73e8',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  link: {
    color: '#1a73e8',
    textAlign: 'center',
    marginTop: 16,
    fontSize: 14,
  },
});
