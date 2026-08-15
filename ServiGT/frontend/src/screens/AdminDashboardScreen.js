import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import {
  getAdminProveedores,
  getAdminStats,
  getAdminUsuarios,
  recargarCreditosProveedor,
} from '../services/api';
import { useToast } from '../context/ToastContext';
import { T } from '../theme';
import { Button, ScreenHeader } from '../components/ui';

const ESTADO_LABEL = {
  pendiente:   'Pendientes',
  aceptado:    'Aceptados',
  en_camino:   'En camino',
  en_progreso: 'En progreso',
  completado:  'Completados',
  cancelado:   'Cancelados',
  rechazado:   'Rechazados',
};

const ROLE_LABEL = {
  cliente:   { text: 'Cliente',   bg: '#e6f6ec', color: '#1f7a3c' },
  proveedor: { text: 'Proveedor', bg: '#fff4e0', color: '#b76e00' },
  admin:     { text: 'Admin',     bg: '#ede9fe', color: '#6b21a8' },
};

const TABS = [
  { key: 'stats',       label: 'Resumen' },
  { key: 'usuarios',    label: 'Usuarios' },
  { key: 'proveedores', label: 'Proveedores' },
];

const ROLE_FILTERS = [
  { key: null,         label: 'Todos' },
  { key: 'cliente',    label: 'Clientes' },
  { key: 'proveedor',  label: 'Proveedores' },
  { key: 'admin',      label: 'Admins' },
];

function MetricCard({ label, value, color = T.blue }) {
  return (
    <View style={[styles.metricCard, { borderLeftColor: color }]}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={[styles.metricValue, { color }]}>{value}</Text>
    </View>
  );
}

function RoleBadge({ role }) {
  const cfg = ROLE_LABEL[role] || ROLE_LABEL.cliente;
  return (
    <View style={[styles.badge, { backgroundColor: cfg.bg }]}>
      <Text style={[styles.badgeText, { color: cfg.color }]}>{cfg.text}</Text>
    </View>
  );
}

