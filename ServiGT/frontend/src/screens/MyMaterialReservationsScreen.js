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
import { cancelarReservaMaterial, getMisReservasMaterial, storageUrl } from '../services/api';
import { useToast } from '../context/ToastContext';
import { T } from '../theme';
import { Button, Card, ScreenHeader, StatusChip } from '../components/ui';
import MaterialConfirmModal from '../components/material/MaterialConfirmModal';
import {
  chipDeReserva,
  ETIQUETA_ACCION_RESERVA,
  formatoQuetzales,
  TEXTOS_ACCION,
  ubicacionLote,
} from '../utils/materialEstados';

/**
 * Mis reservas (comprador): solicitudes que hice a lotes de otros proveedores.
 * La unica accion del comprador, cancelar, solo aparece cuando el backend la
 * incluye en `reserva.acciones`; despues de confirmar se vuelve a pedir la
 * lista para mostrar el estado real.
 */
export default function MyMaterialReservationsScreen({ navigation }) {
  const toast = useToast();
  const { width } = useWindowDimensions();
  const columnas = width >= 1000 ? 2 : 1;

  const [reservas, setReservas] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cargandoMas, setCargandoMas] = useState(false);
  const [pendiente, setPendiente] = useState(null); // { accion, id }
  const [procesando, setProcesando] = useState(false);
  const enCurso = useRef(false);

  const cargar = useCallback(async ({ inicial = false } = {}) => {
    if (inicial) setLoading(true);
    setError('');
    try {
      const data = await getMisReservasMaterial();
      setReservas(data.reservas || []);
      setMeta(data.meta || null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { cargar({ inicial: true }); }, [cargar]);

  const hayMas = !!meta && meta.current_page < meta.last_page;

  const verMas = async () => {
    if (cargandoMas || !hayMas) return;
    setCargandoMas(true);
    try {
      const data = await getMisReservasMaterial({ page: meta.current_page + 1 });
      setReservas((prev) => [...prev, ...(data.reservas || [])]);
      setMeta(data.meta || null);
    } catch (err) {
      // Lo ya mostrado se conserva; solo se informa el fallo.
      toast(err.message, 'error');
    } finally {
      setCargandoMas(false);
    }
  };

  const confirmar = async () => {
    if (!pendiente || enCurso.current) return;
    enCurso.current = true;
    setProcesando(true);

    try {
      await cancelarReservaMaterial(pendiente.id);
      toast(TEXTOS_ACCION.cancelar.exito, 'success');
      setPendiente(null);
      await cargar();
    } catch (err) {
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
        <Text style={s.loadingText}>Cargando tus reservas...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <ScreenHeader
        title="Mis reservas de materiales"
        subtitle="Solicitudes que hiciste a lotes de otros proveedores."
        onBack={() => navigation.goBack()}
        right={<Button kind="secondary" size="sm" onPress={() => navigation.navigate('MisLotesMaterial')}>Mis lotes</Button>}
      />

      {error && reservas.length === 0 ? (
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

          {reservas.length === 0 ? (
            <View style={s.emptyWrap}>
              <Text style={s.emptyTitle}>Aún no tienes reservas</Text>
              <Text style={s.emptyDesc}>Cuando solicites un lote de la bolsa de materiales, lo verás aquí con su estado.</Text>
            </View>
          ) : (
            <View style={s.grid}>
              {reservas.map((reserva) => (
                <ReservaCard
                  key={reserva.id}
                  reserva={reserva}
                  ancho={columnas === 2 ? '48.5%' : '100%'}
                  onAccion={(accion) => setPendiente({ accion, id: reserva.id })}
                  onChat={() => navigation.navigate('ChatContexto', { tipo: 'reserva', id: reserva.id })}
                />
              ))}
            </View>
          )}

          {hayMas ? (
            <Button kind="secondary" loading={cargandoMas} disabled={cargandoMas} onPress={verMas} style={s.verMas}>Ver más</Button>
          ) : null}
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

function ReservaCard({ reserva, ancho, onAccion, onChat }) {
  const chip = chipDeReserva(reserva.estado);
  const lote = reserva.publicacion;
  const imagen = lote?.imagen_principal ? storageUrl(lote.imagen_principal) : null;
  // Solo se ofrecen las acciones que el backend permite a un comprador.
  const acciones = (reserva.acciones || []).filter((a) => a === 'cancelar');

  return (
    <Card style={[s.card, { width: ancho }]}>
      <View testID={`reserva-${reserva.id}`} style={s.card}>
      <View style={s.head}>
        {imagen ? <Image source={{ uri: imagen }} style={s.imagen} resizeMode="cover" /> : <View style={[s.imagen, s.sinImagen]} />}
        <View style={s.info}>
          <Text style={s.titulo} numberOfLines={2}>{lote?.titulo}</Text>
          <StatusChip variant={chip.variant} label={chip.label} size="sm" />
          <Text style={s.meta}>{`${Number(lote?.cantidad)} ${lote?.unidad} · ${formatoQuetzales(lote?.precio_referencial)}`}</Text>
          <Text style={s.metaSuave}>{ubicacionLote(lote)}</Text>
          {lote?.vendedor?.nombre ? <Text style={s.metaSuave}>{lote.vendedor.nombre}</Text> : null}
        </View>
      </View>

      <Text style={s.mensaje}>{reserva.mensaje_inicial}</Text>

      <View style={s.acciones}>
        {acciones.map((accion) => (
          <Button key={accion} kind="ghost" size="sm" onPress={() => onAccion(accion)}>
            {ETIQUETA_ACCION_RESERVA[accion]}
          </Button>
        ))}
        <Button kind="secondary" size="sm" onPress={onChat}>Abrir chat</Button>
      </View>
      </View>
    </Card>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.canvas },
  content: { padding: T.s4, paddingBottom: 44, width: '100%', maxWidth: 1200, alignSelf: 'center', gap: T.s4 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { fontSize: 15, color: T.muted },

  errorCard: { padding: 20, alignItems: 'center' },
  errorText: { fontSize: 14, color: T.danger, textAlign: 'center' },

  emptyWrap: {
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 48, gap: 10,
    backgroundColor: T.white, borderRadius: T.rLg, borderWidth: 1, borderColor: T.border,
  },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: T.ink },
  emptyDesc: { fontSize: 14, color: T.muted, textAlign: 'center', lineHeight: 20, maxWidth: 440 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: T.s4 },
  verMas: { alignSelf: 'center' },

  card: { gap: T.s3 },
  head: { flexDirection: 'row', gap: T.s3 },
  imagen: { width: 88, height: 88, borderRadius: T.rMd },
  sinImagen: { backgroundColor: T.inputBg, borderWidth: 1, borderColor: T.inputBorder },
  info: { flex: 1, gap: 4 },
  titulo: { fontSize: 16, fontWeight: '800', color: T.ink },
  meta: { fontSize: 13, fontWeight: '700', color: T.deep },
  metaSuave: { fontSize: 12, color: T.muted },
  mensaje: { fontSize: 13, color: T.text, lineHeight: 18 },
  acciones: { flexDirection: 'row', flexWrap: 'wrap', gap: T.s2, alignItems: 'center' },
});
