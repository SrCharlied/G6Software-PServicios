import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { getProvider, getCalificacionesProveedor, getDisponibilidadProveedor, storageUrl } from '../services/api';
import { useToast } from '../context/ToastContext';
import { T } from '../theme';
import { Avatar, Button, Card, PremiumBadge, ProfileCover, StatusChip, Stars } from '../components/ui';

const DIAS = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'];

const NIVEL_VARIANT = { novato: 'info', intermedio: 'success', experto: 'warn' };

export default function ProviderDetailScreen({
  navigation,
  user,
  providerProfile,
  selectedProvider,
  providerId,
}) {
  const toast = useToast();
  const { width } = useWindowDimensions();
  const twoColumns = width >= 900;
  const [proveedor, setProveedor] = useState(selectedProvider || null);
  const [calificaciones, setCalificaciones] = useState([]);
  const [disponibilidad, setDisponibilidad] = useState([]);
  const [loading, setLoading] = useState(!selectedProvider);

  const esCliente = user && user.role !== 'proveedor';
  const esMiPerfil = user && providerProfile?.id === proveedor?.id;

  useEffect(() => {
    if (selectedProvider) {
      setProveedor(selectedProvider);
      loadExtras(selectedProvider.id);
    } else if (providerId) {
      // Carga por ID cuando se accede directamente por URL
      getProvider(providerId)
        .then((data) => { setProveedor(data.proveedor); loadExtras(data.proveedor.id); })
        .catch(() => setLoading(false))
        .finally(() => setLoading(false));
    }
  }, [selectedProvider, providerId]);

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
      toast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  if (loading || !proveedor) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={T.blue} />
        {!loading ? (
          <>
            <Text style={styles.loadingText}>No se encontro el proveedor seleccionado.</Text>
            <Button kind="primary" onPress={() => navigation.navigate('Home')} style={{ marginTop: 14 }}>
              Volver al listado
            </Button>
          </>
        ) : (
          <Text style={styles.loadingText}>Cargando perfil...</Text>
        )}
      </View>
    );
  }

  const formatRelativeDate = (value) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';

    const diffMs = Date.now() - date.getTime();
    const minutes = Math.floor(diffMs / 60000);
    if (minutes < 1) return 'Hace un momento';
    if (minutes < 60) return `Hace ${minutes} min`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `Hace ${hours} h`;

    const days = Math.floor(hours / 24);
    if (days < 7) return `Hace ${days} dia${days === 1 ? '' : 's'}`;

    return date.toLocaleDateString('es-GT', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const categorias = proveedor.categorias?.length > 0
    ? proveedor.categorias
    : proveedor.categoria ? [proveedor.categoria] : [];

  const ProfileColumn = (
    <View style={twoColumns ? styles.colLeft : undefined}>
      <Card style={styles.profileCard}>
        <ProfileCover
          portadaUri={storageUrl(proveedor.portada)}
          colorAcento={proveedor.color_acento}
          height={110}
          radius={14}
          style={styles.cover}
        />
        <Avatar uri={storageUrl(proveedor.foto_perfil)} name={proveedor.nombre} size={72} />
        <Text style={styles.provName}>{proveedor.nombre}</Text>
        {/* Indicador derivado minimo: el perfil publico ya no recibe la fecha
            de vencimiento ni el conteo de renovaciones, que son datos
            operativos del proveedor. */}
        <PremiumBadge proveedor={proveedor} style={styles.premiumBlock} />

        <View style={styles.chipsWrap}>
          {categorias.map((cat) => (
            <StatusChip key={cat.id} variant="info" label={cat.nombre} dot={false} />
          ))}
          {proveedor.nivel ? (
            <StatusChip
              variant={NIVEL_VARIANT[proveedor.nivel] || 'neutral'}
              label={proveedor.nivel.charAt(0).toUpperCase() + proveedor.nivel.slice(1)}
              dot={false}
            />
          ) : null}
        </View>

        <View style={styles.ratingRow}>
          <Stars value={Math.round(proveedor.calificacion_promedio || 0)} />
          <Text style={styles.ratingText}>
            {proveedor.calificacion_promedio
              ? Number(proveedor.calificacion_promedio).toFixed(1)
              : '—'}{' '}
            ({proveedor.total_calificaciones || 0} resenas)
          </Text>
        </View>

        <View style={styles.metaRow}>
          <Feather name="map-pin" size={13} color={T.muted} />
          <Text style={styles.location}>
            {proveedor.municipio ? `${proveedor.municipio}, ` : ''}{proveedor.departamento}
          </Text>
        </View>

        {proveedor.telefono ? (
          <View style={styles.metaRow}>
            <Feather name="phone" size={13} color={T.blue} />
            <Text style={styles.phone}>{proveedor.telefono}</Text>
          </View>
        ) : null}
      </Card>

      {proveedor.descripcion ? (
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Sobre este proveedor</Text>
          <Text style={styles.descText}>{proveedor.descripcion}</Text>
        </Card>
      ) : null}

      {user && esCliente && !esMiPerfil ? (
        <Card style={[styles.card, { gap: 10 }]}>
          <Button
            kind="primary"
            full
            icon="send"
            onPress={() => navigation.navigate('SolicitudForm', { provider: proveedor })}
          >
            Solicitar servicio
          </Button>
          {/* El chat se abre desde el servicio, no desde el perfil publico: la
              regla ratificada exige una relacion previa y el backend responde
              403 sin ella. Dejar el boton aqui ofrecia una accion imposible. */}
          <Text style={styles.contactHint}>
            Podras escribirle cuando la solicitud este en curso.
          </Text>
        </Card>
      ) : !user ? (
        <Card style={[styles.card, { alignItems: 'center', gap: 10 }]}>
          <Text style={styles.loginPrompt}>
            Inicia sesion para solicitar servicios o chatear con este proveedor.
          </Text>
          <Button kind="primary" full onPress={() => navigation.navigate('Login')}>
            Iniciar sesion
          </Button>
        </Card>
      ) : null}
    </View>
  );

  const DetailsColumn = (
    <View style={twoColumns ? styles.colRight : undefined}>
      {(proveedor.tarifa_hora || proveedor.tarifa_proyecto) ? (
        <Card style={styles.card}>
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
        </Card>
      ) : null}

      {disponibilidad.length > 0 ? (
        <Card style={styles.card}>
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
        </Card>
      ) : null}

      <Card style={styles.card}>
        <Text style={styles.cardTitle}>
          Resenas ({calificaciones.length})
        </Text>
        {calificaciones.length === 0 ? (
          <Text style={styles.emptyText}>Aun no hay resenas para este proveedor.</Text>
        ) : (
          calificaciones.slice(0, 10).map((cal) => (
            <View key={cal.id} style={styles.resenaRow}>
              <View style={styles.resenaHeader}>
                <View style={styles.resenaAuthorBlock}>
                  <Text style={styles.resenaAutor}>{cal.autor?.name || 'Usuario'}</Text>
                  <Text style={styles.resenaDate}>{formatRelativeDate(cal.created_at)}</Text>
                </View>
                <Stars value={Number(cal.puntuacion || 0)} />
              </View>
              {cal.comentario ? (
                <Text style={styles.resenaComentario}>{cal.comentario}</Text>
              ) : null}
            </View>
          ))
        )}
      </Card>
    </View>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <TouchableOpacity style={styles.backRow} onPress={() => navigation.navigate('Home')}>
        <Feather name="arrow-left" size={15} color={T.blue} />
        <Text style={styles.backText}>Volver</Text>
      </TouchableOpacity>

      <View style={twoColumns ? styles.columns : undefined}>
        {ProfileColumn}
        {DetailsColumn}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.canvas },
  content: { width: '100%', maxWidth: 1100, alignSelf: 'center', padding: 24, paddingBottom: 40 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  loadingText: { marginTop: 12, fontSize: 15, color: T.muted, textAlign: 'center' },

  backRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 14 },
  backText: { color: T.blue, fontSize: 15, fontWeight: '600' },

  columns: { flexDirection: 'row', gap: 20, alignItems: 'flex-start' },
  colLeft: { width: 340, gap: 14 },
  colRight: { flex: 1, gap: 14 },

  profileCard: { alignItems: 'center', marginBottom: 14 },
  cover: { width: 'auto', alignSelf: 'stretch', marginTop: -16, marginHorizontal: -16, marginBottom: 14 },
  provName: { fontSize: 22, fontWeight: '800', color: T.ink, marginTop: 12, marginBottom: 8 },
  premiumBlock: { alignSelf: 'stretch', marginBottom: 12 },
  contactHint: { color: T.muted, fontSize: 12, textAlign: 'center' },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center', marginBottom: 4 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8, marginBottom: 4 },
  ratingText: { fontSize: 13, color: T.muted },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  location: { fontSize: 14, color: T.muted },
  phone: { fontSize: 14, color: T.blue, fontWeight: '600' },

  card: { marginBottom: 14 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: T.text, marginBottom: 12 },
  descText: { fontSize: 14, color: T.muted, lineHeight: 22 },

  loginPrompt: { fontSize: 14, color: T.muted, textAlign: 'center', lineHeight: 20 },

  tarifaRow: { flexDirection: 'row', gap: 12 },
  tarifaBox: {
    flex: 1, backgroundColor: '#f0f9ff', borderRadius: T.rMd,
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

  resenaRow: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  resenaHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  resenaAuthorBlock: { flex: 1, marginRight: 10 },
  resenaAutor: { fontSize: 14, fontWeight: '600', color: T.text },
  resenaDate: { fontSize: 11, color: T.faint, marginTop: 2 },
  resenaComentario: { fontSize: 13, color: T.muted, lineHeight: 19, marginTop: 4 },
  emptyText: { fontSize: 14, color: T.faint, textAlign: 'center', paddingVertical: 12 },
});