export default function AdminDashboardScreen({ navigation, user }) {
  const toast = useToast();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 900;
  // A 390px el hero en fila dejaba el titulo en dos letras por linea.
  const isNarrow = width < 700;

  const [activeTab, setActiveTab] = useState('stats');
  const [stats, setStats] = useState(null);
  const [usuarios, setUsuarios] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [roleFilter, setRoleFilter] = useState(null);

  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingUsuarios, setLoadingUsuarios] = useState(false);
  const [loadingProveedores, setLoadingProveedores] = useState(false);
  const [savingRecarga, setSavingRecarga] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [recargaModalVisible, setRecargaModalVisible] = useState(false);
  const [selectedProveedorId, setSelectedProveedorId] = useState(null);
  const [recargaMonto, setRecargaMonto] = useState('');
  const [recargaMotivo, setRecargaMotivo] = useState('');

  const fetchStats = useCallback(async () => {
    setLoadingStats(true);
    try {
      const data = await getAdminStats();
      setStats(data);
    } catch (error) {
      toast(error.message, 'error');
    } finally {
      setLoadingStats(false);
    }
  }, [toast]);

  const fetchUsuarios = useCallback(async () => {
    setLoadingUsuarios(true);
    try {
      const data = await getAdminUsuarios(roleFilter);
      setUsuarios(data.usuarios || []);
    } catch (error) {
      toast(error.message, 'error');
    } finally {
      setLoadingUsuarios(false);
    }
  }, [roleFilter, toast]);

  const fetchProveedores = useCallback(async () => {
    setLoadingProveedores(true);
    try {
      const data = await getAdminProveedores();
      setProveedores(data.proveedores || []);
    } catch (error) {
      toast(error.message, 'error');
    } finally {
      setLoadingProveedores(false);
    }
  }, [toast]);

  useEffect(() => { fetchStats(); }, [fetchStats]);
  useEffect(() => { if (activeTab === 'usuarios') fetchUsuarios(); }, [activeTab, fetchUsuarios]);
  useEffect(() => { if (activeTab === 'proveedores') fetchProveedores(); }, [activeTab, fetchProveedores]);

  const onRefresh = async () => {
    setRefreshing(true);
    if (activeTab === 'stats')       await fetchStats();
    if (activeTab === 'usuarios')    await fetchUsuarios();
    if (activeTab === 'proveedores') await fetchProveedores();
    setRefreshing(false);
  };

  const openRecargaModal = async (proveedor = null) => {
    if (proveedor) setSelectedProveedorId(proveedor.id);
    setRecargaMonto('');
    setRecargaMotivo('');
    setRecargaModalVisible(true);
    if (proveedores.length === 0) {
      await fetchProveedores();
    }
  };

  const closeRecargaModal = () => {
    if (!savingRecarga) setRecargaModalVisible(false);
  };

  const handleRecargaSubmit = async () => {
    const monto = Number.parseInt(recargaMonto, 10);
    if (!selectedProveedorId) {
      toast('Selecciona un proveedor.', 'error');
      return;
    }
    if (!Number.isInteger(monto) || monto < 1) {
      toast('Ingresa una cantidad valida de creditos.', 'error');
      return;
    }
    if (recargaMotivo.trim().length < 5) {
      toast('Agrega un motivo de al menos 5 caracteres.', 'error');
      return;
    }

    setSavingRecarga(true);
    try {
      const data = await recargarCreditosProveedor(selectedProveedorId, {
        monto,
        motivo: recargaMotivo.trim(),
      });
      toast(data.message || 'Creditos agregados correctamente.', 'success');
      setRecargaModalVisible(false);
      await Promise.all([fetchStats(), fetchProveedores()]);
    } catch (error) {
      toast(error.message, 'error');
    } finally {
      setSavingRecarga(false);
    }
  };

  const renderStats = () => {
    if (loadingStats && !stats) {
      return (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={T.blue} />
          <Text style={styles.loadingText}>Cargando metricas...</Text>
        </View>
      );
    }
    if (!stats) return null;

    return (
      <View>
        <View style={[styles.heroPanel, isNarrow && styles.heroPanelNarrow]}>
          <View style={styles.heroCopy}>
            <Text style={styles.heroEyebrow}>Dashboard operativo</Text>
            <Text style={styles.heroTitle}>Control de ServiGT</Text>
            <Text style={styles.heroText}>
              Supervisa usuarios, proveedores, servicios y creditos desde el mismo entorno de la app.
            </Text>
          </View>
          <View style={[styles.heroActions, isNarrow && styles.heroActionsNarrow]}>
            <TouchableOpacity style={styles.heroButton} onPress={() => openRecargaModal()}>
              <Text style={styles.heroButtonText}>+ Agregar creditos</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Usuarios</Text>
        <View style={styles.grid}>
          <MetricCard label="Total"          value={stats.usuarios.total}        color={T.blue} />
          <MetricCard label="Clientes"       value={stats.usuarios.clientes}     color={T.success} />
          <MetricCard label="Proveedores"    value={stats.usuarios.proveedores}  color={T.warn} />
          <MetricCard label="Administradores" value={stats.usuarios.admins}      color="#6b21a8" />
        </View>

        <Text style={styles.sectionTitle}>Proveedores</Text>
        <View style={styles.grid}>
          <MetricCard label="Total"          value={stats.proveedores.total}        color={T.blue} />
          <MetricCard label="Verificados"    value={stats.proveedores.verificados}  color={T.success} />
          <MetricCard
            label="Calif. promedio"
            value={Number(stats.proveedores.calificacion_promedio_global ?? 0).toFixed(2)}
            color={T.amber}
          />
          <MetricCard
            label="Creditos disponibles"
            value={stats.proveedores.creditos_disponibles ?? 0}
            color={T.deep}
          />
          <MetricCard
            label="Recargas manuales"
            value={stats.proveedores.creditos_recargados ?? 0}
            color={T.success}
          />
        </View>

        <Text style={styles.sectionTitle}>Servicios</Text>
        <View style={styles.grid}>
          <MetricCard label="Total" value={stats.servicios.total} color={T.blue} />
          {Object.entries(stats.servicios.por_estado || {}).map(([estado, total]) => (
            <MetricCard
              key={estado}
              label={ESTADO_LABEL[estado] || estado}
              value={total}
              color={T.muted}
            />
          ))}
        </View>
      </View>
    );
  };

  const renderUsuarios = () => (
    <View>
      <View style={styles.filterRow}>
        {ROLE_FILTERS.map((opt) => {
          const active = roleFilter === opt.key;
          return (
            <TouchableOpacity
              key={opt.label}
              style={[styles.filterChip, active && styles.filterChipActive]}
              onPress={() => setRoleFilter(opt.key)}
            >
              <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {loadingUsuarios ? (
        <View style={styles.center}>
          <ActivityIndicator color={T.blue} />
        </View>
      ) : usuarios.length === 0 ? (
        <Text style={styles.emptyText}>No hay usuarios con ese filtro.</Text>
      ) : (
        usuarios.map((u) => (
          <View key={u.id} style={styles.listCard}>
            <View style={styles.listCardTop}>
              <Text style={styles.listCardTitle} numberOfLines={1}>{u.name}</Text>
              <RoleBadge role={u.role} />
            </View>
            <Text style={styles.listCardSub}>{u.email}</Text>
            <View style={styles.listCardMeta}>
              {u.telefono ? <Text style={styles.metaText}>{u.telefono}</Text> : null}
              {u.role === 'proveedor' && (
                <Text style={styles.metaText}>
                  {u.documento_verificado ? '✓ Verificado' : '⚠ Sin verificar'}
                </Text>
              )}
            </View>
          </View>
        ))
      )}
    </View>
  );

  const renderProveedores = () => (
    <View>
      {loadingProveedores ? (
        <View style={styles.center}>
          <ActivityIndicator color={T.blue} />
        </View>
      ) : proveedores.length === 0 ? (
        <Text style={styles.emptyText}>No hay proveedores registrados.</Text>
      ) : (
        proveedores.map((p) => (
          <View key={p.id} style={styles.listCard}>
            <View style={styles.listCardTop}>
              <Text style={styles.listCardTitle} numberOfLines={1}>{p.nombre}</Text>
              {p.user?.documento_verificado ? (
                <View style={[styles.badge, { backgroundColor: '#e6f6ec' }]}>
                  <Text style={[styles.badgeText, { color: '#1f7a3c' }]}>Verificado</Text>
                </View>
              ) : null}
            </View>
            <Text style={styles.listCardSub}>
              {p.categoria?.nombre || 'Sin categoria'} · {[p.municipio, p.departamento].filter(Boolean).join(', ') || 'Sin ubicacion'}
            </Text>
            <View style={styles.listCardMeta}>
              <Text style={styles.metaText}>
                ★ {Number(p.calificacion_promedio ?? 0).toFixed(1)}
              </Text>
              <Text style={styles.metaText}>Creditos: {p.credito?.saldo ?? 0}</Text>
              {p.tarifa_hora ? <Text style={styles.metaText}>Q{Number(p.tarifa_hora).toFixed(2)}/hr</Text> : null}
              {p.nivel ? <Text style={styles.metaText}>Nivel: {p.nivel}</Text> : null}
            </View>
            <TouchableOpacity style={styles.inlineAction} onPress={() => openRecargaModal(p)}>
              <Text style={styles.inlineActionText}>Agregar creditos</Text>
            </TouchableOpacity>
          </View>
        ))
      )}
    </View>
  );

  const selectedProveedor = proveedores.find((p) => p.id === selectedProveedorId);

  const renderRecargaModal = () => (
    <Modal transparent visible={recargaModalVisible} animationType="fade" onRequestClose={closeRecargaModal}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <View style={styles.modalHead}>
            <View>
              <Text style={styles.modalTitle}>Agregar creditos</Text>
              <Text style={styles.modalSubtitle}>Recarga manual sin pagos reales.</Text>
            </View>
            <TouchableOpacity onPress={closeRecargaModal} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.modalClose}>x</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.inputLabel}>Proveedor</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.providerPicker}>
            {proveedores.map((p) => {
              const active = selectedProveedorId === p.id;
              return (
                <TouchableOpacity
                  key={p.id}
                  style={[styles.providerChip, active && styles.providerChipActive]}
                  onPress={() => setSelectedProveedorId(p.id)}
                >
                  <Text style={[styles.providerChipName, active && styles.providerChipNameActive]} numberOfLines={1}>
                    {p.nombre}
                  </Text>
                  <Text style={[styles.providerChipSaldo, active && styles.providerChipSaldoActive]}>
                    {p.credito?.saldo ?? 0} cred.
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {selectedProveedor ? (
            <View style={styles.selectedBox}>
              <Text style={styles.selectedName}>{selectedProveedor.nombre}</Text>
              <Text style={styles.selectedMeta}>
                Saldo actual: {selectedProveedor.credito?.saldo ?? 0} creditos
              </Text>
            </View>
          ) : null}

          <Text style={styles.inputLabel}>Cantidad de creditos</Text>
          <TextInput
            style={styles.input}
            value={recargaMonto}
            onChangeText={setRecargaMonto}
            keyboardType="number-pad"
            placeholder="Ej. 5"
            placeholderTextColor={T.faint}
          />

          <Text style={styles.inputLabel}>Motivo</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={recargaMotivo}
            onChangeText={setRecargaMotivo}
            multiline
            maxLength={255}
            placeholder="Ej. Recarga manual validada por administracion"
            placeholderTextColor={T.faint}
          />

          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.secondaryBtn} onPress={closeRecargaModal} disabled={savingRecarga}>
              <Text style={styles.secondaryBtnText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.primaryBtn, savingRecarga && styles.primaryBtnDisabled]}
              onPress={handleRecargaSubmit}
              disabled={savingRecarga}
            >
              {savingRecarga ? (
                <ActivityIndicator color={T.white} size="small" />
              ) : (
                <Text style={styles.primaryBtnText}>Guardar recarga</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Panel admin"
        subtitle={`Hola, ${user?.name || 'Admin'}`}
        onBack={() => navigation.navigate('Home')}
        backLabel="Inicio"
        right={
          <Button
            kind="secondary"
            size="sm"
            icon="credit-card"
            onPress={() => navigation.navigate('AdminCreditos')}
          >
            {isNarrow ? 'Créditos' : 'Créditos y Premium'}
          </Button>
        }
      />

    <ScrollView
      contentContainerStyle={[styles.content, isDesktop && styles.contentDesktop]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={[styles.tabsRow, isDesktop && styles.tabsRowDesktop]}>
        {TABS.map((tab) => {
          const active = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tabBtn, active && styles.tabBtnActive]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Text style={[styles.tabText, active && styles.tabTextActive]}>{tab.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.tabContent}>
        {activeTab === 'stats'       && renderStats()}
        {activeTab === 'usuarios'    && renderUsuarios()}
        {activeTab === 'proveedores' && renderProveedores()}
      </View>
      {renderRecargaModal()}
    </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.canvas },
  content:   { padding: T.s4, paddingBottom: 40 },
  contentDesktop: { width: '100%', maxWidth: 1120, alignSelf: 'center', paddingHorizontal: T.s6 },

  tabsRow: {
    flexDirection: 'row',
    gap: T.s2,
    marginBottom: T.s4,
  },
  tabsRowDesktop: { maxWidth: 520 },
  tabBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: T.rSm,
    borderWidth: 1,
    borderColor: T.inputBorder,
    backgroundColor: T.paper,
    alignItems: 'center',
  },
  tabBtnActive: { backgroundColor: T.blue, borderColor: T.blue },
  tabText:       { color: T.muted, fontSize: 14, fontWeight: '700' },
  tabTextActive: { color: T.white },

  tabContent: { gap: T.s2 },

  sectionTitle: { fontSize: 15, fontWeight: '700', color: T.ink, marginTop: T.s3, marginBottom: T.s2 },

  heroPanel: {
    backgroundColor: T.ink,
    borderRadius: T.rMd,
    padding: T.s5,
    marginBottom: T.s4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: T.s4,
    ...T.sh2,
  },
  heroPanelNarrow: { flexDirection: 'column', alignItems: 'stretch', gap: T.s3 },
  heroActions: { flexShrink: 0 },
  heroActionsNarrow: { width: '100%' },
  heroCopy: { flex: 1, minWidth: 0 },
  heroEyebrow: { color: T.soft, fontSize: 12, fontWeight: '800', textTransform: 'uppercase', marginBottom: 6 },
  heroTitle: { color: T.white, fontSize: 24, fontWeight: '900' },
  heroText: { color: 'rgba(255,255,255,0.72)', fontSize: 13, lineHeight: 19, marginTop: 4 },
  heroButton: {
    backgroundColor: T.blue,
    borderRadius: T.rSm,
    paddingHorizontal: T.s4,
    paddingVertical: 12,
    alignItems: 'center',
  },
  heroButtonText: { color: T.white, fontSize: 13, fontWeight: '800' },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: T.s3, marginBottom: T.s2 },
  metricCard: {
    flexGrow: 1,
    flexBasis: 150,
    backgroundColor: T.paper,
    borderRadius: T.rMd,
    padding: T.s4,
    borderLeftWidth: 4,
    ...T.sh1,
  },
  metricLabel: { fontSize: 12, color: T.muted, marginBottom: 6 },
  metricValue: { fontSize: 26, fontWeight: '800' },

  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: T.s2, marginBottom: T.s3 },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: T.inputBorder,
    backgroundColor: T.paper,
  },
  filterChipActive: { backgroundColor: T.blue, borderColor: T.blue },
  filterChipText:        { color: T.muted, fontSize: 12, fontWeight: '700' },
  filterChipTextActive:  { color: T.white },

  listCard: {
    backgroundColor: T.paper,
    borderRadius: T.rMd,
    padding: T.s4,
    marginBottom: T.s3,
    ...T.sh1,
  },
  listCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: T.s2 },
  listCardTitle: { flex: 1, fontSize: 15, fontWeight: '800', color: T.ink },
  listCardSub: { fontSize: 13, color: T.muted, marginTop: 4 },
  listCardMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginTop: T.s2 },
  metaText: { fontSize: 12, color: T.muted, fontWeight: '600' },
  inlineAction: {
    alignSelf: 'flex-start',
    marginTop: T.s3,
    backgroundColor: T.blue,
    borderRadius: T.rSm,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  inlineActionText: { color: T.white, fontSize: 12, fontWeight: '800' },

  badge:      { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 },
  badgeText:  { fontSize: 11, fontWeight: '700' },

  emptyText: { fontSize: 14, color: T.muted, textAlign: 'center', padding: T.s6 },
  center:    { paddingVertical: T.s6, alignItems: 'center' },
  loadingText: { marginTop: T.s2, color: T.muted, fontSize: 14 },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(14,20,36,0.46)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: T.s4,
  },
  modalCard: {
    width: '100%',
    maxWidth: 560,
    backgroundColor: T.paper,
    borderRadius: T.rMd,
    padding: T.s5,
    ...T.sh3,
  },
  modalHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: T.s3 },
  modalTitle: { fontSize: 20, fontWeight: '900', color: T.ink },
  modalSubtitle: { marginTop: 2, fontSize: 13, color: T.muted },
  modalClose: { fontSize: 20, color: T.muted, fontWeight: '900' },
  inputLabel: { marginTop: T.s4, marginBottom: 6, fontSize: 12, fontWeight: '800', color: T.ink },
  providerPicker: { gap: T.s2, paddingVertical: 2 },
  providerChip: {
    width: 150,
    borderWidth: 1,
    borderColor: T.inputBorder,
    backgroundColor: T.white,
    borderRadius: T.rSm,
    paddingHorizontal: T.s3,
    paddingVertical: 10,
  },
  providerChipActive: { borderColor: T.blue, backgroundColor: '#eef4ff' },
  providerChipName: { color: T.ink, fontSize: 13, fontWeight: '800' },
  providerChipNameActive: { color: T.deep },
  providerChipSaldo: { color: T.muted, fontSize: 11, marginTop: 2, fontWeight: '700' },
  providerChipSaldoActive: { color: T.deep },
  selectedBox: {
    marginTop: T.s3,
    borderWidth: 1,
    borderColor: T.border,
    backgroundColor: T.white,
    borderRadius: T.rSm,
    padding: T.s3,
  },
  selectedName: { color: T.ink, fontSize: 13, fontWeight: '900' },
  selectedMeta: { color: T.muted, fontSize: 12, marginTop: 2 },
  input: {
    backgroundColor: T.white,
    borderWidth: 1,
    borderColor: T.inputBorder,
    borderRadius: T.rSm,
    color: T.text,
    fontSize: 15,
    paddingHorizontal: T.s3,
    paddingVertical: 11,
  },
  textArea: { minHeight: 86, textAlignVertical: 'top' },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: T.s2, marginTop: T.s5 },
  secondaryBtn: {
    borderWidth: 1,
    borderColor: T.inputBorder,
    borderRadius: T.rSm,
    paddingHorizontal: T.s4,
    paddingVertical: 11,
    backgroundColor: T.white,
  },
  secondaryBtnText: { color: T.muted, fontSize: 13, fontWeight: '800' },
  primaryBtn: {
    minWidth: 150,
    borderRadius: T.rSm,
    paddingHorizontal: T.s4,
    paddingVertical: 11,
    backgroundColor: T.blue,
    alignItems: 'center',
  },
  primaryBtnDisabled: { backgroundColor: T.soft },
  primaryBtnText: { color: T.white, fontSize: 13, fontWeight: '900' },
});
