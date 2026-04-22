import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { getAdminStats } from '../services/api';

const ESTADOS_LABEL = {
  pendiente: 'Pendientes',
  aceptado: 'Aceptados',
  en_camino: 'En camino',
  en_progreso: 'En progreso',
  completado: 'Completados',
  cancelado: 'Cancelados',
  rechazado: 'Rechazados',
};

export default function AdminDashboardScreen({ navigation, user, onLogout }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const data = await getAdminStats();
      setStats(data);
    } catch (error) {
      setErrorMsg(error.message);
    } finally {
      setLoading(false);
    }
  };

  const renderMetricCard = (label, value, color = '#1a73e8') => (
    <View style={[styles.card, { borderLeftColor: color }]} key={label}>
      <Text style={styles.cardLabel}>{label}</Text>
      <Text style={[styles.cardValue, { color }]}>{value}</Text>
    </View>
  );

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Panel de Administrador</Text>
          <Text style={styles.subtitle}>
            Hola, {user?.name || 'Admin'} — ServiGT
          </Text>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={onLogout}>
          <Text style={styles.logoutText}>Cerrar sesion</Text>
        </TouchableOpacity>
      </View>

      {errorMsg ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{errorMsg}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={loadStats}>
            <Text style={styles.retryText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {loading ? (
        <View style={styles.loaderBox}>
          <ActivityIndicator size="large" color="#1a73e8" />
          <Text style={styles.loaderText}>Cargando metricas...</Text>
        </View>
      ) : stats ? (
        <>
          <Text style={styles.sectionTitle}>Usuarios</Text>
          <View style={styles.grid}>
            {renderMetricCard('Total usuarios', stats.usuarios.total, '#1a73e8')}
            {renderMetricCard('Clientes', stats.usuarios.clientes, '#10b981')}
            {renderMetricCard('Proveedores', stats.usuarios.proveedores, '#f59e0b')}
            {renderMetricCard('Administradores', stats.usuarios.admins, '#6b21a8')}
          </View>

          <Text style={styles.sectionTitle}>Proveedores</Text>
          <View style={styles.grid}>
            {renderMetricCard('Total proveedores', stats.proveedores.total, '#1a73e8')}
            {renderMetricCard('Verificados', stats.proveedores.verificados, '#10b981')}
            {renderMetricCard(
              'Calif. promedio',
              stats.proveedores.calificacion_promedio_global.toFixed(2),
              '#f59e0b',
            )}
          </View>

          <Text style={styles.sectionTitle}>Servicios</Text>
          <View style={styles.grid}>
            {renderMetricCard('Total servicios', stats.servicios.total, '#1a73e8')}
            {Object.entries(stats.servicios.por_estado || {}).map(([estado, total]) =>
              renderMetricCard(ESTADOS_LABEL[estado] || estado, total, '#64748b'),
            )}
          </View>

          <Text style={styles.sectionTitle}>Gestion</Text>
          <View style={styles.actionsCol}>
            <View style={styles.actionCard}>
              <Text style={styles.actionTitle}>Gestion de usuarios</Text>
              <Text style={styles.actionDesc}>
                Listar, filtrar por rol, suspender o verificar cuentas.
              </Text>
              <Text style={styles.soon}>(Proximamente)</Text>
            </View>
            <View style={styles.actionCard}>
              <Text style={styles.actionTitle}>Gestion de proveedores</Text>
              <Text style={styles.actionDesc}>
                Aprobar documentos, ver calificaciones, cambiar nivel.
              </Text>
              <Text style={styles.soon}>(Proximamente)</Text>
            </View>
            <View style={styles.actionCard}>
              <Text style={styles.actionTitle}>Reportes y auditoria</Text>
              <Text style={styles.actionDesc}>
                Actividad por periodo, servicios por categoria, pagos.
              </Text>
              <Text style={styles.soon}>(Proximamente)</Text>
            </View>
          </View>
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    backgroundColor: '#f5f7fb',
    minHeight: '100%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    flexWrap: 'wrap',
    gap: 12,
  },
  title: { fontSize: 26, fontWeight: '700', color: '#1557b0' },
  subtitle: { fontSize: 14, color: '#667085', marginTop: 4 },
  logoutBtn: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d9e2ef',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  logoutText: { color: '#444', fontSize: 13, fontWeight: '600' },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2937',
    marginTop: 12,
    marginBottom: 12,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 8,
  },
  card: {
    flexGrow: 1,
    flexBasis: 160,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  cardLabel: { fontSize: 12, color: '#667085', marginBottom: 6 },
  cardValue: { fontSize: 26, fontWeight: '700' },
  actionsCol: {
    gap: 12,
    marginBottom: 24,
  },
  actionCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  actionTitle: { fontSize: 15, fontWeight: '700', color: '#1f2937' },
  actionDesc: { fontSize: 13, color: '#475569', marginTop: 4 },
  soon: { fontSize: 12, color: '#94a3b8', marginTop: 8, fontStyle: 'italic' },
  errorBox: {
    backgroundColor: '#fff5f5',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  errorText: { color: '#dc2626', fontSize: 13, flex: 1 },
  retryBtn: {
    backgroundColor: '#dc2626',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  retryText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  loaderBox: {
    alignItems: 'center',
    padding: 40,
  },
  loaderText: { marginTop: 12, color: '#667085' },
});
