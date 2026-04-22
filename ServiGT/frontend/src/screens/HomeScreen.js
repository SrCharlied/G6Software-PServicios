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

export default function HomeScreen({
  user,
  providers,
  loading,
  notice,
  categoria,
  categoriaAplicada,
  searchQuery,
  hasActiveFilters,
  onCategoriaChange,
  onCategoriaSubmit,
  onCategoriaClear,
  onSearchChange,
  onRetry,
  onLogout,
  onNavigate,
  categoriaQuery,
  normalizedQuery,
  filteredProviders,
}) {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />

      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.headerTitle}>ServiGT</Text>
            <Text style={styles.headerSubtitle}>Conectando servicios en Guatemala</Text>
          </View>
          {user ? (
            <View style={styles.headerUserRow}>
              <Text style={styles.headerUserName}>{user.name}</Text>
              {user.role === 'proveedor' ? (
                <TouchableOpacity
                  style={styles.headerBtn}
                  onPress={() => onNavigate('ProviderDashboard')}
                >
                  <Text style={styles.headerBtnText}>Mi panel</Text>
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity style={styles.headerBtnSmall} onPress={onLogout}>
                <Text style={styles.headerBtnSmallText}>Salir</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.headerButtons}>
              <TouchableOpacity style={styles.headerBtn} onPress={() => onNavigate('Login')}>
                <Text style={styles.headerBtnText}>Iniciar sesion</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.headerBtn, styles.headerBtnOutline]}
                onPress={() => onNavigate('Register')}
              >
                <Text style={[styles.headerBtnText, styles.headerBtnOutlineText]}>Registro</Text>
              </TouchableOpacity>
            </View>
          )}
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
        ) : providers.length === 0 && !hasActiveFilters ? (
          <View style={styles.center}>
            <Text style={styles.emptyText}>No hay proveedores disponibles todavia.</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={onRetry}>
              <Text style={styles.retryText}>Actualizar</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={styles.searchCard}>
              <Text style={styles.searchLabel}>Buscar proveedores</Text>
              <Text style={styles.inputLabel}>Categoria</Text>
              <TextInput
                style={styles.searchInput}
                placeholder="Ej. Plomeria, electricidad, limpieza"
                placeholderTextColor="#8a94a6"
                value={categoria}
                onChangeText={onCategoriaChange}
                onSubmitEditing={onCategoriaSubmit}
                returnKeyType="search"
              />
              <Text style={[styles.inputLabel, styles.inputLabelSpaced]}>Nombre o texto</Text>
              <TextInput
                style={styles.searchInput}
                placeholder="Nombre, categoria, ubicacion o servicio"
                placeholderTextColor="#8a94a6"
                value={searchQuery}
                onChangeText={onSearchChange}
              />
              <View style={styles.searchMetaRow}>
                <Text style={styles.searchMetaText}>
                  {normalizedQuery
                    ? `${filteredProviders.length} resultado(s) de ${providers.length}`
                    : `${providers.length} proveedor(es) disponibles`}
                </Text>
                {searchQuery.trim() ? (
                  <TouchableOpacity onPress={() => onSearchChange('')}>
                    <Text style={styles.clearSearchText}>Limpiar</Text>
                  </TouchableOpacity>
                ) : null}
                {categoriaAplicada.trim() ? (
                  <TouchableOpacity onPress={onCategoriaClear}>
                    <Text style={styles.clearSearchText}>Limpiar categoria</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>

            <Text style={styles.sectionTitle}>
              {categoriaQuery
                ? `Categoria: "${categoriaQuery}"`
                : normalizedQuery
                ? `Resultados para "${searchQuery.trim()}"`
                : `Proveedores (${providers.length})`}
            </Text>

            {filteredProviders.length === 0 ? (
              <View style={styles.center}>
                <Text style={styles.emptyText}>No encontramos proveedores con esa busqueda.</Text>
                <TouchableOpacity
                  style={styles.retryBtn}
                  onPress={() => {
                    onSearchChange('');
                    onCategoriaClear();
                  }}
                >
                  <Text style={styles.retryText}>Ver todos</Text>
                </TouchableOpacity>
              </View>
            ) : (
              filteredProviders.map((provider) => (
                <TouchableOpacity
                  key={provider.id}
                  style={styles.provCard}
                  activeOpacity={0.9}
                  onPress={() => onNavigate('ProviderDetail', { provider })}
                >
                  <View style={styles.provHeader}>
                    <Text style={styles.provName}>{provider.nombre}</Text>
                    <View style={styles.provBadge}>
                      <Text style={styles.provBadgeText}>
                        {provider.categoria?.nombre || 'Sin categoria'}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.provDesc}>{provider.descripcion}</Text>
                  <View style={styles.provMeta}>
                    <Text style={styles.provLocation}>
                      {provider.municipio}, {provider.departamento}
                    </Text>
                    <Text style={styles.provPhone}>{provider.telefono}</Text>
                  </View>
                  <View style={styles.cardFooter}>
                    <Text style={styles.cardFooterText}>Ver perfil y disponibilidad</Text>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </>
        )}

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            ServiGT Guatemala - Grupo 6 - Ingenieria de Software
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  center: { padding: 40, alignItems: 'center' },
  loadingText: { marginTop: 16, fontSize: 16, color: '#666' },
  emptyText: { fontSize: 16, color: '#666', textAlign: 'center', marginBottom: 20 },
  noticeBox: {
    backgroundColor: '#fff7e6',
    borderWidth: 1,
    borderColor: '#f0c36d',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  noticeText: { color: '#8a5a00', fontSize: 14, lineHeight: 20 },
  retryBtn: {
    backgroundColor: '#1a73e8',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  header: { backgroundColor: '#1a73e8', paddingTop: 20, paddingBottom: 20, paddingHorizontal: 20 },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    flexWrap: 'wrap',
    gap: 12,
  },
  headerTitle: { fontSize: 28, fontWeight: 'bold', color: '#fff' },
  headerSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  headerButtons: { flexDirection: 'row', gap: 10 },
  headerBtn: { backgroundColor: '#fff', paddingHorizontal: 20, paddingVertical: 8, borderRadius: 6 },
  headerBtnText: { color: '#1a73e8', fontWeight: '600', fontSize: 14 },
  headerBtnOutline: { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#fff' },
  headerBtnOutlineText: { color: '#fff' },
  headerUserRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerUserName: { color: '#fff', fontWeight: '600', fontSize: 14 },
  headerBtnSmall: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  headerBtnSmallText: { color: '#fff', fontSize: 13 },
  content: { flex: 1, padding: 16 },
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
  searchLabel: { fontSize: 15, fontWeight: '700', color: '#333', marginBottom: 10 },
  inputLabel: { fontSize: 13, fontWeight: '600', color: '#667085', marginBottom: 6 },
  inputLabelSpaced: { marginTop: 12 },
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
    flexWrap: 'wrap',
    gap: 10,
  },
  searchMetaText: { fontSize: 13, color: '#667085' },
  clearSearchText: { fontSize: 13, color: '#1a73e8', fontWeight: '700' },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#333', marginBottom: 12 },
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
    gap: 8,
  },
  provName: { fontSize: 16, fontWeight: '700', color: '#333', flex: 1 },
  provBadge: { backgroundColor: '#e3f2fd', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  provBadgeText: { fontSize: 12, color: '#1a73e8', fontWeight: '600' },
  provDesc: { fontSize: 14, color: '#666', lineHeight: 20, marginBottom: 8 },
  provMeta: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  provLocation: { fontSize: 13, color: '#999', flex: 1 },
  provPhone: { fontSize: 13, color: '#1a73e8', fontWeight: '600' },
  cardFooter: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#eef2f7',
  },
  cardFooterText: { fontSize: 13, color: '#1a73e8', fontWeight: '700' },
  footer: { paddingVertical: 24, alignItems: 'center' },
  footerText: { fontSize: 12, color: '#999' },
});
