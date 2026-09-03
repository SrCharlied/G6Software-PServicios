import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  aceptarServicio,
  descargarDocumento,
  finalizarServicio,
  getCalificacionesProveedor,
  getCategorias,
  getDocumentos,
  getMiCredito,
  getMiDisponibilidad,
  getMiProveedor,
  getPedidosAbiertos,
  getPremiumMiEstado,
  getSolicitudesProveedor,
  iniciarServicio,
  rechazarServicio,
  saveDisponibilidad,
  uploadDocumento,
} from '../services/api';
import { useToast } from '../context/ToastContext';
import { T } from '../theme';
import styles from './provider/providerStyles';
import ProviderHeader from './provider/ProviderHeader';
import PerfilPublicoCard from './provider/PerfilPublicoCard';
import SolicitudesPanel from './provider/SolicitudesPanel';
import OportunidadesPanel from './provider/OportunidadesPanel';
import MensajesPanel from './provider/MensajesPanel';
import HistorialPanel from './provider/HistorialPanel';
import CalificacionesPanel from './provider/CalificacionesPanel';
import DisponibilidadPanel from './provider/DisponibilidadPanel';
import DocumentosPanel from './provider/DocumentosPanel';
import { FinalizarServicioModal, IniciarServicioModal } from './provider/ProviderModals';
import { buildDisponibilidad, TABS } from './provider/providerUtils';

/**
 * Panel del proveedor.
 *
 * Esta pantalla solo orquesta: carga datos, mantiene el estado compartido y
 * decide que panel se muestra. Las tarjetas, los paneles, los modales, los
 * helpers y los estilos viven en ./provider. El comportamiento y el aspecto
 * son los mismos que antes de dividir el archivo.
 */
