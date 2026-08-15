import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import {
  aceptarServicio,
  finalizarServicio,
  getCalificacionesProveedor,
  getCategorias,
  getDocumentos,
  getMiCredito,
  getMiDisponibilidad,
  getMiEstadoPremium,
  getPedidosAbiertos,
  getProviderByUser,
  getSolicitudesProveedor,
  iniciarServicio,
  rechazarServicio,
  saveDisponibilidad,
  uploadDocumento,
} from '../services/api';
import { useToast } from '../context/ToastContext';
import { T } from '../theme';
import { Button, EmptyState } from '../components/ui';
import CalificacionesPanel from './provider/CalificacionesPanel';
import DisponibilidadPanel from './provider/DisponibilidadPanel';
import DocumentosPanel from './provider/DocumentosPanel';
import HistorialPanel from './provider/HistorialPanel';
import MensajesPanel from './provider/MensajesPanel';
import OportunidadesPanel from './provider/OportunidadesPanel';
import ProviderOverview from './provider/ProviderOverview';
import TrabajosPanel from './provider/TrabajosPanel';
import { FinalizarServicioModal, IniciarServicioModal } from './provider/ProviderModals';
import { buildDisponibilidad, TABS } from './provider/providerUtils';

/**
 * Panel del proveedor. Esta pantalla solo orquesta: carga datos, mantiene el
 * estado y decide que panel se muestra. Las tarjetas, los paneles y los
 * modales viven en ./provider para que el archivo deje de ser monolitico.
 */
