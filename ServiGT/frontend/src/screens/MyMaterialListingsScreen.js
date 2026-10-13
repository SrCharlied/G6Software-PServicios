import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import {
  aceptarReservaMaterial,
  cancelarReservaMaterial,
  getMisLotesMateriales,
  getReservasDeLote,
  marcarLoteVendido,
  rechazarReservaMaterial,
  retirarLoteMaterial,
  storageUrl,
} from '../services/api';
import { useToast } from '../context/ToastContext';
import { T } from '../theme';
import { Button, Card, ScreenHeader, StatusChip } from '../components/ui';
import MaterialConfirmModal from '../components/material/MaterialConfirmModal';
import {
  chipDeLote,
  chipDeReserva,
  ETIQUETA_ACCION_RESERVA,
  formatoQuetzales,
  TEXTOS_ACCION,
  ubicacionLote,
} from '../utils/materialEstados';

// Cada accion se ejecuta en el backend; la pantalla nunca cambia un estado por
// su cuenta: despues de confirmar vuelve a pedir lotes y solicitudes.
const EJECUTAR = {
  retirar: retirarLoteMaterial,
  vendido: marcarLoteVendido,
  aceptar: aceptarReservaMaterial,
  rechazar: rechazarReservaMaterial,
  cancelar: cancelarReservaMaterial,
};

/**
 * Mis lotes (vendedor): lotes publicados con sus acciones y las solicitudes de
 * cada uno. Las acciones sobre solicitudes salen de `reserva.acciones`, que
 * calcula el backend; las del lote dependen solo de su `estado`.
 */
