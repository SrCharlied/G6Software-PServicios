import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { registerRootComponent } from 'expo';
import { mockProviders } from './data/mockProviders';
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import { getProviders } from './services/api';

const normalizeText = (value) =>
  (value || '')
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

export default function App() {
  const [screen, setScreen] = useState('home');
  const [proveedores, setProveedores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadProviders();
  }, []);

  const loadProviders = async () => {
    setLoading(true);
    setNotice('');

    try {
      const data = await getProviders();
      setProveedores(data.proveedores || []);
    } catch (error) {
      setProveedores(mockProviders);
      setNotice('Modo demo activo: mostrando proveedores de ejemplo mientras se define el backend y la base de datos.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const navigation = {
    navigate: (name) => setScreen(name.toLowerCase()),
  };

  const normalizedQuery = normalizeText(searchQuery.trim());

  const filteredProviders = proveedores.filter((prov) => {
    if (!normalizedQuery) {
      return true;
    }

    const searchableFields = [
      prov.nombre,
      prov.descripcion,
      prov.departamento,
      prov.municipio,
      prov.telefono,
      prov.categoria?.nombre,
    ];

    return searchableFields.some((field) => normalizeText(field).includes(normalizedQuery));
  });

  if (screen === 'login') {
    return <LoginScreen navigation={{ ...navigation, navigate: (name) => setScreen(name.toLowerCase()) }} />;
  }

  if (screen === 'register') {
    return <RegisterScreen navigation={{ ...navigation, navigate: (name) => setScreen(name.toLowerCase()) }} />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />

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
        {notice ? (
          <View style={styles.noticeBox}>
            <Text style={styles.noticeText}>{notice}</Text>
          </View>
        ) : null}

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#1a73e8" />
            <Text style={styles.loadingText}>Cargando proveedores...</Text>
          </View>
        ) : proveedores.length === 0 ? (
          <View style={styles.center}>
            <Text style={styles.emptyText}>No hay proveedores disponibles todavia.</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={loadProviders}>
              <Text style={styles.retryText}>Actualizar</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={styles.searchCard}>
              <Text style={styles.searchLabel}>Buscar proveedores</Text>
              <TextInput
                style={styles.searchInput}
                placeholder="Nombre, categoria, ubicacion o servicio"
                placeholderTextColor="#8a94a6"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              <View style={styles.searchMetaRow}>
                <Text style={styles.searchMetaText}>
                  {normalizedQuery
                    ? `${filteredProviders.length} resultado(s) de ${proveedores.length}`
                    : `${proveedores.length} proveedor(es) disponibles`}
                </Text>
                {searchQuery.trim() ? (
                  <TouchableOpacity onPress={() => setSearchQuery('')}>
                    <Text style={styles.clearSearchText}>Limpiar</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>

            <Text style={styles.sectionTitle}>
              {normalizedQuery
                ? `Resultados para "${searchQuery.trim()}"`
                : `Proveedores (${proveedores.length})`}
            </Text>

            {filteredProviders.length === 0 ? (
              <View style={styles.center}>
                <Text style={styles.emptyText}>No encontramos proveedores con esa busqueda.</Text>
                <TouchableOpacity style={styles.retryBtn} onPress={() => setSearchQuery('')}>
                  <Text style={styles.retryText}>Ver todos</Text>
                </TouchableOpacity>
              </View>
            ) : (
              filteredProviders.map((prov) => (
                <View key={prov.id} style={styles.provCard}>
                  <View style={styles.provHeader}>
                    <Text style={styles.provName}>{prov.nombre}</Text>
                    <View style={styles.provBadge}>
                      <Text style={styles.provBadgeText}>{prov.categoria?.nombre || 'Sin categoria'}</Text>
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
              ))
            )}
          </>
        )}

        <View style={styles.footer}>
          <Text style={styles.footerText}>PServicios Guatemala - Grupo 6 - Ingenieria de Software</Text>
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
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  noticeBox: {
    backgroundColor: '#fff7e6',
    borderWidth: 1,
    borderColor: '#f0c36d',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  noticeText: {
    color: '#8a5a00',
    fontSize: 14,
    lineHeight: 20,
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
  searchCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  searchLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#333',
    marginBottom: 10,
  },
  searchInput: {
    backgroundColor: '#f7f9fc',
    borderWidth: 1,
    borderColor: '#d9e2ef',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#333',
  },
  searchMetaRow: {
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  searchMetaText: {
    fontSize: 13,
    color: '#667085',
  },
  clearSearchText: {
    fontSize: 13,
    color: '#1a73e8',
    fontWeight: '700',
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