export default function ProviderDashboardScreen({
  navigation, user, providerProfile, setProviderProfile,
}) {
  const toast = useToast();
  const { width } = useWindowDimensions();
  const desktop = width >= 900;
  const columnas = width >= 1280 ? 3 : width >= 820 ? 2 : 1;

  const [profile, setProfile] = useState(providerProfile);
  const [documentos, setDocumentos] = useState([]);
  const [solicitudes, setSolicitudes] = useState([]);
  const [calificaciones, setCalificaciones] = useState([]);
  const [disponibilidad, setDisponibilidad] = useState(buildDisponibilidad());
  const [oportunidades, setOportunidades] = useState([]);
  const [categorias, setCategorias] = useState([]);

  const [activeTab, setActiveTab] = useState('trabajos');

  const [loadingProfile, setLoadingProfile] = useState(!providerProfile);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [loadingSolicitudes, setLoadingSolicitudes] = useState(false);
  const [loadingCalificaciones, setLoadingCalificaciones] = useState(false);
  const [loadingDisponibilidad, setLoadingDisponibilidad] = useState(false);
  const [loadingOportunidades, setLoadingOportunidades] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [saldo, setSaldo] = useState(null);
  const [saldoLoading, setSaldoLoading] = useState(true);
  const [saldoError, setSaldoError] = useState('');

  const [premium, setPremium] = useState(null);
  const [premiumLoading, setPremiumLoading] = useState(true);

  const [uploading, setUploading] = useState(false);
  const [savingDisponibilidad, setSavingDisponibilidad] = useState(false);
  const [mutatingServiceId, setMutatingServiceId] = useState(null);

  const [iniciarTarget, setIniciarTarget] = useState(null);
  const [codigoInput, setCodigoInput] = useState('');
  const [codigoError, setCodigoError] = useState('');
  const [iniciando, setIniciando] = useState(false);

  const [finalizarTarget, setFinalizarTarget] = useState(null);
  const [codigoFinGenerado, setCodigoFinGenerado] = useState('');
  const [finalizando, setFinalizando] = useState(false);

  const [, setTick] = useState(0); // refresca el estado de disponibilidad cada minuto

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60000);
    return () => clearInterval(id);
  }, []);

  const pendientes = useMemo(
    () => solicitudes.filter((i) => i.estado === 'pendiente'),
    [solicitudes],
  );
  const activas = useMemo(
    () => solicitudes.filter((i) => ['aceptado', 'en_camino', 'en_progreso', 'por_confirmar'].includes(i.estado)),
    [solicitudes],
  );
  const historial = useMemo(
    () => solicitudes.filter((i) => ['completado', 'rechazado', 'cancelado'].includes(i.estado)),
    [solicitudes],
  );

  const promedio = useMemo(() => {
    if (calificaciones.length === 0) return Number(profile?.calificacion_promedio || 0);
    const total = calificaciones.reduce((acc, i) => acc + Number(i.puntuacion || 0), 0);
    return total / calificaciones.length;
  }, [calificaciones, profile?.calificacion_promedio]);

  // ── Carga de datos ───────────────────────────────────────────────────────

  const cargarSaldo = useCallback(async () => {
    setSaldoLoading(true);
    setSaldoError('');
    try {
      const data = await getMiCredito();
      setSaldo(data.saldo ?? 0);
    } catch (error) {
      // No se degrada a 0: el DoD prohibe convertir un fallo en saldo valido.
      setSaldo(null);
      setSaldoError(error.message);
    } finally {
      setSaldoLoading(false);
    }
  }, []);

  const cargarPremium = useCallback(async () => {
    setPremiumLoading(true);
    try {
      setPremium(await getMiEstadoPremium());
    } catch {
      setPremium(null);
    } finally {
      setPremiumLoading(false);
    }
  }, []);

  const loadProfile = useCallback(async () => {
    setLoadingProfile(true);
    try {
      const data = await getProviderByUser(user.id);
      setProfile(data.proveedor);
      setProviderProfile(data.proveedor);
    } catch {
      setProfile(null);
    } finally {
      setLoadingProfile(false);
    }
  }, [user?.id, setProviderProfile]);

  const refreshSolicitudes = useCallback(async () => {
    setLoadingSolicitudes(true);
    try {
      const data = await getSolicitudesProveedor();
      setSolicitudes(data.servicios || []);
    } catch (error) {
      toast(error.message, 'error');
    } finally {
      setLoadingSolicitudes(false);
    }
  }, [toast]);

  const refreshCalificaciones = useCallback(async () => {
    if (!profile) return;
    setLoadingCalificaciones(true);
    try {
      const data = await getCalificacionesProveedor(profile.id);
      setCalificaciones(data.calificaciones || []);
    } catch (error) {
      toast(error.message, 'error');
    } finally {
      setLoadingCalificaciones(false);
    }
  }, [profile, toast]);

  const refreshOportunidades = useCallback(async () => {
    setLoadingOportunidades(true);
    try {
      const data = await getPedidosAbiertos();
      setOportunidades(data.pedidos || []);
    } catch (error) {
      toast(error.message, 'error');
    } finally {
      setLoadingOportunidades(false);
    }
  }, [toast]);

  const loadDashboardData = useCallback(async (provider) => {
    setLoadingDocs(true);
    setLoadingSolicitudes(true);
    setLoadingCalificaciones(true);
    setLoadingDisponibilidad(true);
    try {
      const [docsData, solicitudesData, calificacionesData, disponibilidadData] = await Promise.all([
        getDocumentos(provider.id),
        getSolicitudesProveedor(),
        getCalificacionesProveedor(provider.id),
        getMiDisponibilidad(),
      ]);
      setDocumentos(docsData.documentos || []);
      setSolicitudes(solicitudesData.servicios || []);
      setCalificaciones(calificacionesData.calificaciones || []);
      setDisponibilidad(buildDisponibilidad(disponibilidadData.disponibilidad || []));
    } catch (error) {
      toast(error.message, 'error');
    } finally {
      setLoadingDocs(false);
      setLoadingSolicitudes(false);
      setLoadingCalificaciones(false);
      setLoadingDisponibilidad(false);
    }
  }, [toast]);

  useEffect(() => {
    if (providerProfile) setProfile(providerProfile);
  }, [providerProfile]);

  useEffect(() => {
    if (!profile && user) { loadProfile(); return; }
    if (profile) loadDashboardData(profile);
  }, [user, profile?.id]);

  useEffect(() => {
    cargarSaldo();
    cargarPremium();
  }, [cargarSaldo, cargarPremium]);

  useEffect(() => {
    if (activeTab !== 'oportunidades') return;
    if (oportunidades.length === 0 && !loadingOportunidades) refreshOportunidades();
    if (categorias.length === 0) {
      getCategorias()
        .then((data) => setCategorias(data.categorias || data || []))
        .catch(() => { /* sin categorias los chips simplemente no aparecen */ });
    }
  }, [activeTab]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      refreshSolicitudes(),
      cargarSaldo(),
      cargarPremium(),
      activeTab === 'oportunidades' ? refreshOportunidades() : Promise.resolve(),
    ]);
    setRefreshing(false);
  };

  // ── Acciones ─────────────────────────────────────────────────────────────

  const handleUpload = async (file, tipoDocumento) => {
    if (!profile) return;
    setUploading(true);
    try {
      const data = await uploadDocumento(profile.id, file, tipoDocumento);
      setDocumentos((prev) => [data.documento, ...prev]);
      toast(`"${file.name}" subido correctamente.`, 'success');
    } catch (error) {
      toast(error.message, 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleAccept = async (id) => {
    setMutatingServiceId(id);
    try {
      await aceptarServicio(id);
      toast('Solicitud aceptada.', 'success');
      await refreshSolicitudes();
    } catch (error) {
      toast(error.message, 'error');
    } finally {
      setMutatingServiceId(null);
    }
  };

  const handleReject = async (id) => {
    setMutatingServiceId(id);
    try {
      await rechazarServicio(id);
      toast('Solicitud rechazada.', 'info');
      await refreshSolicitudes();
    } catch (error) {
      toast(error.message, 'error');
    } finally {
      setMutatingServiceId(null);
    }
  };

  const openIniciar = (servicio) => {
    setIniciarTarget(servicio);
    setCodigoInput('');
    setCodigoError('');
  };

  const closeIniciar = () => {
    if (iniciando) return;
    setIniciarTarget(null);
    setCodigoInput('');
    setCodigoError('');
  };

  const submitIniciar = async () => {
    if (!iniciarTarget) return;
    if (!/^\d{6}$/.test(codigoInput)) {
      setCodigoError('El código debe tener 6 dígitos.');
      return;
    }
    setIniciando(true);
    setCodigoError('');
    try {
      await iniciarServicio(iniciarTarget.id, codigoInput);
      toast('Servicio iniciado.', 'success');
      setIniciarTarget(null);
      setCodigoInput('');
      await refreshSolicitudes();
    } catch (error) {
      setCodigoError(error.message);
    } finally {
      setIniciando(false);
    }
  };

  const openFinalizar = async (servicio) => {
    setFinalizarTarget(servicio);
    setCodigoFinGenerado('');
    setFinalizando(true);
    try {
      const data = await finalizarServicio(servicio.id);
      setCodigoFinGenerado(data?.codigo_fin || '');
      await refreshSolicitudes();
    } catch (error) {
      toast(error.message, 'error');
      setFinalizarTarget(null);
    } finally {
      setFinalizando(false);
    }
  };

  const closeFinalizar = () => {
    if (finalizando) return;
    setFinalizarTarget(null);
    setCodigoFinGenerado('');
  };

  const updateDay = (dayId, changes) => {
    setDisponibilidad((prev) => prev.map((i) => (i.dia_semana === dayId ? { ...i, ...changes } : i)));
  };

  const handleSaveDisponibilidad = async () => {
    setSavingDisponibilidad(true);
    try {
      await saveDisponibilidad(disponibilidad);
      toast('Horario semanal guardado correctamente.', 'success');
    } catch (error) {
      toast(error.message, 'error');
    } finally {
      setSavingDisponibilidad(false);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────

  if (loadingProfile) {
    return (
      <View style={s.centered}>
        <ActivityIndicator size="large" color={T.blue} />
        <Text style={s.loadingText}>Cargando panel…</Text>
      </View>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView style={s.container}>
        <EmptyState
          icon="user-plus"
          title="Aún no tienes perfil de proveedor"
          description="Completa tu perfil para recibir solicitudes, cotizar pedidos y administrar tu disponibilidad."
          actionLabel="Crear perfil"
          onAction={() => navigation.navigate('ProviderEditProfile')}
        />
      </SafeAreaView>
    );
  }

  const renderTab = () => {
    switch (activeTab) {
      case 'oportunidades':
        return (
          <OportunidadesPanel
            oportunidades={oportunidades}
            categorias={categorias}
            loading={loadingOportunidades}
            profile={profile}
            columnas={columnas}
            onRefresh={refreshOportunidades}
            onAbrirPedido={(pedidoId) => navigation.navigate('PedidoDetail', { pedidoId })}
          />
        );
      case 'mensajes':
        return (
          <MensajesPanel
            solicitudes={solicitudes}
            loading={loadingSolicitudes}
            columnas={columnas}
            onAbrirChat={(cliente) =>
              navigation.navigate('Chat', { chatWithUserId: cliente.userId, chatWithName: cliente.name })
            }
          />
        );
      case 'historial':
        return <HistorialPanel historial={historial} loading={loadingSolicitudes} columnas={columnas} />;
      case 'calificaciones':
        return (
          <CalificacionesPanel
            calificaciones={calificaciones}
            promedio={promedio}
            total={calificaciones.length || profile.total_calificaciones || 0}
            loading={loadingCalificaciones}
            columnas={columnas}
            onRefresh={refreshCalificaciones}
          />
        );
      case 'disponibilidad':
        return (
          <DisponibilidadPanel
            disponibilidad={disponibilidad}
            loading={loadingDisponibilidad}
            guardando={savingDisponibilidad}
            columnas={columnas}
            onUpdateDay={updateDay}
            onGuardar={handleSaveDisponibilidad}
          />
        );
      case 'trabajos':
      default:
        return (
          <TrabajosPanel
            pendientes={pendientes}
            activas={activas}
            loading={loadingSolicitudes}
            mutatingServiceId={mutatingServiceId}
            columnas={columnas}
            onRefresh={refreshSolicitudes}
            onAccept={handleAccept}
            onReject={handleReject}
            onIniciar={openIniciar}
            onFinalizar={openFinalizar}
          />
        );
    }
  };

  return (
    <SafeAreaView style={s.container}>
      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={T.blue} />}
      >
        <ProviderOverview
          profile={profile}
          disponibilidad={disponibilidad}
          pendientes={pendientes.length}
          activos={activas.length}
          resenas={calificaciones.length || profile.total_calificaciones || 0}
          calificacion={promedio}
          saldo={saldo}
          saldoLoading={saldoLoading}
          saldoError={saldoError}
          onReintentarSaldo={cargarSaldo}
          premium={premium}
          premiumLoading={premiumLoading}
          verificado={user?.documento_verificado}
          desktop={desktop}
          onEditarPerfil={() => navigation.navigate('ProviderEditProfile')}
          onCreditos={() => navigation.navigate('Creditos')}
          onVerPerfilPublico={() => navigation.navigate('ProviderDetail', { providerId: profile.id })}
        />

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.tabsRow}>
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
        </ScrollView>

        <View style={s.panel}>{renderTab()}</View>

        <DocumentosPanel
          documentos={documentos}
          loading={loadingDocs}
          subiendo={uploading}
          onUpload={handleUpload}
        />

        <Button kind="ghost" icon="users" onPress={() => navigation.navigate('Home')}>
          Ver listado de proveedores
        </Button>
      </ScrollView>

      <IniciarServicioModal
        visible={!!iniciarTarget}
        codigo={codigoInput}
        error={codigoError}
        procesando={iniciando}
        onChange={(v) => { setCodigoInput(v.replace(/\D/g, '').slice(0, 6)); setCodigoError(''); }}
        onConfirm={submitIniciar}
        onClose={closeIniciar}
      />

      <FinalizarServicioModal
        visible={!!finalizarTarget}
        codigo={codigoFinGenerado}
        procesando={finalizando}
        onClose={closeFinalizar}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container:   { flex: 1, backgroundColor: T.canvas },
  scroll:      { padding: T.s4, paddingBottom: 40, gap: T.s4 },
  centered:    { flex: 1, justifyContent: 'center', alignItems: 'center', gap: T.s3 },
  loadingText: { fontSize: 15, color: T.muted },

  tabsRow: { gap: 8, paddingVertical: 2 },
  tab: {
    backgroundColor: T.white, borderWidth: 1, borderColor: T.border,
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 999,
  },
  tabActivo:     { backgroundColor: T.blue, borderColor: T.blue, ...T.sh2 },
  tabText:       { color: T.muted, fontWeight: '600', fontSize: 13 },
  tabTextActivo: { color: T.white },

  panel: { gap: T.s3 },
});
