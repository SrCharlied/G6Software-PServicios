import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { getProvider, getCalificacionesProveedor, getDisponibilidadProveedor } from '../services/api';

const DIAS = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'];

const Stars = ({ value }) => {
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {[1, 2, 3, 4, 5].map((s) => (
        <Text key={s} style={{ color: s <= value ? '#f59e0b' : '#d1d5db', fontSize: 16 }}>
          ★
        </Text>
      ))}
    </View>
  );
};

export default function ProviderDetailScreen({
  navigation,
  user,
  providerProfile,
  selectedProvider,
  providerId,
}) {
  const matchedSelectedProvider = selectedProvider
    && (!providerId || Number(selectedProvider.id) === Number(providerId))
    ? selectedProvider
    : null;
  const [proveedor, setProveedor] = useState(matchedSelectedProvider || null);
  const [calificaciones, setCalificaciones] = useState([]);
  const [disponibilidad, setDisponibilidad] = useState([]);
  const [loading, setLoading] = useState(Boolean(providerId || matchedSelectedProvider));

  const resolvedProviderId = providerId || matchedSelectedProvider?.id || proveedor?.id || null;

  const esCliente = user && user.role !== 'proveedor';
  const esMiPerfil = user && providerProfile?.id === proveedor?.id;

  useEffect(() => {
    if (matchedSelectedProvider) {
      setProveedor(matchedSelectedProvider);
    }
  }, [matchedSelectedProvider]);

  useEffect(() => {
    if (!resolvedProviderId) {
      setLoading(false);
      return;
    }

    loadExtras(resolvedProviderId);
  }, [resolvedProviderId]);

  const loadExtras = async (id) => {
    setLoading(true);
    try {
      const [provData, calData, dispData] = await Promise.all([
        getProvider(id),
        getCalificacionesProveedor(id),
        getDisponibilidadProveedor(id),
      ]);
      setProveedor(provData.proveedor);
      setCalificaciones(calData.calificaciones || []);
      setDisponibilidad(dispData.disponibilidad || []);
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!resolvedProviderId && !proveedor) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>No se encontro el proveedor seleccionado.</Text>
        <TouchableOpacity style={styles.backFallbackBtn} onPress={() => navigation.navigate('Home')}>
          <Text style={styles.backFallbackBtnText}>Volver al listado</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (loading || !proveedor) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1a73e8" />
        <Text style={styles.loadingText}>Cargando perfil...</Text>
      </View>
    );
  }

  const nivelColores = {
    novato:     { bg: '#f0f9ff', text: '#0369a1' },
    intermedio: { bg: '#f0fdf4', text: '#15803d' },
    experto:    { bg: '#fef3c7', text: '#b45309' },
  };
  const nivelColor = nivelColores[proveedor.nivel] || nivelColores.novato;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Back */}
      <TouchableOpacity style={styles.backRow} onPress={() => navigation.navigate('Home')}>
        <Text style={styles.backText}>← Volver</Text>
      </TouchableOpacity>

      {/* Header card */}
      <View style={styles.profileCard}>
        <View style={styles.avatarPlaceholder}>
          <Text style={styles.avatarInitial}>{(proveedor.nombre || '?')[0].toUpperCase()}</Text>
        </View>

        <Text style={styles.provName}>{proveedor.nombre}</Text>

        {proveedor.categoria && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{proveedor.categoria.nombre}</Text>
          </View>
        )}

        {proveedor.nivel && (
          <View style={[styles.badge, { backgroundColor: nivelColor.bg, marginTop: 4 }]}>
            <Text style={[styles.badgeText, { color: nivelColor.text }]}>
              {proveedor.nivel.charAt(0).toUpperCase() + proveedor.nivel.slice(1)}
            </Text>
          </View>
        )}

        <View style={styles.ratingRow}>
          <Stars value={Math.round(proveedor.calificacion_promedio || 0)} />
          <Text style={styles.ratingText}>
            {proveedor.calificacion_promedio
              ? Number(proveedor.calificacion_promedio).toFixed(1)
              : '—'}{' '}
            ({proveedor.total_calificaciones || 0} resenas)
          </Text>
        </View>

        <Text style={styles.location}>
          {proveedor.municipio ? `${proveedor.municipio}, ` : ''}{proveedor.departamento}
        </Text>

        {proveedor.telefono ? (
          <Text style={styles.phone}>{proveedor.telefono}</Text>
        ) : null}
      </View>

      {/* Descripcion */}
      {proveedor.descripcion ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Sobre este proveedor</Text>
          <Text style={styles.descText}>{proveedor.descripcion}</Text>
        </View>
      ) : null}

      {/* Tarifas */}
      {(proveedor.tarifa_hora || proveedor.tarifa_proyecto) ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Tarifas</Text>
          <View style={styles.tarifaRow}>
            {proveedor.tarifa_hora ? (
              <View style={styles.tarifaBox}>
                <Text style={styles.tarifaAmount}>Q{Number(proveedor.tarifa_hora).toFixed(2)}</Text>
                <Text style={styles.tarifaLabel}>por hora</Text>
              </View>
            ) : null}
            {proveedor.tarifa_proyecto ? (
              <View style={styles.tarifaBox}>
                <Text style={styles.tarifaAmount}>Q{Number(proveedor.tarifa_proyecto).toFixed(2)}</Text>
                <Text style={styles.tarifaLabel}>por proyecto</Text>
              </View>
            ) : null}
          </View>
        </View>
      ) : null}

      {/* Disponibilidad */}
      {disponibilidad.length > 0 ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Disponibilidad</Text>
          <View style={styles.dispGrid}>
            {disponibilidad.map((d) => (
              <View
                key={d.id}
                style={[styles.dispDay, d.disponible ? styles.dispDayOn : styles.dispDayOff]}
              >
                <Text style={[styles.dispDayName, d.disponible ? styles.dispTextOn : styles.dispTextOff]}>
                  {DIAS[d.dia_semana]}
                </Text>
                {d.disponible ? (
                  <Text style={styles.dispHoras}>{d.hora_inicio}–{d.hora_fin}</Text>
                ) : (
                  <Text style={styles.dispNoDisp}>No disp.</Text>
                )}
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {/* Acciones */}
      {user && !esMiPerfil ? (
        <View style={styles.actionsCard}>
          {esCliente && (
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => navigation.navigate('SolicitudForm', { provider: proveedor })}
            >
              <Text style={styles.primaryBtnText}>Solicitar servicio</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() =>
              navigation.navigate('Chat', {
                chatWithUserId: proveedor.user_id,
                chatWithName: proveedor.nombre,
              })
            }
          >
            <Text style={styles.secondaryBtnText}>Enviar mensaje</Text>
          </TouchableOpacity>
        </View>
      ) : !user ? (
        <View style={styles.actionsCard}>
          <Text style={styles.loginPrompt}>
            Inicia sesion para solicitar servicios o chatear con este proveedor.
          </Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => navigation.navigate('Login')}>
            <Text style={styles.primaryBtnText}>Iniciar sesion</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {/* Resenas */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>
          Resenas ({calificaciones.length})
        </Text>
        {calificaciones.length === 0 ? (
          <Text style={styles.emptyText}>Aun no hay resenas para este proveedor.</Text>
        ) : (
          calificaciones.slice(0, 5).map((cal) => (
            <View key={cal.id} style={styles.resenaRow}>
              <View style={styles.resenaHeader}>
                <Text style={styles.resenaAutor}>{cal.autor?.name || 'Usuario'}</Text>
                <Stars value={cal.puntuacion} />
              </View>
              {cal.comentario ? (
                <Text style={styles.resenaComentario}>{cal.comentario}</Text>
              ) : null}
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  content: { padding: 16, paddingBottom: 40 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 16, color: '#666' },
  backFallbackBtn: {
    marginTop: 14,
    backgroundColor: '#1a73e8',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  backFallbackBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  backRow: { marginBottom: 12 },
  backText: { color: '#1a73e8', fontSize: 15, fontWeight: '600' },

  profileCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 20,
    alignItems: 'center',
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  avatarPlaceholder: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#1a73e8',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarInitial: { fontSize: 30, fontWeight: 'bold', color: '#fff' },
  provName: { fontSize: 22, fontWeight: '800', color: '#1a1a2e', marginBottom: 8 },
  badge: {
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 14,
    marginBottom: 4,
  },
  badgeText: { fontSize: 13, color: '#1a73e8', fontWeight: '600' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8, marginBottom: 4 },
  ratingText: { fontSize: 13, color: '#555' },
  location: { fontSize: 14, color: '#666', marginTop: 4 },
  phone: { fontSize: 14, color: '#1a73e8', fontWeight: '600', marginTop: 4 },

  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#333', marginBottom: 12 },
  descText: { fontSize: 14, color: '#555', lineHeight: 22 },

  tarifaRow: { flexDirection: 'row', gap: 12 },
  tarifaBox: {
    flex: 1, backgroundColor: '#f0f9ff', borderRadius: 10,
    padding: 14, alignItems: 'center',
  },
  tarifaAmount: { fontSize: 20, fontWeight: '800', color: '#0369a1' },
  tarifaLabel: { fontSize: 12, color: '#0369a1', marginTop: 2 },

  dispGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  dispDay: {
    paddingHorizontal: 10, paddingVertical: 8,
    borderRadius: 10, minWidth: 70, alignItems: 'center',
  },
  dispDayOn: { backgroundColor: '#d1fae5' },
  dispDayOff: { backgroundColor: '#f3f4f6' },
  dispDayName: { fontSize: 13, fontWeight: '700' },
  dispTextOn: { color: '#065f46' },
  dispTextOff: { color: '#9ca3af' },
  dispHoras: { fontSize: 11, color: '#065f46', marginTop: 2 },
  dispNoDisp: { fontSize: 11, color: '#9ca3af', marginTop: 2 },

  actionsCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 14,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  loginPrompt: { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 8, lineHeight: 20 },
  primaryBtn: { backgroundColor: '#1a73e8', padding: 14, borderRadius: 8, alignItems: 'center' },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  secondaryBtn: {
    backgroundColor: '#f0f0f0', padding: 14, borderRadius: 8, alignItems: 'center',
  },
  secondaryBtnText: { color: '#333', fontWeight: '600', fontSize: 15 },

  resenaRow: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  resenaHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  resenaAutor: { fontSize: 14, fontWeight: '600', color: '#333' },
  resenaComentario: { fontSize: 13, color: '#666', lineHeight: 19, marginTop: 4 },
  emptyText: { fontSize: 14, color: '#999', textAlign: 'center', paddingVertical: 12 },
});
