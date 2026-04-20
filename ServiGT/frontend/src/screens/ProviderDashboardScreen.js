import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  aceptarServicio,
  actualizarEstadoServicio,
  getCalificacionesProveedor,
  getDocumentos,
  getMiDisponibilidad,
  getProviderByUser,
  getSolicitudesProveedor,
  rechazarServicio,
  saveDisponibilidad,
  uploadDocumento,
} from '../services/api';

const TIPOS_DOCUMENTO = [
  'DPI (Documento Personal de Identificacion)',
  'Pasaporte',
  'NIT (Numero de Identificacion Tributaria)',
  'Patente de Comercio',
  'Titulo Universitario',
  'Certificado de Antecedentes',
  'Otro',
];

const DIAS = [
  { id: 0, short: 'Dom', label: 'Domingo' },
  { id: 1, short: 'Lun', label: 'Lunes' },
  { id: 2, short: 'Mar', label: 'Martes' },
  { id: 3, short: 'Mie', label: 'Miercoles' },
  { id: 4, short: 'Jue', label: 'Jueves' },
  { id: 5, short: 'Vie', label: 'Viernes' },
  { id: 6, short: 'Sab', label: 'Sabado' },
];

const TABS = [
  { key: 'solicitudes', label: 'Solicitudes' },
  { key: 'historial', label: 'Historial' },
  { key: 'calificaciones', label: 'Calificaciones' },
  { key: 'disponibilidad', label: 'Disponibilidad' },
];

const ESTADO_COLORES = {
  pendiente: { bg: '#fff3cd', text: '#856404' },
  aceptado: { bg: '#d1e7dd', text: '#0f5132' },
  en_camino: { bg: '#dbeafe', text: '#1d4ed8' },
  en_progreso: { bg: '#ede9fe', text: '#6d28d9' },
  completado: { bg: '#dcfce7', text: '#166534' },
  cancelado: { bg: '#f3f4f6', text: '#4b5563' },
  rechazado: { bg: '#f8d7da', text: '#842029' },
  aprobado: { bg: '#d1e7dd', text: '#0f5132' },
};

const emptyDay = (day) => ({
  dia_semana: day.id,
  disponible: false,
  hora_inicio: '08:00',
  hora_fin: '17:00',
});

const buildDisponibilidad = (items = []) =>
  DIAS.map((day) => {
    const existing = items.find((item) => Number(item.dia_semana) === day.id);
    return existing
      ? {
          dia_semana: day.id,
          disponible: Boolean(existing.disponible),
          hora_inicio: existing.hora_inicio || '08:00',
          hora_fin: existing.hora_fin || '17:00',
        }
      : emptyDay(day);
  });

