import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import {
  confirmarFinServicio,
  getSolicitudesCliente,
  getSolicitudesProveedor,
} from '../services/api';
import { useToast } from '../context/ToastContext';
import { T } from '../theme';
import { Button, ScreenHeader } from '../components/ui';

const tabs = [
  { key: 'enviadas', label: 'Enviadas' },
  { key: 'recibidas', label: 'Recibidas' },
];

const ESTADOS_CON_CODIGO = new Set(['pendiente', 'aceptado']);

function StatusChip({ estado }) {
  const normalized = estado || 'pendiente';
  const cfg = {
    pendiente: { bg: '#fff7ed', fg: '#92400e', dot: '#f59e0b' },
    aceptado: { bg: '#eef4ff', fg: '#1b5499', dot: T.blue },
    en_progreso: { bg: '#eef4ff', fg: '#1b5499', dot: T.blue },
    por_confirmar: { bg: '#fef9c3', fg: '#713f12', dot: T.amber },
    completado: { bg: '#dcfce7', fg: '#166534', dot: T.success },
    cancelado: { bg: '#fef2f2', fg: '#991b1b', dot: T.danger },
    rechazado: { bg: '#fef2f2', fg: '#991b1b', dot: T.danger },
  }[normalized] || { bg: '#eef4ff', fg: '#1b5499', dot: T.blue };

  return (
    <View style={[styles.statusChip, { backgroundColor: cfg.bg }]}>
      <View style={[styles.statusDot, { backgroundColor: cfg.dot }]} />
      <Text style={[styles.statusText, { color: cfg.fg }]}>{normalized.replace('_', ' ')}</Text>
    </View>
  );
}

