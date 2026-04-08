import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { registerRootComponent } from 'expo';
import { getProviders } from './services/api';
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';

export default function App() {
  const [screen, setScreen] = useState('home');
  const [proveedores, setProveedores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadProviders();
  }, []);

  const loadProviders = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getProviders();
      setProveedores(data.proveedores || []);
    } catch (err) {
      setError('No se pudo conectar con el backend.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Navegación simple sin librerías externas
  const navigation = {
    navigate: (name) => setScreen(name.toLowerCase()),
  };

  if (screen === 'login') {
    return <LoginScreen navigation={{ ...navigation, navigate: (n) => setScreen(n.toLowerCase()) }} />;
  }

  if (screen === 'register') {
    return <RegisterScreen navigation={{ ...navigation, navigate: (n) => setScreen(n.toLowerCase()) }} />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>PServicios</Text>
        <Text style={styles.headerSubtitle}>Conectando servicios en Guatemala</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity style={styles.headerBtn} onPress={() => setScreen('login')}>
            <Text style={styles.headerBtnText}>Login</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.headerBtn, styles.headerBtnOutline]} onPress={() => setScreen('register')}>
            <Text style={[styles.headerBtnText, styles.headerBtnOutlineText]}>Registro</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content}>
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#1a73e8" />
            <Text style={styles.loadingText}>Conectando con PServicios...</Text>
          </View>
        ) : error ? (
          <View style={styles.center}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={loadProviders}>
              <Text style={styles.retryText}>Reintentar</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <Text style={styles.sectionTitle}>
              Proveedores ({proveedores.length})
            </Text>
            {proveedores.map((prov) => (
              <View key={prov.id} style={styles.provCard}>
                <View style={styles.provHeader}>
                  <Text style={styles.provName}>{prov.nombre}</Text>
                  <View style={styles.provBadge}>
                    <Text style={styles.provBadgeText}>
                      {prov.categoria?.nombre || 'Sin categoria'}
                    </Text>
                  </View>
                </View>
                <Text style={styles.provDesc}>{prov.descripcion}</Text>
                <View style={styles.provMeta}>
                  <Text style={styles.provLocation}>
                    {prov.municipio}, {prov.departamento}
                  </Text>
                  <Text style={styles.provPhone}>{prov.telefono}</Text>
                </View>
              </View>
            ))}
          </>
        )}

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            PServicios Guatemala - Grupo 6 - Ingenieria de Software
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  center: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryBtn: {
    backgroundColor: '#1a73e8',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    backgroundColor: '#1a73e8',
    paddingTop: 20,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  headerBtn: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 6,
  },
  headerBtnText: {
    color: '#1a73e8',
    fontWeight: '600',
    fontSize: 14,
  },
  headerBtnOutline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#fff',
  },
  headerBtnOutlineText: {
    color: '#fff',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 12,
  },
  provCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  provHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  provName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    flex: 1,
  },
  provBadge: {
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  provBadgeText: {
    fontSize: 12,
    color: '#1a73e8',
    fontWeight: '600',
  },
  provDesc: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 8,
  },
  provMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  provLocation: {
    fontSize: 13,
    color: '#999',
  },
  provPhone: {
    fontSize: 13,
    color: '#1a73e8',
    fontWeight: '600',
  },
  footer: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#999',
  },
});

registerRootComponent(App);
