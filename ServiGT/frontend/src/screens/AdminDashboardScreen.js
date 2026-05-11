import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { getAdminProveedores, getAdminStats, getAdminUsuarios } from '../services/api';
import { useToast } from '../context/ToastContext';
import { T } from '../theme';

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

  const [activeTab, setActiveTab] = useState('stats');
  const [stats, setStats] = useState(null);
  const [usuarios, setUsuarios] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [roleFilter, setRoleFilter] = useState(null);

  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingUsuarios, setLoadingUsuarios] = useState(false);
  const [loadingProveedores, setLoadingProveedores] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

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
              {p.tarifa_hora ? <Text style={styles.metaText}>Q{Number(p.tarifa_hora).toFixed(2)}/hr</Text> : null}
              {p.nivel ? <Text style={styles.metaText}>Nivel: {p.nivel}</Text> : null}
            </View>
          </View>
        ))
      )}
    </View>
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.navigate('Home')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.backText}>← Inicio</Text>
        </TouchableOpacity>
        <Text style={styles.topTitle}>Panel admin</Text>
        <View style={{ width: 60 }} />
      </View>

      <Text style={styles.subtitle}>Hola, {user?.name || 'Admin'}</Text>

      <View style={styles.tabsRow}>
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.canvas },
  content:   { padding: T.s4, paddingBottom: 40 },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: T.s2,
    marginBottom: T.s2,
  },
  backText:  { color: T.blue, fontSize: 15, fontWeight: '600' },
  topTitle:  { fontSize: 18, fontWeight: '800', color: T.ink },

  subtitle:  { fontSize: 14, color: T.muted, marginBottom: T.s4 },

  tabsRow: {
    flexDirection: 'row',
    gap: T.s2,
    marginBottom: T.s4,
  },
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

  badge:      { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 },
  badgeText:  { fontSize: 11, fontWeight: '700' },

  emptyText: { fontSize: 14, color: T.muted, textAlign: 'center', padding: T.s6 },
  center:    { paddingVertical: T.s6, alignItems: 'center' },
  loadingText: { marginTop: T.s2, color: T.muted, fontSize: 14 },
});