export default function SolicitudesScreen({ navigation, user }) {
  const toast = useToast();
  const { width } = useWindowDimensions();
  const wide = width >= 900;
  const [activeTab, setActiveTab] = useState('enviadas');
  const [enviadas, setEnviadas] = useState([]);
  const [recibidas, setRecibidas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [codigoFinInputs, setCodigoFinInputs] = useState({});
  const [codigoFinErrors, setCodigoFinErrors] = useState({});
  const [confirmandoId, setConfirmandoId] = useState(null);

  const canSeeRecibidas = user?.role === 'proveedor';

  const fetchSolicitudes = useCallback(async () => {
    setLoading(true);
    try {
      const enviadasData = await getSolicitudesCliente();
      setEnviadas(enviadasData.servicios || []);

      if (canSeeRecibidas) {
        const recibidasData = await getSolicitudesProveedor();
        setRecibidas(recibidasData.servicios || []);
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

  const handleConfirmarFin = async (servicioId) => {
    const codigo = (codigoFinInputs[servicioId] || '').trim();
    if (!/^\d{6}$/.test(codigo)) {
      setCodigoFinErrors((e) => ({ ...e, [servicioId]: 'El codigo debe tener 6 digitos.' }));
      return;
    }
    setCodigoFinErrors((e) => ({ ...e, [servicioId]: '' }));
    setConfirmandoId(servicioId);
    try {
      await confirmarFinServicio(servicioId, codigo);
      toast('Servicio confirmado. Ya puedes calificar al proveedor.', 'success');
      setCodigoFinInputs((i) => ({ ...i, [servicioId]: '' }));
      await fetchSolicitudes();
    } catch (error) {
      setCodigoFinErrors((e) => ({ ...e, [servicioId]: error.message }));
    } finally {
      setConfirmandoId(null);
    }
  };

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
    const categoria = item.categoria?.nombre || item.proveedor?.categoria?.nombre || 'Sin categoria';
    const monto = item.monto_acordado ?? item.monto ?? item.precio;

    const mostrarCodigo = activeTab === 'enviadas'
      && item.codigo_inicio
      && ESTADOS_CON_CODIGO.has(item.estado);

    const mostrarConfirmarFin = activeTab === 'enviadas'
      && item.estado === 'por_confirmar';

    const yaCalifico = (item.calificaciones || []).some(
      (cal) => Number(cal.autor_id) === Number(user?.id)
    );
    const puedeCalificar = activeTab === 'enviadas'
      && item.estado === 'completado'
      && !yaCalifico;

    return (
      <View style={[styles.card, wide && styles.cardWide]}>
        <View style={styles.cardHeader}>
          <View style={styles.cardIdentity}>
            <View style={styles.serviceIcon}>
              <Text style={styles.serviceIconText}>{categoria.charAt(0).toUpperCase()}</Text>
            </View>
            <View style={styles.personaBlock}>
              <Text style={styles.persona} numberOfLines={1}>{persona}</Text>
              <Text style={styles.categoryText} numberOfLines={1}>{categoria}</Text>
            </View>
          </View>
          <StatusChip estado={item.estado} />
        </View>
        <Text style={styles.descripcion}>{item.descripcion}</Text>
        <View style={styles.metaRow}>
          <Text style={styles.metaText}>{formatDate(item.created_at)}</Text>
          {monto != null ? <Text style={styles.amountText}>Q{Number(monto).toFixed(2)}</Text> : null}
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

        {mostrarConfirmarFin ? (
          <View style={styles.confirmFinBox}>
            <Text style={styles.confirmFinLabel}>Confirmar finalizacion</Text>
            <Text style={styles.confirmFinHint}>
              Pide al proveedor el codigo de 6 digitos para confirmar que el trabajo esta bien hecho.
            </Text>
            <TextInput
              style={[
                styles.confirmFinInput,
                codigoFinErrors[item.id] && styles.confirmFinInputError,
              ]}
              placeholder="000000"
              placeholderTextColor="#b9c2cc"
              keyboardType="number-pad"
              maxLength={6}
              value={codigoFinInputs[item.id] || ''}
              onChangeText={(v) => {
                const clean = v.replace(/\D/g, '').slice(0, 6);
                setCodigoFinInputs((s) => ({ ...s, [item.id]: clean }));
                setCodigoFinErrors((e) => ({ ...e, [item.id]: '' }));
              }}
              editable={confirmandoId !== item.id}
            />
            {codigoFinErrors[item.id] ? (
              <Text style={styles.confirmFinError}>{codigoFinErrors[item.id]}</Text>
            ) : null}
            <TouchableOpacity
              style={[
                styles.confirmFinBtn,
                confirmandoId === item.id && styles.confirmFinBtnDisabled,
              ]}
              onPress={() => handleConfirmarFin(item.id)}
              disabled={confirmandoId === item.id}
            >
              {confirmandoId === item.id ? (
                <ActivityIndicator color={T.white} />
              ) : (
                <Text style={styles.confirmFinBtnText}>Confirmar finalizacion</Text>
              )}
            </TouchableOpacity>
          </View>
        ) : null}

        {puedeCalificar ? (
          <TouchableOpacity
            style={styles.primaryAction}
            onPress={() => navigation.navigate('CalificarProveedor', { servicioId: item.id })}
          >
            <Text style={styles.primaryActionText}>Calificar proveedor</Text>
          </TouchableOpacity>
        ) : null}

        {activeTab === 'enviadas' && item.estado === 'completado' && yaCalifico ? (
          <Text style={styles.ratedText}>Ya calificaste este servicio.</Text>
        ) : null}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.contentWrap}>
      <ScreenHeader
        variant="inline"
        style={styles.header}
        title={user?.role === 'cliente' ? 'Mis servicios' : 'Trabajos'}
        subtitle="Gestiona tus servicios y solicitudes activas."
        onBack={() => navigation.navigate('Home')}
        right={
          <Button kind="ghost" size="sm" icon="refresh-cw" onPress={fetchSolicitudes}>
            Actualizar
          </Button>
        }
      />

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
          numColumns={wide ? 2 : 1}
          key={wide ? 'wide' : 'narrow'}
          columnWrapperStyle={wide ? styles.listColumns : null}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.canvas },
  contentWrap: { flex: 1, width: '100%', maxWidth: 1100, alignSelf: 'center', padding: 24, paddingBottom: 36 },
  // El layout, el enlace de volver y la tipografia del titulo los aporta
  // ScreenHeader; aqui solo queda la separacion con el contenido.
  header: { marginBottom: 18 },
  tabs: {
    flexDirection: 'row',
    gap: 6,
    padding: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: T.border,
    backgroundColor: T.paper,
    marginBottom: 18,
    alignSelf: 'flex-start',
  },
  tabBtn: {
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderRadius: 9,
    alignItems: 'center',
  },
  tabBtnActive: { backgroundColor: T.white, ...T.sh1 },
  tabBtnDisabled: { opacity: 0.5 },
  tabText: { color: '#526071', fontSize: 14, fontWeight: '700' },
  tabTextActive: { color: T.deep },
  tabTextDisabled: { color: '#8c96a3' },
  listContent: { paddingBottom: 32 },
  listColumns: { gap: 12 },
  card: {
    backgroundColor: T.paper,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: T.border,
    ...T.sh1,
  },
  cardWide: { flex: 1 },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  cardIdentity: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, minWidth: 0 },
  serviceIcon: { width: 42, height: 42, borderRadius: 12, backgroundColor: '#eef4ff', alignItems: 'center', justifyContent: 'center' },
  serviceIconText: { color: T.deep, fontWeight: '900', fontSize: 16 },
  personaBlock: { flex: 1, minWidth: 0 },
  persona: { flex: 1, fontSize: 16, fontWeight: '800', color: T.ink },
  categoryText: { fontSize: 12, color: T.muted, fontWeight: '600', marginTop: 3 },
  statusChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  statusDot: { width: 6, height: 6, borderRadius: 999 },
  statusText: { fontSize: 11, fontWeight: '800', textTransform: 'capitalize' },
  descripcion: { marginTop: 10, fontSize: 14, lineHeight: 20, color: '#526071' },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: T.border },
  metaText: { fontSize: 12, color: '#8c96a3', fontWeight: '600' },
  amountText: { fontSize: 16, color: T.deep, fontWeight: '900' },
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
  primaryAction: {
    marginTop: 14,
    backgroundColor: T.blue,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryActionText: { color: T.white, fontSize: 14, fontWeight: '800' },
  confirmFinBox: {
    marginTop: 14,
    backgroundColor: '#fff4e0',
    borderRadius: 10,
    padding: 14,
  },
  confirmFinLabel: { fontSize: 12, color: '#b76e00', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6 },
  confirmFinHint:  { fontSize: 12, color: '#7a5200', marginTop: 4, lineHeight: 16 },
  confirmFinInput: {
    marginTop: 10,
    backgroundColor: T.white,
    borderWidth: 1,
    borderColor: '#e3c485',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 6,
    textAlign: 'center',
    color: T.ink,
  },
  confirmFinInputError: { borderColor: T.danger, backgroundColor: '#fff5f5' },
  confirmFinError: { color: T.danger, fontSize: 12, marginTop: 6 },
  confirmFinBtn: {
    marginTop: 10,
    backgroundColor: '#b76e00',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  confirmFinBtnDisabled: { opacity: 0.6 },
  confirmFinBtnText: { color: T.white, fontSize: 14, fontWeight: '800' },
  ratedText: { marginTop: 12, color: T.success, fontSize: 13, fontWeight: '700' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  loadingText: { marginTop: 12, color: '#667085' },
  emptyState: { alignItems: 'center', paddingVertical: 64, paddingHorizontal: 24 },
  emptyTitle: { fontSize: 17, fontWeight: '800', color: T.ink, marginBottom: 8, textAlign: 'center' },
  emptyText: { fontSize: 14, color: '#667085', textAlign: 'center', lineHeight: 20 },
});
