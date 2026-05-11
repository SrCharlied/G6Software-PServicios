import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { getSolicitudesEnviadas, getSolicitudesRecibidas } from '../services/api';
import { useToast } from '../context/ToastContext';
import { T } from '../theme';

const tabs = [
  { key: 'enviadas', label: 'Enviadas' },
  { key: 'recibidas', label: 'Recibidas' },
];

const ESTADOS_CON_CODIGO = new Set(['pendiente', 'aceptado']);

export default function SolicitudesScreen({ navigation, user }) {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState('enviadas');
  const [enviadas, setEnviadas] = useState([]);
  const [recibidas, setRecibidas] = useState([]);
  const [loading, setLoading] = useState(true);

  const canSeeRecibidas = user?.role === 'proveedor';

  const fetchSolicitudes = useCallback(async () => {
    setLoading(true);
    try {
      const enviadasData = await getSolicitudesEnviadas();
      setEnviadas(enviadasData.solicitudes || []);

      if (canSeeRecibidas) {
        const recibidasData = await getSolicitudesRecibidas();
        setRecibidas(recibidasData.solicitudes || []);
      } else {
        setRecibidas([]);
      }
    } catch (error) {
      toast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [canSeeRecibidas, toast]);

  useEffect(() => {
    fetchSolicitudes();
  }, [fetchSolicitudes]);

  const solicitudes = useMemo(
    () => (activeTab === 'enviadas' ? enviadas : recibidas),
    [activeTab, enviadas, recibidas]
  );

  const formatDate = (value) => {
    if (!value) return '';
    try {
      return new Date(value).toLocaleDateString('es-GT', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return '';
    }
  };

  const renderSolicitud = ({ item }) => {
    const persona = activeTab === 'enviadas'
      ? item.proveedor?.nombre || 'Proveedor'
      : item.cliente?.name || 'Cliente';

    const mostrarCodigo = activeTab === 'enviadas'
      && item.codigo_inicio
      && ESTADOS_CON_CODIGO.has(item.estado);

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.persona} numberOfLines={1}>{persona}</Text>
          <Text style={styles.estado}>{item.estado || 'pendiente'}</Text>
        </View>
        <Text style={styles.descripcion}>{item.descripcion}</Text>
        <View style={styles.metaRow}>
          <Text style={styles.metaText}>
            {item.categoria?.nombre || item.proveedor?.categoria?.nombre || 'Sin categoria'}
          </Text>
          <Text style={styles.metaText}>{formatDate(item.created_at)}</Text>
        </View>

        {mostrarCodigo ? (
          <View style={styles.codigoBox}>
            <Text style={styles.codigoLabel}>Codigo de inicio</Text>
            <Text style={styles.codigoValue}>{item.codigo_inicio}</Text>
            <Text style={styles.codigoHint}>
              Compartelo con el proveedor cuando llegue para iniciar el servicio.
            </Text>
          </View>
        ) : null}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.navigate('Home')}>
          <Text style={styles.backBtnText}>Volver</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Solicitudes</Text>
        <TouchableOpacity style={styles.refreshBtn} onPress={fetchSolicitudes}>
          <Text style={styles.refreshText}>Actualizar</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.tabs}>
        {tabs.map((tab) => {
          const disabled = tab.key === 'recibidas' && !canSeeRecibidas;
          const active = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tabBtn, active && styles.tabBtnActive, disabled && styles.tabBtnDisabled]}
              disabled={disabled}
              onPress={() => setActiveTab(tab.key)}
            >
              <Text style={[styles.tabText, active && styles.tabTextActive, disabled && styles.tabTextDisabled]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {loading && solicitudes.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#4589d4" />
          <Text style={styles.loadingText}>Cargando solicitudes...</Text>
        </View>
      ) : (
        <FlatList
          data={solicitudes}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderSolicitud}
          contentContainerStyle={styles.listContent}
          refreshing={loading}
          onRefresh={fetchSolicitudes}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>
                {activeTab === 'enviadas' ? 'No has enviado solicitudes' : 'No tienes solicitudes recibidas'}
              </Text>
              <Text style={styles.emptyText}>
                {activeTab === 'enviadas'
                  ? 'Cuando solicites un servicio, aparecera aqui.'
                  : 'Las solicitudes de clientes apareceran aqui.'}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.canvas },
  header: {
    backgroundColor: T.paper,
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#e8ecf1',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  backBtn: { paddingVertical: 8, paddingRight: 8 },
  backBtnText: { color: '#4589d4', fontSize: 14, fontWeight: '700' },
  title: { flex: 1, fontSize: 20, fontWeight: '800', color: T.ink, textAlign: 'center' },
  refreshBtn: { paddingVertical: 8, paddingLeft: 8 },
  refreshText: { color: '#4589d4', fontSize: 14, fontWeight: '700' },
  tabs: {
    flexDirection: 'row',
    gap: 8,
    padding: 16,
    backgroundColor: T.canvas,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#cfd8e3',
    backgroundColor: T.paper,
    alignItems: 'center',
  },
  tabBtnActive: { backgroundColor: '#4589d4', borderColor: '#4589d4' },
  tabBtnDisabled: { opacity: 0.5 },
  tabText: { color: '#526071', fontSize: 14, fontWeight: '700' },
  tabTextActive: { color: '#fff' },
  tabTextDisabled: { color: '#8c96a3' },
  listContent: { padding: 16, paddingTop: 0, paddingBottom: 32 },
  card: {
    backgroundColor: T.paper,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  persona: { flex: 1, fontSize: 16, fontWeight: '800', color: T.ink },
  estado: {
    backgroundColor: '#eef4ff',
    color: '#356fae',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
    overflow: 'hidden',
    fontSize: 12,
    fontWeight: '700',
  },
  descripcion: { marginTop: 10, fontSize: 14, lineHeight: 20, color: '#526071' },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, marginTop: 12 },
  metaText: { fontSize: 12, color: '#8c96a3', fontWeight: '600' },
  codigoBox: {
    marginTop: 14,
    backgroundColor: '#e3f0ff',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
  },
  codigoLabel: { fontSize: 12, color: '#1858a6', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6 },
  codigoValue: { fontSize: 30, fontWeight: '800', color: '#0e1424', letterSpacing: 6, marginTop: 4 },
  codigoHint:  { fontSize: 11, color: '#1858a6', marginTop: 6, textAlign: 'center' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  loadingText: { marginTop: 12, color: '#667085' },
  emptyState: { alignItems: 'center', paddingVertical: 64, paddingHorizontal: 24 },
  emptyTitle: { fontSize: 17, fontWeight: '800', color: T.ink, marginBottom: 8, textAlign: 'center' },
  emptyText: { fontSize: 14, color: '#667085', textAlign: 'center', lineHeight: 20 },
});
