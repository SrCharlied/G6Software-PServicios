import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  SafeAreaView,
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
import { Button, Card, EmptyState, ScreenHeader, StatusChip } from '../components/ui';

const ESTADOS_CON_CODIGO = new Set(['pendiente', 'aceptado']);

const ESTADO_VARIANT = {
  pendiente:     'warn',
  aceptado:      'success',
  en_camino:     'info',
  en_progreso:   'info',
  por_confirmar: 'warn',
  completado:    'success',
  rechazado:     'danger',
  cancelado:     'neutral',
};

const estadoLabel = (estado) => (estado || 'pendiente').replace(/_/g, ' ');

const formatDate = (value) => {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('es-GT', { day: '2-digit', month: 'short', year: 'numeric' });
};

export default function SolicitudesScreen({ navigation, user }) {
  const toast = useToast();
  const { width } = useWindowDimensions();
  const columnas = width >= 1280 ? 3 : width >= 820 ? 2 : 1;

  const esProveedor = user?.role === 'proveedor';

  // El proveedor llama "Trabajos" a lo mismo que el cliente ve como
  // "Mis servicios"; la ruta tecnica sigue siendo /solicitudes para ambos.
  const tituloPantalla = esProveedor ? 'Trabajos' : 'Mis servicios';

  const TABS = useMemo(() => ([
    { key: 'enviadas',  label: esProveedor ? 'Solicitadas por mí' : 'Mis servicios' },
    { key: 'recibidas', label: 'Recibidas' },
  ]), [esProveedor]);

  const [activeTab, setActiveTab] = useState('enviadas');
  const [enviadas, setEnviadas] = useState([]);
  const [recibidas, setRecibidas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [codigoFinInputs, setCodigoFinInputs] = useState({});
  const [codigoFinErrors, setCodigoFinErrors] = useState({});
  const [confirmandoId, setConfirmandoId] = useState(null);

  const fetchSolicitudes = useCallback(async () => {
    setLoading(true);
    try {
      const enviadasData = await getSolicitudesCliente();
      setEnviadas(enviadasData.servicios || []);

      if (esProveedor) {
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
  }, [esProveedor, toast]);

  useEffect(() => { fetchSolicitudes(); }, [fetchSolicitudes]);

  const solicitudes = useMemo(
    () => (activeTab === 'enviadas' ? enviadas : recibidas),
    [activeTab, enviadas, recibidas],
  );

  const handleConfirmarFin = async (servicioId) => {
    const codigo = (codigoFinInputs[servicioId] || '').trim();
    if (!/^\d{6}$/.test(codigo)) {
      setCodigoFinErrors((e) => ({ ...e, [servicioId]: 'El código debe tener 6 dígitos.' }));
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

  const renderSolicitud = ({ item }) => {
    const persona = activeTab === 'enviadas'
      ? item.proveedor?.nombre || 'Proveedor'
      : item.cliente?.name || 'Cliente';

    const mostrarCodigo = activeTab === 'enviadas'
      && item.codigo_inicio
      && ESTADOS_CON_CODIGO.has(item.estado);

    const mostrarConfirmarFin = activeTab === 'enviadas' && item.estado === 'por_confirmar';

    const yaCalifico = (item.calificaciones || []).some(
      (cal) => Number(cal.autor_id) === Number(user?.id),
    );
    const puedeCalificar = activeTab === 'enviadas'
      && item.estado === 'completado'
      && !yaCalifico;

    return (
      <View style={[s.gridItem, { flexBasis: `${100 / columnas}%`, maxWidth: `${100 / columnas}%` }]}>
        <Card style={s.card}>
          <View style={s.cardHead}>
            <Text style={s.persona} numberOfLines={1}>{persona}</Text>
            <StatusChip
              variant={ESTADO_VARIANT[item.estado] ?? 'neutral'}
              label={estadoLabel(item.estado)}
              size="sm"
            />
          </View>

          <Text style={s.descripcion} numberOfLines={3}>{item.descripcion}</Text>

          <View style={s.metaRow}>
            <Text style={s.metaText} numberOfLines={1}>
              {item.categoria?.nombre || item.proveedor?.categoria?.nombre || 'Sin categoría'}
            </Text>
            <Text style={s.metaText}>{formatDate(item.created_at)}</Text>
          </View>

          {mostrarCodigo ? (
            <View style={s.codigoBox}>
              <Text style={s.codigoLabel}>CÓDIGO DE INICIO</Text>
              <Text style={s.codigoValue}>{item.codigo_inicio}</Text>
              <Text style={s.codigoHint}>
                Compártelo con el proveedor cuando llegue para iniciar el servicio.
              </Text>
            </View>
          ) : null}

          {mostrarConfirmarFin ? (
            <View style={s.confirmBox}>
              <Text style={s.confirmLabel}>CONFIRMAR FINALIZACIÓN</Text>
              <Text style={s.confirmHint}>
                Pide al proveedor el código de 6 dígitos para confirmar que el trabajo está bien hecho.
              </Text>
              <TextInput
                style={[s.confirmInput, codigoFinErrors[item.id] && s.confirmInputError]}
                placeholder="000000"
                placeholderTextColor="#b9c2cc"
                keyboardType="number-pad"
                maxLength={6}
                value={codigoFinInputs[item.id] || ''}
                onChangeText={(v) => {
                  const clean = v.replace(/\D/g, '').slice(0, 6);
                  setCodigoFinInputs((prev) => ({ ...prev, [item.id]: clean }));
                  setCodigoFinErrors((e) => ({ ...e, [item.id]: '' }));
                }}
                editable={confirmandoId !== item.id}
              />
              {codigoFinErrors[item.id] ? (
                <Text style={s.confirmError}>{codigoFinErrors[item.id]}</Text>
              ) : null}
              <Button
                kind="primary"
                size="sm"
                full
                loading={confirmandoId === item.id}
                onPress={() => handleConfirmarFin(item.id)}
              >
                Confirmar finalización
              </Button>
            </View>
          ) : null}

          {puedeCalificar ? (
            <Button
              kind="primary"
              size="sm"
              icon="star"
              full
              onPress={() => navigation.navigate('CalificarProveedor', { servicioId: item.id })}
            >
              Calificar proveedor
            </Button>
          ) : null}

          {activeTab === 'enviadas' && item.estado === 'completado' && yaCalifico ? (
            <Text style={s.calificado}>Ya calificaste este servicio.</Text>
          ) : null}
        </Card>
      </View>
    );
  };

  return (
    <SafeAreaView style={s.container}>
      <ScreenHeader
        title={tituloPantalla}
        subtitle={esProveedor
          ? 'Trabajos recibidos y servicios que solicitaste'
          : 'Servicios que solicitaste a proveedores'}
        onBack={() => navigation.navigate(esProveedor ? 'ProviderDashboard' : 'Home')}
        backLabel={esProveedor ? 'Mi panel' : 'Inicio'}
        right={
          <Button kind="ghost" size="sm" icon="refresh-cw" onPress={fetchSolicitudes}>
            Actualizar
          </Button>
        }
      />

      {/* Con un solo rol activo la barra de pestañas no aporta nada. */}
      {esProveedor ? (
        <View style={s.tabs}>
          {TABS.map((tab) => {
            const activo = activeTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[s.tab, activo && s.tabActivo]}
                onPress={() => setActiveTab(tab.key)}
                accessibilityRole="tab"
                accessibilityState={{ selected: activo }}
              >
                <Text style={[s.tabText, activo && s.tabTextActivo]}>{tab.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      ) : null}

      {loading && solicitudes.length === 0 ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={T.blue} />
          <Text style={s.loadingText}>Cargando…</Text>
        </View>
      ) : (
        <FlatList
          key={`cols-${columnas}`}
          data={solicitudes}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderSolicitud}
          numColumns={columnas}
          columnWrapperStyle={columnas > 1 ? s.row : undefined}
          contentContainerStyle={solicitudes.length === 0 ? s.listEmpty : s.listContent}
          refreshing={loading}
          onRefresh={fetchSolicitudes}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <EmptyState
              icon="clipboard"
              title={activeTab === 'enviadas' ? 'Aún no tienes servicios' : 'Sin trabajos recibidos'}
              description={
                activeTab === 'enviadas'
                  ? 'Cuando solicites un servicio a un proveedor aparecerá aquí.'
                  : 'Las solicitudes que te envíen los clientes aparecerán aquí.'
              }
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.canvas },

  tabs: { flexDirection: 'row', gap: T.s2, padding: T.s4, paddingBottom: 0 },
  tab: {
    flex: 1, paddingVertical: 11, borderRadius: T.rSm,
    borderWidth: 1, borderColor: T.inputBorder,
    backgroundColor: T.paper, alignItems: 'center',
  },
  tabActivo:     { backgroundColor: T.blue, borderColor: T.blue },
  tabText:       { color: T.muted, fontSize: 13, fontWeight: '700' },
  tabTextActivo: { color: T.white },

  listContent: { padding: T.s4, paddingBottom: 32 },
  listEmpty:   { flexGrow: 1, padding: T.s4 },
  row:         { gap: 0 },
  gridItem:    { paddingHorizontal: T.s2, paddingBottom: T.s3 },

  card:        { gap: 10 },
  cardHead:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: T.s2 },
  persona:     { flex: 1, fontSize: 15, fontWeight: '800', color: T.ink },
  descripcion: { fontSize: 13, lineHeight: 20, color: T.muted },
  metaRow:     { flexDirection: 'row', justifyContent: 'space-between', gap: T.s3 },
  metaText:    { fontSize: 11, color: T.faint, fontWeight: '600', flexShrink: 1 },

  codigoBox:   { backgroundColor: '#e3f0ff', borderRadius: T.rSm, padding: 14, alignItems: 'center' },
  codigoLabel: { fontSize: 11, color: '#1858a6', fontWeight: '800', letterSpacing: 0.6 },
  codigoValue: { fontSize: 28, fontWeight: '800', color: T.ink, letterSpacing: 6, marginTop: 4 },
  codigoHint:  { fontSize: 11, color: '#1858a6', marginTop: 6, textAlign: 'center' },

  confirmBox:   { backgroundColor: '#fff4e0', borderRadius: T.rSm, padding: 14, gap: 8 },
  confirmLabel: { fontSize: 11, color: '#b76e00', fontWeight: '800', letterSpacing: 0.6 },
  confirmHint:  { fontSize: 12, color: '#7a5200', lineHeight: 16 },
  confirmInput: {
    backgroundColor: T.white, borderWidth: 1, borderColor: '#e3c485',
    borderRadius: T.rSm, paddingVertical: 12, paddingHorizontal: 14,
    fontSize: 22, fontWeight: '800', letterSpacing: 6,
    textAlign: 'center', color: T.ink,
  },
  confirmInputError: { borderColor: T.danger, backgroundColor: '#fff5f5' },
  confirmError:      { color: T.danger, fontSize: 12 },

  calificado: { color: T.success, fontSize: 12, fontWeight: '700' },

  center:      { flex: 1, justifyContent: 'center', alignItems: 'center', padding: T.s6, gap: T.s3 },
  loadingText: { color: T.muted, fontSize: 14 },
});