const formatDate = (value) => {
  if (!value) return 'Sin fecha';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('es-GT', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
};

const formatCurrency = (value) => {
  if (value === null || value === undefined || value === '') return 'Sin monto';
  const number = Number(value);
  if (Number.isNaN(number)) return String(value);
  return `Q${number.toFixed(2)}`;
};

const Stars = ({ value }) => (
  <View style={styles.starsRow}>
    {[1, 2, 3, 4, 5].map((star) => (
      <Text
        key={star}
        style={[styles.star, star <= value ? styles.starOn : styles.starOff]}
      >
        *
      </Text>
    ))}
  </View>
);

const StatusBadge = ({ estado }) => {
  const colors = ESTADO_COLORES[estado] || ESTADO_COLORES.pendiente;
  return (
    <View style={[styles.statusBadge, { backgroundColor: colors.bg }]}>
      <Text style={[styles.statusBadgeText, { color: colors.text }]}>
        {(estado || 'pendiente').replace(/_/g, ' ')}
      </Text>
    </View>
  );
};

function ServicioCard({ servicio, onAccept, onReject, onAdvanceStatus, compact = false }) {
  const canAccept = servicio.estado === 'pendiente';
  const nextActions = {
    aceptado: 'en_camino',
    en_camino: 'en_progreso',
    en_progreso: 'completado',
  };
  const nextStatus = nextActions[servicio.estado];

  return (
    <View style={[styles.serviceCard, compact && styles.serviceCardCompact]}>
      <View style={styles.serviceTopRow}>
        <View style={styles.serviceTopInfo}>
          <Text style={styles.serviceClient}>{servicio.cliente?.name || 'Cliente'}</Text>
          <Text style={styles.serviceCategory}>
            {servicio.categoria?.nombre || 'Servicio sin categoria'}
          </Text>
        </View>
        <StatusBadge estado={servicio.estado} />
      </View>

      <Text style={styles.serviceDescription}>{servicio.descripcion}</Text>

      <View style={styles.serviceMetaGrid}>
        <Text style={styles.serviceMeta}>Fecha: {formatDate(servicio.fecha_agendada || servicio.created_at)}</Text>
        <Text style={styles.serviceMeta}>Monto: {formatCurrency(servicio.monto_acordado)}</Text>
        <Text style={styles.serviceMeta}>Direccion: {servicio.direccion || 'Sin direccion'}</Text>
      </View>

      {servicio.motivo_cancelacion ? (
        <View style={styles.reasonBox}>
          <Text style={styles.reasonLabel}>Motivo</Text>
          <Text style={styles.reasonText}>{servicio.motivo_cancelacion}</Text>
        </View>
      ) : null}

      {canAccept ? (
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.acceptBtn} onPress={() => onAccept(servicio.id)}>
            <Text style={styles.acceptBtnText}>Aceptar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.rejectBtn} onPress={() => onReject(servicio.id)}>
            <Text style={styles.rejectBtnText}>Rechazar</Text>
          </TouchableOpacity>
        </View>
      ) : nextStatus ? (
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.advanceBtn}
            onPress={() => onAdvanceStatus(servicio.id, nextStatus)}
          >
            <Text style={styles.advanceBtnText}>
              Marcar como {nextStatus.replace(/_/g, ' ')}
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
}

export default function ProviderDashboardScreen({
  navigation,
  user,
  providerProfile,
  setProviderProfile,
  onLogout,
}) {
  const [profile, setProfile] = useState(providerProfile);
  const [documentos, setDocumentos] = useState([]);
  const [solicitudes, setSolicitudes] = useState([]);
  const [calificaciones, setCalificaciones] = useState([]);
  const [disponibilidad, setDisponibilidad] = useState(buildDisponibilidad());
  const [activeTab, setActiveTab] = useState('solicitudes');
  const [loadingProfile, setLoadingProfile] = useState(!providerProfile);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [loadingSolicitudes, setLoadingSolicitudes] = useState(false);
  const [loadingCalificaciones, setLoadingCalificaciones] = useState(false);
  const [loadingDisponibilidad, setLoadingDisponibilidad] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [savingDisponibilidad, setSavingDisponibilidad] = useState(false);
  const [mutatingServiceId, setMutatingServiceId] = useState(null);
  const [tipoDocumento, setTipoDocumento] = useState(TIPOS_DOCUMENTO[0]);
  const [showTipoSelector, setShowTipoSelector] = useState(false);
  const fileInputRef = useRef(null);

  const pendientes = useMemo(
    () => solicitudes.filter((item) => item.estado === 'pendiente'),
    [solicitudes]
  );
  const activas = useMemo(
    () => solicitudes.filter((item) => ['aceptado', 'en_camino', 'en_progreso'].includes(item.estado)),
    [solicitudes]
  );
  const historial = useMemo(
    () => solicitudes.filter((item) => ['completado', 'rechazado', 'cancelado'].includes(item.estado)),
    [solicitudes]
  );
  const reviewAverage = useMemo(() => {
    if (calificaciones.length === 0) {
      return Number(profile?.calificacion_promedio || 0);
    }
    const total = calificaciones.reduce((sum, item) => sum + Number(item.puntuacion || 0), 0);
    return total / calificaciones.length;
  }, [calificaciones, profile?.calificacion_promedio]);

  useEffect(() => {
    if (!profile && user) {
      loadProfile();
      return;
    }

    if (profile) {
      loadDashboardData(profile);
    }
  }, [user, profile?.id]);

  const loadProfile = async () => {
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
  };

  const loadDashboardData = async (provider) => {
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
      Alert.alert('Error', error.message);
    } finally {
      setLoadingDocs(false);
      setLoadingSolicitudes(false);
      setLoadingCalificaciones(false);
      setLoadingDisponibilidad(false);
    }
  };

  const refreshSolicitudes = async () => {
    setLoadingSolicitudes(true);
    try {
      const data = await getSolicitudesProveedor();
      setSolicitudes(data.servicios || []);
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoadingSolicitudes(false);
    }
  };

  const refreshCalificaciones = async () => {
    if (!profile) return;
    setLoadingCalificaciones(true);
    try {
      const data = await getCalificacionesProveedor(profile.id);
      setCalificaciones(data.calificaciones || []);
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoadingCalificaciones(false);
    }
  };

  const handleFileSelect = (event) => {
    const file = event.target?.files?.[0];
    if (!file) return;
    handleUpload(file);
  };

  const handleUpload = async (file) => {
    if (!profile) return;
    setUploading(true);
    try {
      const data = await uploadDocumento(profile.id, file, tipoDocumento);
      setDocumentos((prev) => [data.documento, ...prev]);
      Alert.alert('Documento subido', `"${file.name}" subido correctamente.`);
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleAccept = async (id) => {
    setMutatingServiceId(id);
    try {
      await aceptarServicio(id);
      await refreshSolicitudes();
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setMutatingServiceId(null);
    }
  };

  const handleReject = async (id) => {
    setMutatingServiceId(id);
    try {
      await rechazarServicio(id);
      await refreshSolicitudes();
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setMutatingServiceId(null);
    }
  };

  const handleAdvanceStatus = async (id, estado) => {
    setMutatingServiceId(id);
    try {
      await actualizarEstadoServicio(id, estado);
      await refreshSolicitudes();
      if (estado === 'completado') {
        await refreshCalificaciones();
      }
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setMutatingServiceId(null);
    }
  };

  const updateDay = (dayId, changes) => {
    setDisponibilidad((prev) =>
      prev.map((item) =>
        item.dia_semana === dayId
          ? { ...item, ...changes }
          : item
      )
    );
  };

  const handleSaveDisponibilidad = async () => {
    setSavingDisponibilidad(true);
    try {
      await saveDisponibilidad(disponibilidad);
      Alert.alert('Disponibilidad guardada', 'Tu horario semanal fue actualizado.');
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setSavingDisponibilidad(false);
    }
  };

  if (loadingProfile) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1a73e8" />
        <Text style={styles.loadingText}>Cargando panel...</Text>
      </View>
    );
  }

  if (!profile) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Mi panel</Text>
            <Text style={styles.headerSubtitle}>Proveedor de servicios</Text>
          </View>
          <TouchableOpacity style={styles.logoutBtn} onPress={onLogout}>
            <Text style={styles.logoutBtnText}>Salir</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.emptyCard}>
          <Text style={styles.emptyCardTitle}>Aun no tienes perfil de proveedor</Text>
          <Text style={styles.emptyCardText}>
            Completa tu perfil para recibir solicitudes y administrar disponibilidad.
          </Text>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => navigation.navigate('ProviderEditProfile')}
          >
            <Text style={styles.primaryBtnText}>Crear perfil</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  const renderSolicitudes = () => {
    if (loadingSolicitudes && solicitudes.length === 0) {
      return <ActivityIndicator color="#1a73e8" style={styles.sectionLoader} />;
    }

    return (
      <View style={styles.sectionStack}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Solicitudes entrantes</Text>
          <TouchableOpacity onPress={refreshSolicitudes}>
            <Text style={styles.linkText}>Actualizar</Text>
          </TouchableOpacity>
        </View>

        {pendientes.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No tienes solicitudes pendientes.</Text>
          </View>
        ) : (
          pendientes.map((servicio) => (
            <View key={servicio.id} style={mutatingServiceId === servicio.id && styles.disabledBlock}>
              <ServicioCard
                servicio={servicio}
                onAccept={handleAccept}
                onReject={handleReject}
                onAdvanceStatus={handleAdvanceStatus}
              />
            </View>
          ))
        )}

        <Text style={styles.subsectionTitle}>Servicios activos</Text>
        {activas.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No tienes servicios en curso.</Text>
          </View>
        ) : (
          activas.map((servicio) => (
            <View key={servicio.id} style={mutatingServiceId === servicio.id && styles.disabledBlock}>
              <ServicioCard
                servicio={servicio}
                onAccept={handleAccept}
                onReject={handleReject}
                onAdvanceStatus={handleAdvanceStatus}
              />
            </View>
          ))
        )}
      </View>
    );
  };

  const renderHistorial = () => (
    <View style={styles.sectionStack}>
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>Historial</Text>
        <Text style={styles.historyCounter}>{historial.length} registro(s)</Text>
      </View>
      {loadingSolicitudes && historial.length === 0 ? (
        <ActivityIndicator color="#1a73e8" style={styles.sectionLoader} />
      ) : historial.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>Aun no hay servicios finalizados o rechazados.</Text>
        </View>
      ) : (
        historial.map((servicio) => (
          <ServicioCard
            key={servicio.id}
            servicio={servicio}
            onAccept={handleAccept}
            onReject={handleReject}
            onAdvanceStatus={handleAdvanceStatus}
            compact
          />
        ))
      )}
    </View>
  );

  const renderCalificaciones = () => (
    <View style={styles.sectionStack}>
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>Calificaciones</Text>
        <TouchableOpacity onPress={refreshCalificaciones}>
          <Text style={styles.linkText}>Actualizar</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.ratingSummary}>
        <Text style={styles.ratingAverage}>
          {reviewAverage ? reviewAverage.toFixed(1) : '0.0'}
        </Text>
        <View>
          <Stars value={Math.round(reviewAverage || 0)} />
          <Text style={styles.ratingSummaryText}>
            {calificaciones.length || profile.total_calificaciones || 0} resena(s)
          </Text>
        </View>
      </View>

      {loadingCalificaciones && calificaciones.length === 0 ? (
        <ActivityIndicator color="#1a73e8" style={styles.sectionLoader} />
      ) : calificaciones.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>Aun no recibes calificaciones.</Text>
        </View>
      ) : (
        calificaciones.map((calificacion) => (
          <View key={calificacion.id} style={styles.reviewCard}>
            <View style={styles.reviewHeader}>
              <Text style={styles.reviewAuthor}>{calificacion.autor?.name || 'Usuario'}</Text>
              <Stars value={calificacion.puntuacion} />
            </View>
            {calificacion.comentario ? (
              <Text style={styles.reviewComment}>{calificacion.comentario}</Text>
            ) : (
              <Text style={styles.reviewMuted}>Sin comentario escrito.</Text>
            )}
          </View>
        ))
      )}
    </View>
  );

  const renderDisponibilidad = () => (
    <View style={styles.sectionStack}>
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>Disponibilidad semanal</Text>
        {loadingDisponibilidad ? <ActivityIndicator color="#1a73e8" size="small" /> : null}
      </View>

      {disponibilidad.map((item) => {
        const day = DIAS.find((entry) => entry.id === item.dia_semana);
        return (
          <View key={item.dia_semana} style={styles.scheduleRow}>
            <TouchableOpacity
              style={[styles.dayToggle, item.disponible && styles.dayToggleActive]}
              onPress={() => updateDay(item.dia_semana, { disponible: !item.disponible })}
            >
              <Text style={[styles.dayToggleText, item.disponible && styles.dayToggleTextActive]}>
                {day?.label || `Dia ${item.dia_semana}`}
              </Text>
            </TouchableOpacity>

            <View style={styles.timeInputsRow}>
              <TextInput
                style={[styles.timeInput, !item.disponible && styles.timeInputDisabled]}
                value={item.hora_inicio}
                onChangeText={(text) => updateDay(item.dia_semana, { hora_inicio: text })}
                editable={item.disponible}
                placeholder="08:00"
              />
              <Text style={styles.timeDivider}>a</Text>
              <TextInput
                style={[styles.timeInput, !item.disponible && styles.timeInputDisabled]}
                value={item.hora_fin}
                onChangeText={(text) => updateDay(item.dia_semana, { hora_fin: text })}
                editable={item.disponible}
                placeholder="17:00"
              />
            </View>
          </View>
        );
      })}

      <TouchableOpacity
        style={[styles.primaryBtn, savingDisponibilidad && styles.primaryBtnDisabled]}
        onPress={handleSaveDisponibilidad}
        disabled={savingDisponibilidad}
      >
        {savingDisponibilidad ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.primaryBtnText}>Guardar disponibilidad</Text>
        )}
      </TouchableOpacity>
    </View>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Mi panel</Text>
          <Text style={styles.headerSubtitle}>{profile.nombre}</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerGhostBtn}
            onPress={() => navigation.navigate('ProviderEditProfile')}
          >
            <Text style={styles.headerGhostBtnText}>Editar perfil</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.logoutBtn} onPress={onLogout}>
            <Text style={styles.logoutBtnText}>Salir</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryNumber}>{pendientes.length}</Text>
          <Text style={styles.summaryLabel}>Pendientes</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryNumber}>{activas.length}</Text>
          <Text style={styles.summaryLabel}>Activos</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryNumber}>{profile.total_calificaciones || 0}</Text>
          <Text style={styles.summaryLabel}>Resenas</Text>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Perfil publico</Text>
          <TouchableOpacity onPress={() => navigation.navigate('ProviderDetail', { provider: profile })}>
            <Text style={styles.linkText}>Ver como cliente</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.profileName}>{profile.nombre}</Text>
        <Text style={styles.profileDescription}>{profile.descripcion}</Text>
        <View style={styles.profileMetaWrap}>
          <Text style={styles.profileMeta}>{profile.categoria?.nombre || 'Sin categoria'}</Text>
          <Text style={styles.profileMeta}>{profile.departamento}</Text>
          {profile.tarifa_hora ? <Text style={styles.profileMeta}>Hora: {formatCurrency(profile.tarifa_hora)}</Text> : null}
          {profile.tarifa_proyecto ? <Text style={styles.profileMeta}>Proyecto: {formatCurrency(profile.tarifa_proyecto)}</Text> : null}
          {profile.nivel ? <Text style={styles.profileMeta}>Nivel: {profile.nivel}</Text> : null}
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Documentos de identidad</Text>
        <Text style={styles.cardSubtitle}>
          Sube documentos para validar tu identidad. Formatos: PDF, JPG, PNG.
        </Text>

        <TouchableOpacity
          style={styles.tipoSelector}
          onPress={() => setShowTipoSelector((prev) => !prev)}
        >
          <Text style={styles.tipoSelectorLabel}>Tipo:</Text>
          <Text style={styles.tipoSelectorValue} numberOfLines={1}>{tipoDocumento}</Text>
          <Text style={styles.tipoSelectorArrow}>{showTipoSelector ? '^' : 'v'}</Text>
        </TouchableOpacity>

        {showTipoSelector ? (
          <View style={styles.tipoList}>
            {TIPOS_DOCUMENTO.map((tipo) => (
              <TouchableOpacity
                key={tipo}
                style={[styles.tipoOption, tipoDocumento === tipo && styles.tipoOptionActive]}
                onPress={() => {
                  setTipoDocumento(tipo);
                  setShowTipoSelector(false);
                }}
              >
                <Text style={[styles.tipoOptionText, tipoDocumento === tipo && styles.tipoOptionTextActive]}>
                  {tipo}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : null}

        {Platform.OS === 'web' ? (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              style={{ display: 'none' }}
              onChange={handleFileSelect}
            />
            <TouchableOpacity
              style={styles.uploadBtn}
              onPress={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? <ActivityIndicator color="#fff" /> : <Text style={styles.uploadBtnText}>Subir documento</Text>}
            </TouchableOpacity>
          </>
        ) : (
          <View style={styles.uploadInfo}>
            <Text style={styles.uploadInfoText}>La carga de archivos esta disponible en la version web.</Text>
          </View>
        )}

        {loadingDocs ? (
          <ActivityIndicator color="#1a73e8" style={styles.sectionLoader} />
        ) : documentos.length === 0 ? (
          <Text style={styles.emptyInlineText}>Aun no has subido documentos.</Text>
        ) : (
          documentos.map((doc) => (
            <View key={doc.id} style={styles.documentRow}>
              <View style={styles.documentInfo}>
                <Text style={styles.documentType}>{doc.tipo_documento}</Text>
                <Text style={styles.documentName}>{doc.nombre_archivo}</Text>
              </View>
              <StatusBadge estado={doc.estado_validacion} />
            </View>
          ))
        )}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabsRow}
      >
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

      <View style={styles.card}>
        {activeTab === 'solicitudes' && renderSolicitudes()}
        {activeTab === 'historial' && renderHistorial()}
        {activeTab === 'calificaciones' && renderCalificaciones()}
        {activeTab === 'disponibilidad' && renderDisponibilidad()}
      </View>

      <TouchableOpacity style={styles.secondaryHomeBtn} onPress={() => navigation.navigate('Home')}>
        <Text style={styles.secondaryHomeBtnText}>Ver listado de proveedores</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  content: { padding: 16, paddingBottom: 40 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 16, color: '#666' },
  header: {
    backgroundColor: '#1a73e8',
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    flexWrap: 'wrap',
    gap: 10,
  },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#fff' },
  headerSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.82)', marginTop: 4 },
  headerActions: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  headerGhostBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  headerGhostBtnText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  logoutBtn: {
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  logoutBtnText: { color: '#1a73e8', fontWeight: '700', fontSize: 13 },
  emptyCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
  },
  emptyCardTitle: { fontSize: 18, fontWeight: '700', color: '#333', marginBottom: 8 },
  emptyCardText: { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 18, lineHeight: 20 },
  summaryRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  summaryCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  summaryNumber: { fontSize: 24, fontWeight: '800', color: '#1a73e8' },
  summaryLabel: { marginTop: 4, fontSize: 12, color: '#666' },
  card: {
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
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  cardTitle: { fontSize: 17, fontWeight: '700', color: '#333' },
  cardSubtitle: { fontSize: 13, color: '#666', marginBottom: 12, lineHeight: 18 },
  linkText: { color: '#1a73e8', fontWeight: '700', fontSize: 13 },
  profileName: { fontSize: 18, fontWeight: '700', color: '#222', marginBottom: 8 },
  profileDescription: { fontSize: 14, color: '#555', lineHeight: 20 },
  profileMetaWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  profileMeta: {
    backgroundColor: '#eef4ff',
    color: '#2754a6',
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  tipoSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f7f9fc',
    borderWidth: 1,
    borderColor: '#d9e2ef',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
    gap: 8,
  },
  tipoSelectorLabel: { fontSize: 13, fontWeight: '600', color: '#666' },
  tipoSelectorValue: { flex: 1, fontSize: 13, color: '#333' },
  tipoSelectorArrow: { fontSize: 12, color: '#999' },
  tipoList: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    marginBottom: 10,
    overflow: 'hidden',
  },
  tipoOption: { paddingHorizontal: 14, paddingVertical: 10 },
  tipoOptionActive: { backgroundColor: '#e3f2fd' },
  tipoOptionText: { fontSize: 13, color: '#555' },
  tipoOptionTextActive: { color: '#1a73e8', fontWeight: '600' },
  uploadBtn: {
    backgroundColor: '#1a73e8',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  uploadBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  uploadInfo: {
    borderWidth: 1,
    borderColor: '#d9e2ef',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    backgroundColor: '#f8fafc',
  },
  uploadInfoText: { color: '#666', fontSize: 13 },
  documentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  documentInfo: { flex: 1 },
  documentType: { fontSize: 12, fontWeight: '700', color: '#555', marginBottom: 2 },
  documentName: { fontSize: 13, color: '#777' },
  emptyInlineText: { fontSize: 14, color: '#999', textAlign: 'center', paddingVertical: 8 },
  tabsRow: { gap: 10, paddingBottom: 12 },
  tabBtn: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d8e0ee',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
  },
  tabBtnActive: { backgroundColor: '#1a73e8', borderColor: '#1a73e8' },
  tabBtnText: { color: '#567', fontWeight: '600', fontSize: 13 },
  tabBtnTextActive: { color: '#fff' },
  sectionStack: { gap: 12 },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#333' },
  subsectionTitle: { fontSize: 15, fontWeight: '700', color: '#333', marginTop: 4 },
  historyCounter: { fontSize: 13, color: '#667085' },
  sectionLoader: { marginVertical: 12 },
  emptyState: {
    borderWidth: 1,
    borderColor: '#e6ebf2',
    borderStyle: 'dashed',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    backgroundColor: '#fafcff',
  },
  emptyStateText: { fontSize: 14, color: '#667085', textAlign: 'center' },
  serviceCard: {
    borderWidth: 1,
    borderColor: '#edf2f7',
    borderRadius: 12,
    padding: 14,
    backgroundColor: '#fbfdff',
  },
  serviceCardCompact: { backgroundColor: '#fff' },
  serviceTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 10,
  },
  serviceTopInfo: { flex: 1 },
  serviceClient: { fontSize: 15, fontWeight: '700', color: '#2a2a2a' },
  serviceCategory: { fontSize: 12, color: '#6b7280', marginTop: 3 },
  statusBadge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  statusBadgeText: { fontSize: 12, fontWeight: '700', textTransform: 'capitalize' },
  serviceDescription: { fontSize: 14, color: '#4b5563', lineHeight: 20, marginBottom: 10 },
  serviceMetaGrid: { gap: 4 },
  serviceMeta: { fontSize: 12, color: '#667085' },
  reasonBox: {
    marginTop: 10,
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#fff5f5',
  },
  reasonLabel: { fontSize: 11, fontWeight: '700', color: '#842029', marginBottom: 4 },
  reasonText: { fontSize: 13, color: '#842029' },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 12, flexWrap: 'wrap' },
  acceptBtn: {
    backgroundColor: '#16a34a',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
  },
  acceptBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  rejectBtn: {
    backgroundColor: '#fff1f2',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
  },
  rejectBtnText: { color: '#be123c', fontWeight: '700', fontSize: 13 },
  advanceBtn: {
    backgroundColor: '#1a73e8',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
  },
  advanceBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  disabledBlock: { opacity: 0.65 },
  ratingSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#f8fbff',
  },
  ratingAverage: { fontSize: 34, fontWeight: '800', color: '#1a73e8' },
  ratingSummaryText: { fontSize: 13, color: '#667085', marginTop: 4 },
  starsRow: { flexDirection: 'row', gap: 2 },
  star: { fontSize: 16, fontWeight: '700' },
  starOn: { color: '#f59e0b' },
  starOff: { color: '#cbd5e1' },
  reviewCard: {
    borderWidth: 1,
    borderColor: '#edf2f7',
    borderRadius: 12,
    padding: 14,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  reviewAuthor: { fontSize: 14, fontWeight: '700', color: '#333' },
  reviewComment: { fontSize: 14, color: '#555', lineHeight: 20 },
  reviewMuted: { fontSize: 13, color: '#9aa0aa' },
  scheduleRow: {
    borderWidth: 1,
    borderColor: '#edf2f7',
    borderRadius: 12,
    padding: 12,
    gap: 12,
  },
  dayToggle: {
    borderWidth: 1,
    borderColor: '#d8e0ee',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
  },
  dayToggleActive: { backgroundColor: '#ecfdf3', borderColor: '#86efac' },
  dayToggleText: { fontSize: 14, fontWeight: '600', color: '#4b5563' },
  dayToggleTextActive: { color: '#166534' },
  timeInputsRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  timeInput: {
    flex: 1,
    backgroundColor: '#f7f9fc',
    borderWidth: 1,
    borderColor: '#d9e2ef',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#333',
  },
  timeInputDisabled: { backgroundColor: '#f3f4f6', color: '#98a2b3' },
  timeDivider: { color: '#667085', fontSize: 13, fontWeight: '600' },
  primaryBtn: {
    backgroundColor: '#1a73e8',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  primaryBtnDisabled: { opacity: 0.65 },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  secondaryHomeBtn: {
    backgroundColor: '#eef2f7',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  secondaryHomeBtnText: { color: '#475467', fontWeight: '700', fontSize: 14 },
});