export default function ProviderDashboardScreen({
  navigation, user, providerProfile, setProviderProfile, onLogout,
}) {
  const toast = useToast();

  const [profile, setProfile] = useState(providerProfile);
  const [documentos, setDocumentos] = useState([]);
  const [solicitudes, setSolicitudes] = useState([]);
  const [calificaciones, setCalificaciones] = useState([]);
  const [disponibilidad, setDisponibilidad] = useState(buildDisponibilidad());
  const [premiumInfo, setPremiumInfo] = useState(null);
  const [saldo, setSaldo] = useState(null);
  const [oportunidades, setOportunidades] = useState([]);
  const [categorias, setCategorias] = useState([]);

  const [activeTab, setActiveTab] = useState('solicitudes');

  const [loadingProfile, setLoadingProfile] = useState(!providerProfile);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [loadingSolicitudes, setLoadingSolicitudes] = useState(false);
  const [loadingCalificaciones, setLoadingCalificaciones] = useState(false);
  const [loadingDisponibilidad, setLoadingDisponibilidad] = useState(false);
  const [loadingOportunidades, setLoadingOportunidades] = useState(false);

  const [uploading, setUploading] = useState(false);
  const [savingDisponibilidad, setSavingDisponibilidad] = useState(false);
  const [mutatingServiceId, setMutatingServiceId] = useState(null);

  const [iniciarTarget, setIniciarTarget] = useState(null); // servicio | null
  const [codigoInput, setCodigoInput] = useState('');
  const [codigoError, setCodigoError] = useState('');
  const [iniciando, setIniciando] = useState(false);

  const [finalizarTarget, setFinalizarTarget] = useState(null); // servicio | null
  const [codigoFinGenerado, setCodigoFinGenerado] = useState('');
  const [finalizando, setFinalizando] = useState(false);

  const [, setTick] = useState(0); // refresca el header cada minuto

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

  const reviewAverage = useMemo(() => {
    if (calificaciones.length === 0) return Number(profile?.calificacion_promedio || 0);
    const total = calificaciones.reduce((s, i) => s + Number(i.puntuacion || 0), 0);
    return total / calificaciones.length;
  }, [calificaciones, profile?.calificacion_promedio]);

  useEffect(() => {
    if (providerProfile) setProfile(providerProfile);
  }, [providerProfile]);

  useEffect(() => {
    if (!profile && user) { loadProfile(); return; }
    if (profile) loadDashboardData(profile);
  }, [user, profile?.id]);

  useEffect(() => {
    if (activeTab === 'oportunidades') {
      if (oportunidades.length === 0 && !loadingOportunidades) refreshOportunidades();
      if (categorias.length === 0) loadCategorias();
    }
  }, [activeTab]);

  // ── Carga de datos ───────────────────────────────────────

  const loadProfile = async () => {
    setLoadingProfile(true);
    try {
      const data = await getMiProveedor();
      setProfile(data.proveedor);
      setProviderProfile(data.proveedor);
    } catch { setProfile(null); }
    finally { setLoadingProfile(false); }
  };

  const loadDashboardData = async (provider) => {
    setLoadingDocs(true); setLoadingSolicitudes(true);
    setLoadingCalificaciones(true); setLoadingDisponibilidad(true);
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
    } catch (error) { toast(error.message, 'error'); }
    finally {
      setLoadingDocs(false); setLoadingSolicitudes(false);
      setLoadingCalificaciones(false); setLoadingDisponibilidad(false);
    }

    // El estado Premium va aparte: si falla, el panel sigue siendo usable y
    // el badge simplemente no se muestra.
    try {
      const premiumData = await getPremiumMiEstado();
      setPremiumInfo(premiumData);
    } catch {
      setPremiumInfo(null);
    }

    // El saldo tambien va aparte y por la misma razon: es informativo en esta
    // pantalla, no bloqueante. Si el endpoint falla se queda en null y la
    // cabecera simplemente no pinta el chip, en vez de mostrar un "0" falso.
    try {
      const creditoData = await getMiCredito();
      setSaldo(Number(creditoData.saldo ?? 0));
    } catch {
      setSaldo(null);
    }
  };

  const refreshSolicitudes = async () => {
    setLoadingSolicitudes(true);
    try { const data = await getSolicitudesProveedor(); setSolicitudes(data.servicios || []); }
    catch (error) { toast(error.message, 'error'); }
    finally { setLoadingSolicitudes(false); }
  };

  const refreshCalificaciones = async () => {
    if (!profile) return;
    setLoadingCalificaciones(true);
    try { const data = await getCalificacionesProveedor(profile.id); setCalificaciones(data.calificaciones || []); }
    catch (error) { toast(error.message, 'error'); }
    finally { setLoadingCalificaciones(false); }
  };

  const refreshOportunidades = async () => {
    setLoadingOportunidades(true);
    try { const data = await getPedidosAbiertos(); setOportunidades(data.pedidos || []); }
    catch (error) { toast(error.message, 'error'); }
    finally { setLoadingOportunidades(false); }
  };

  const loadCategorias = async () => {
    try {
      const data = await getCategorias();
      setCategorias(data.categorias || data || []);
    } catch { /* silent — los chips simplemente no aparecen */ }
  };

  // ── Acciones ─────────────────────────────────────────────

  const handleUpload = async (file, tipoDocumento) => {
    if (!profile) return;
    setUploading(true);
    try {
      const data = await uploadDocumento(profile.id, file, tipoDocumento);
      setDocumentos((prev) => [data.documento, ...prev]);
      toast(`"${file.name}" subido correctamente.`, 'success');
    } catch (error) { toast(error.message, 'error'); }
    finally { setUploading(false); }
  };

  const handleDescargar = async (doc) => {
    if (!profile) return;

    if (Platform.OS !== 'web') {
      toast('La descarga de documentos esta disponible en la version web.', 'error');
      return;
    }

    try {
      const blob = await descargarDocumento(profile.id, doc.id);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = doc.nombre_archivo;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast(error.message, 'error');
    }
  };

  const handleAccept = async (id) => {
    setMutatingServiceId(id);
    try { await aceptarServicio(id); toast('Solicitud aceptada.', 'success'); await refreshSolicitudes(); }
    catch (error) { toast(error.message, 'error'); }
    finally { setMutatingServiceId(null); }
  };

  const handleReject = async (id) => {
    setMutatingServiceId(id);
    try { await rechazarServicio(id); toast('Solicitud rechazada.', 'info'); await refreshSolicitudes(); }
    catch (error) { toast(error.message, 'error'); }
    finally { setMutatingServiceId(null); }
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
      setCodigoError('El codigo debe tener 6 digitos.');
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
    try { await saveDisponibilidad(disponibilidad); toast('Horario semanal guardado correctamente.', 'success'); }
    catch (error) { toast(error.message, 'error'); }
    finally { setSavingDisponibilidad(false); }
  };

  // ── Render ───────────────────────────────────────────────

  if (loadingProfile) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={T.blue} />
        <Text style={styles.loadingText}>Cargando panel...</Text>
      </View>
    );
  }

  if (!profile) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <ProviderHeader
          profile={null}
          premiumInfo={premiumInfo}
          disponibilidad={disponibilidad}
          subtitle="Mi panel"
          onEditarPerfil={() => navigation.navigate('ProviderEditProfile')}
          onLogout={onLogout}
        />
        <View style={styles.emptyCard}>
          <Text style={styles.emptyCardTitle}>Aun no tienes perfil de proveedor</Text>
          <Text style={styles.emptyCardText}>
            Completa tu perfil para recibir solicitudes y administrar disponibilidad.
          </Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => navigation.navigate('ProviderEditProfile')}>
            <Text style={styles.primaryBtnText}>Crear perfil</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
            onRefresh={refreshOportunidades}
            onAbrirPedido={(pedidoId) => navigation.navigate('PedidoDetail', { pedidoId })}
          />
        );
      case 'mensajes':
        return (
          <MensajesPanel
            solicitudes={solicitudes}
            loading={loadingSolicitudes}
            onAbrirChat={(cliente) =>
              navigation.navigate('Chat', { chatWithUserId: cliente.userId, chatWithName: cliente.name })}
          />
        );
      case 'historial':
        return <HistorialPanel historial={historial} loading={loadingSolicitudes} />;
      case 'calificaciones':
        return (
          <CalificacionesPanel
            calificaciones={calificaciones}
            promedio={reviewAverage}
            total={calificaciones.length || profile.total_calificaciones || 0}
            loading={loadingCalificaciones}
            onRefresh={refreshCalificaciones}
          />
        );
      case 'disponibilidad':
        return (
          <DisponibilidadPanel
            disponibilidad={disponibilidad}
            loading={loadingDisponibilidad}
            guardando={savingDisponibilidad}
            onUpdateDay={updateDay}
            onGuardar={handleSaveDisponibilidad}
          />
        );
      case 'solicitudes':
      default:
        return (
          <SolicitudesPanel
            solicitudes={solicitudes}
            pendientes={pendientes}
            activas={activas}
            loading={loadingSolicitudes}
            mutatingServiceId={mutatingServiceId}
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
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <ProviderHeader
        profile={profile}
        premiumInfo={premiumInfo}
        saldo={saldo}
        disponibilidad={disponibilidad}
        onEditarPerfil={() => navigation.navigate('ProviderEditProfile')}
        onVerCreditos={() => navigation.navigate('Creditos')}
        onLogout={onLogout}
      />

      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryNumber}>{pendientes.length}</Text>
          <Text style={styles.summaryLabel}>PENDIENTES</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryNumber}>{activas.length}</Text>
          <Text style={styles.summaryLabel}>ACTIVOS</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryNumber}>{profile.total_calificaciones || 0}</Text>
          <Text style={styles.summaryLabel}>RESEÑAS</Text>
        </View>
      </View>

      <PerfilPublicoCard
        profile={profile}
        premiumInfo={premiumInfo}
        onVerComoCliente={() => navigation.navigate('ProviderDetail', { provider: profile })}
      />

      <DocumentosPanel
        documentos={documentos}
        loading={loadingDocs}
        subiendo={uploading}
        onUpload={handleUpload}
        onDescargar={handleDescargar}
      />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsRow}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tabBtn, activeTab === tab.key && styles.tabBtnActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text style={[styles.tabBtnText, activeTab === tab.key && styles.tabBtnTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.card}>{renderTab()}</View>

      <TouchableOpacity style={styles.secondaryHomeBtn} onPress={() => navigation.navigate('Home')}>
        <Text style={styles.secondaryHomeBtnText}>Ver listado de proveedores</Text>
      </TouchableOpacity>

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
    </ScrollView>
  );
}