export default function MyMaterialListingsScreen({ navigation }) {
  const toast = useToast();
  const { width } = useWindowDimensions();
  const columnas = width >= 1000 ? 2 : 1;

  const [lotes, setLotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  // loteId -> { abierto, loading, error, reservas }
  const [solicitudes, setSolicitudes] = useState({});
  // { accion, id, titulo } mientras se pide confirmacion
  const [pendiente, setPendiente] = useState(null);
  const [procesando, setProcesando] = useState(false);
  const enCurso = useRef(false);
  const solicitudesRef = useRef({});

  useEffect(() => { solicitudesRef.current = solicitudes; }, [solicitudes]);

  const cargar = useCallback(async ({ inicial = false } = {}) => {
    if (inicial) setLoading(true);
    setError('');
    try {
      const data = await getMisLotesMateriales();
      setLotes(data.publicaciones || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { cargar({ inicial: true }); }, [cargar]);

  const cargarSolicitudes = useCallback(async (loteId) => {
    setSolicitudes((prev) => ({ ...prev, [loteId]: { ...prev[loteId], abierto: true, loading: true, error: '' } }));
    try {
      const data = await getReservasDeLote(loteId);
      setSolicitudes((prev) => ({ ...prev, [loteId]: { abierto: true, loading: false, error: '', reservas: data.reservas || [] } }));
    } catch (err) {
      setSolicitudes((prev) => ({ ...prev, [loteId]: { abierto: true, loading: false, error: err.message, reservas: [] } }));
    }
  }, []);

  const alternarSolicitudes = (loteId) => {
    if (solicitudes[loteId]?.abierto) {
      setSolicitudes((prev) => ({ ...prev, [loteId]: { ...prev[loteId], abierto: false } }));
      return;
    }
    cargarSolicitudes(loteId);
  };

  const confirmar = async () => {
    if (!pendiente || enCurso.current) return;
    enCurso.current = true;
    setProcesando(true);

    const { accion, id } = pendiente;
    const texto = TEXTOS_ACCION[accion];

    try {
      await EJECUTAR[accion](id);
      toast(texto.exito, 'success');
      setPendiente(null);

      // El estado mostrado siempre viene del backend.
      const abiertos = Object.keys(solicitudesRef.current).filter((k) => solicitudesRef.current[k]?.abierto);
      await Promise.all([cargar(), ...abiertos.map((k) => cargarSolicitudes(Number(k)))]);
    } catch (err) {
      // Nada cambia en pantalla: se informa el error y la lista queda como estaba.
      toast(err.message, 'error');
      setPendiente(null);
    } finally {
      enCurso.current = false;
      setProcesando(false);
    }
  };

  if (loading) {
    return (
      <View style={s.centered}>
        <ActivityIndicator size="large" color={T.blue} />
        <Text style={s.loadingText}>Cargando tus lotes...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <ScreenHeader
        title="Mis lotes de materiales"
        subtitle="Administra los lotes que publicaste y las solicitudes de otros proveedores."
        onBack={() => navigation.goBack()}
        right={<Button kind="secondary" size="sm" onPress={() => navigation.navigate('MisReservasMaterial')}>Mis reservas</Button>}
      />

      {error && lotes.length === 0 ? (
        <Card style={s.errorCard}>
          <Text style={s.errorText}>{error}</Text>
          <Button kind="primary" onPress={() => cargar({ inicial: true })} style={{ marginTop: 12 }}>Reintentar</Button>
        </Card>
      ) : (
        <>
          {error ? (
            <Card style={s.errorCard}>
              <Text style={s.errorText}>{error}</Text>
              <Button kind="secondary" size="sm" onPress={() => cargar()} style={{ marginTop: 8 }}>Reintentar</Button>
            </Card>
          ) : null}

          {lotes.length === 0 ? (
            <View style={s.emptyWrap}>
              <Text style={s.emptyTitle}>Aún no tienes lotes publicados</Text>
              <Text style={s.emptyDesc}>
                Cuando un cliente cancele un servicio que ya iba en camino, podrás publicar el material sobrante desde ese servicio.
              </Text>
            </View>
          ) : (
            <View style={s.grid}>
              {lotes.map((lote) => (
                <LoteCard
                  key={lote.id}
                  lote={lote}
                  ancho={columnas === 2 ? '48.5%' : '100%'}
                  estadoSolicitudes={solicitudes[lote.id]}
                  onAccion={(accion) => setPendiente({ accion, id: lote.id, tipo: 'lote' })}
                  onAlternar={() => alternarSolicitudes(lote.id)}
                  onReintentar={() => cargarSolicitudes(lote.id)}
                  onReservaAccion={(accion, reservaId) => setPendiente({ accion, id: reservaId, tipo: 'reserva' })}
                  onChat={(reserva) => navigation.navigate('ChatContexto', { tipo: 'reserva', id: reserva.id })}
                  onEdit={() => navigation.navigate('MaterialEdit', { id: lote.id })}
                />
              ))}
            </View>
          )}
        </>
      )}

      <MaterialConfirmModal
        visible={!!pendiente}
        texto={pendiente ? TEXTOS_ACCION[pendiente.accion] : null}
        procesando={procesando}
        onCancel={() => setPendiente(null)}
        onConfirm={confirmar}
      />
    </ScrollView>
  );
}

function LoteCard({ lote, ancho, estadoSolicitudes, onAccion, onAlternar, onReintentar, onReservaAccion, onChat, onEdit }) {
  const chip = chipDeLote(lote.estado);
  const imagen = lote.imagenes?.[0]?.url ? storageUrl(lote.imagenes[0].url) : null;
  const pendientes = Number(lote.reservas_pendientes || 0);
  const abierto = !!estadoSolicitudes?.abierto;

  return (
    <Card style={[s.loteCard, { width: ancho }]}>
      <View style={s.loteHead}>
        {imagen ? <Image source={{ uri: imagen }} style={s.loteImagen} resizeMode="cover" /> : <View style={[s.loteImagen, s.sinImagen]} />}
        <View style={s.loteInfo}>
          <Text style={s.loteTitulo} numberOfLines={2}>{lote.titulo}</Text>
          <StatusChip variant={chip.variant} label={chip.label} size="sm" />
          <Text style={s.meta}>{`${Number(lote.cantidad)} ${lote.unidad} · ${formatoQuetzales(lote.precio_referencial)}`}</Text>
          <Text style={s.metaSuave}>{ubicacionLote(lote)}</Text>
          {pendientes > 0 ? (
            <Text style={s.pendientes}>{pendientes === 1 ? '1 solicitud pendiente' : `${pendientes} solicitudes pendientes`}</Text>
          ) : null}
        </View>
      </View>

      {lote.estado === 'disponible' ? (
        <View style={s.acciones}>
          <Button kind="secondary" icon="edit-2" size="sm" onPress={onEdit}>Editar lote</Button>
          <Button kind="secondary" size="sm" onPress={() => onAccion('vendido')}>Marcar vendido</Button>
          <Button kind="ghost" size="sm" onPress={() => onAccion('retirar')}>Retirar</Button>
        </View>
      ) : null}

      {lote.estado === 'reservado' ? (
        <View style={s.acciones}>
          <Button kind="secondary" size="sm" onPress={() => onAccion('vendido')}>Marcar vendido</Button>
          <Text style={s.hint}>Para retirarlo, cancela primero la reserva aceptada.</Text>
        </View>
      ) : null}

      <Button kind="ghost" size="sm" onPress={onAlternar} style={s.verSolicitudes}>
        {abierto ? 'Ocultar solicitudes' : 'Ver solicitudes'}
      </Button>

      {abierto ? (
        <View style={s.solicitudes}>
          {estadoSolicitudes.loading ? (
            <ActivityIndicator color={T.blue} />
          ) : estadoSolicitudes.error ? (
            <View>
              <Text style={s.errorText}>{estadoSolicitudes.error}</Text>
              <Button kind="secondary" size="sm" onPress={onReintentar} style={{ marginTop: 8, alignSelf: 'flex-start' }}>Reintentar</Button>
            </View>
          ) : estadoSolicitudes.reservas.length === 0 ? (
            <Text style={s.metaSuave}>Este lote aún no tiene solicitudes.</Text>
          ) : (
            estadoSolicitudes.reservas.map((reserva) => (
              <ReservaFila
                key={reserva.id}
                reserva={reserva}
                onAccion={(accion) => onReservaAccion(accion, reserva.id)}
                onChat={() => onChat(reserva)}
              />
            ))
          )}
        </View>
      ) : null}
    </Card>
  );
}

function ReservaFila({ reserva, onAccion, onChat }) {
  const chip = chipDeReserva(reserva.estado);

  return (
    <View testID={`reserva-${reserva.id}`} style={s.reserva}>
      <View style={s.reservaHead}>
        <Text style={s.reservaNombre}>{reserva.comprador?.nombre}</Text>
        <StatusChip variant={chip.variant} label={chip.label} size="sm" />
      </View>
      <Text style={s.metaSuave}>{`Calificación ${Number(reserva.comprador?.calificacion_promedio ?? 0).toFixed(1)}`}</Text>
      <Text style={s.mensaje}>{reserva.mensaje_inicial}</Text>
      <View style={s.acciones}>
        {(reserva.acciones || []).map((accion) => (
          <Button
            key={accion}
            kind={accion === 'aceptar' ? 'success' : 'ghost'}
            size="sm"
            onPress={() => onAccion(accion)}
          >
            {ETIQUETA_ACCION_RESERVA[accion] ?? accion}
          </Button>
        ))}
        <Button kind="secondary" size="sm" onPress={onChat}>Abrir chat</Button>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.canvas },
  content: { padding: T.s4, paddingBottom: 44, width: '100%', maxWidth: 1200, alignSelf: 'center', gap: T.s4 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { fontSize: 15, color: T.muted },

  errorCard: { padding: 20, alignItems: 'center' },
  errorText: { fontSize: 14, color: T.danger },

  emptyWrap: {
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 48, gap: 10,
    backgroundColor: T.white, borderRadius: T.rLg, borderWidth: 1, borderColor: T.border,
  },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: T.ink },
  emptyDesc: { fontSize: 14, color: T.muted, textAlign: 'center', lineHeight: 20, maxWidth: 440 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: T.s4 },
  loteCard: { gap: T.s3 },
  loteHead: { flexDirection: 'row', gap: T.s3 },
  loteImagen: { width: 88, height: 88, borderRadius: T.rMd },
  sinImagen: { backgroundColor: T.inputBg, borderWidth: 1, borderColor: T.inputBorder },
  loteInfo: { flex: 1, gap: 4 },
  loteTitulo: { fontSize: 16, fontWeight: '800', color: T.ink },
  meta: { fontSize: 13, fontWeight: '700', color: T.deep },
  metaSuave: { fontSize: 12, color: T.muted },
  pendientes: { fontSize: 12, fontWeight: '700', color: T.warn },
  acciones: { flexDirection: 'row', flexWrap: 'wrap', gap: T.s2, alignItems: 'center' },
  hint: { fontSize: 12, color: T.muted, flexShrink: 1 },
  verSolicitudes: { alignSelf: 'flex-start' },

  solicitudes: { gap: T.s3, borderTopWidth: 1, borderTopColor: T.border, paddingTop: T.s3 },
  reserva: { gap: 4, padding: T.s3, borderRadius: T.rMd, backgroundColor: T.inputBg, borderWidth: 1, borderColor: T.border },
  reservaHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: T.s2 },
  reservaNombre: { fontSize: 14, fontWeight: '800', color: T.ink, flexShrink: 1 },
  mensaje: { fontSize: 13, color: T.text, lineHeight: 18, marginBottom: 4 },
});
