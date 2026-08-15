import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import {
  activarPremium,
  getMiCredito,
  getMiEstadoPremium,
  getTransaccionesCreditos,
  nuevaIdempotencyKey,
} from '../services/api';
import { T } from '../theme';
import {
  Button,
  Card,
  CreditBalance,
  EmptyState,
  ExpiryBar,
  KpiCard,
  PremiumBadge,
  ScreenHeader,
  SlotMeter,
  StatusChip,
} from '../components/ui';

// Los 4 tipos que admite transacciones_credito.tipo en el backend. El signo
// indica si el movimiento suma o resta saldo, para no inferirlo del motivo.
const TIPO_META = {
  compra:  { label: 'Compra',  variant: 'info',    icon: 'shopping-bag', signo: '+' },
  bono:    { label: 'Bono',    variant: 'success', icon: 'award',        signo: '+' },
  recarga: { label: 'Recarga', variant: 'success', icon: 'plus-circle',  signo: '+' },
  gasto:   { label: 'Gasto',   variant: 'warn',    icon: 'send',         signo: '−' },
};

const PER_PAGE = 10;

const formatFecha = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('es-GT', { day: '2-digit', month: 'short', year: 'numeric' });
};

function TransaccionRow({ transaccion }) {
  const meta = TIPO_META[transaccion.tipo] ?? TIPO_META.gasto;

  return (
    <View style={s.txRow}>
      <View style={[s.txIcon, { backgroundColor: meta.variant === 'warn' ? '#fef3c7' : '#eff6ff' }]}>
        <Feather name={meta.icon} size={14} color={meta.variant === 'warn' ? T.warn : T.blue} />
      </View>

      <View style={s.txTextBox}>
        <Text style={s.txMotivo} numberOfLines={2}>{transaccion.motivo}</Text>
        <View style={s.txMetaRow}>
          <StatusChip variant={meta.variant} label={meta.label} size="sm" dot={false} />
          <Text style={s.txFecha}>{formatFecha(transaccion.created_at)}</Text>
        </View>
      </View>

      <Text style={[s.txMonto, meta.signo === '−' ? s.txMontoNeg : s.txMontoPos]}>
        {meta.signo}{transaccion.monto}
      </Text>
    </View>
  );
}

function PremiumPanel({ premium, onActivar, activando, error }) {
  const estado = premium?.estado ?? 'nunca';
  const beneficios = premium?.beneficios ?? [];

  const titulo = estado === 'activo'
    ? 'Premium activo'
    : estado === 'vencido'
      ? 'Tu Premium venció'
      : 'Activa Premium';

  const descripcion = estado === 'activo'
    ? `Ciclo vigente con ${premium.dias_restantes} día(s) restantes. Renovaciones acumuladas: ${premium.renovaciones}.`
    : estado === 'vencido'
      ? 'Renueva para recuperar el badge, la visibilidad y los 10 créditos del ciclo.'
      : `Q${premium?.precio_gtq ?? 115} al mes: badge, visibilidad y ${premium?.creditos_por_ciclo ?? 10} créditos incluidos.`;

  return (
    <Card style={s.premiumCard}>
      <View style={s.premiumHead}>
        <View style={s.premiumTitleBox}>
          <Text style={s.sectionTitle}>{titulo}</Text>
          <Text style={s.sectionDesc}>{descripcion}</Text>
        </View>
        <PremiumBadge
          estado={estado}
          diasRestantes={premium?.dias_restantes}
          mostrarInactivo
        />
      </View>

      {estado === 'activo' && premium?.vence_at ? (
        <ExpiryBar
          fecha={premium.vence_at}
          totalDias={premium.dias_vigencia ?? 30}
          label="Vigencia del ciclo"
          vencidoLabel="Ciclo vencido"
          style={s.premiumExpiry}
        />
      ) : null}

      {beneficios.length > 0 ? (
        <View style={s.beneficios}>
          {beneficios.map((beneficio) => (
            <View key={beneficio} style={s.beneficioRow}>
              <Feather name="check" size={13} color={T.success} />
              <Text style={s.beneficioText}>{beneficio}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {error ? <Text style={s.inlineError}>{error}</Text> : null}

      <Button
        kind={estado === 'activo' ? 'secondary' : 'primary'}
        icon="award"
        loading={activando}
        onPress={onActivar}
        style={s.premiumBtn}
      >
        {estado === 'activo'
          ? `Renovar por Q${premium?.precio_gtq ?? 115}`
          : `Activar Premium por Q${premium?.precio_gtq ?? 115}`}
      </Button>

      <Text style={s.simuladoNota}>
        Activación simulada: no se solicitan ni se guardan datos bancarios.
      </Text>
    </Card>
  );
}

export default function CreditosScreen({ navigation }) {
  const { width } = useWindowDimensions();
  const desktop = width >= 900;

  const [saldo, setSaldo]               = useState(null);
  const [saldoError, setSaldoError]     = useState('');
  const [saldoLoading, setSaldoLoading] = useState(true);

  const [premium, setPremium]           = useState(null);
  const [premiumError, setPremiumError] = useState('');
  const [activando, setActivando]       = useState(false);

  const [transacciones, setTransacciones] = useState([]);
  const [page, setPage]                   = useState(1);
  const [lastPage, setLastPage]           = useState(1);
  const [totalTx, setTotalTx]             = useState(0);
  const [txLoading, setTxLoading]         = useState(true);
  const [txError, setTxError]             = useState('');
  const [refreshing, setRefreshing]       = useState(false);

  const cargarSaldo = useCallback(async () => {
    setSaldoLoading(true);
    setSaldoError('');
    try {
      const data = await getMiCredito();
      setSaldo(data.saldo ?? 0);
    } catch (err) {
      // No se degrada a 0: un fallo de API debe verse como fallo.
      setSaldo(null);
      setSaldoError(err.message);
    } finally {
      setSaldoLoading(false);
    }
  }, []);

  const cargarPremium = useCallback(async () => {
    setPremiumError('');
    try {
      setPremium(await getMiEstadoPremium());
    } catch (err) {
      setPremiumError(err.message);
    }
  }, []);

  const cargarTransacciones = useCallback(async (pagina = 1) => {
    setTxLoading(true);
    setTxError('');
    try {
      const data = await getTransaccionesCreditos({ page: pagina, perPage: PER_PAGE });
      setTransacciones(data.transacciones ?? []);
      setPage(data.pagina_actual ?? pagina);
      setLastPage(data.ultima_pagina ?? 1);
      setTotalTx(data.total ?? 0);
    } catch (err) {
      setTxError(err.message);
    } finally {
      setTxLoading(false);
    }
  }, []);

  const cargarTodo = useCallback(async (pagina = 1) => {
    await Promise.all([cargarSaldo(), cargarPremium(), cargarTransacciones(pagina)]);
  }, [cargarSaldo, cargarPremium, cargarTransacciones]);

  useEffect(() => { cargarTodo(1); }, [cargarTodo]);

  const onRefresh = async () => {
    setRefreshing(true);
    await cargarTodo(page);
    setRefreshing(false);
  };

  const onActivarPremium = async () => {
    setActivando(true);
    setPremiumError('');
    try {
      // Una clave por intento: si el usuario toca dos veces, el backend
      // devuelve el mismo ciclo en vez de acreditar dos veces.
      await activarPremium(nuevaIdempotencyKey('premium'));
      await cargarTodo(1);
    } catch (err) {
      setPremiumError(err.message);
    } finally {
      setActivando(false);
    }
  };

  const bonosPremium = transacciones
    .filter((t) => t.tipo === 'bono')
    .reduce((acc, t) => acc + Number(t.monto ?? 0), 0);

  return (
    <SafeAreaView style={s.container}>
      <ScreenHeader
        title="Créditos"
        subtitle="Saldo, compras y movimientos de tu cuenta"
        onBack={navigation?.goBack}
        right={
          <Button
            kind="primary"
            size="sm"
            icon="shopping-bag"
            onPress={() => navigation?.navigate('PaquetesCreditos')}
          >
            Comprar
          </Button>
        }
      />

      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={T.blue} />}
      >
        <View style={[s.grid, desktop && s.gridDesktop]}>
          {/* Columna izquierda: saldo, KPIs, slots y Premium */}
          <View style={[s.col, desktop && s.colMain]}>
            <CreditBalance
              saldo={saldo}
              loading={saldoLoading}
              error={saldoError}
              onRetry={cargarSaldo}
              onPress={() => navigation?.navigate('PaquetesCreditos')}
            />

            <View style={s.kpiRow}>
              <KpiCard
                label="Movimientos"
                value={totalTx}
                hint="Compras, bonos, gastos y recargas"
                icon="list"
              />
              <KpiCard
                label="Bonos Premium"
                value={bonosPremium}
                hint="Créditos por ciclos Premium (esta página)"
                icon="award"
                color={T.amber}
              />
              <KpiCard
                label="Estado Premium"
                value={premium?.estado === 'activo' ? 'Activo' : premium?.estado === 'vencido' ? 'Vencido' : 'Nunca'}
                hint={premium?.estado === 'activo' ? `${premium.dias_restantes} día(s) restantes` : 'Q115 por 30 días'}
                icon="star"
                color={premium?.estado === 'activo' ? T.success : T.muted}
              />
            </View>

            <Card>
              <Text style={s.sectionTitle}>Cómo se consumen tus créditos</Text>
              <Text style={s.sectionDesc}>
                En cada pedido las 3 primeras cotizaciones son gratuitas. De la 4 a la 6 cuestan
                1 crédito cada una y el pedido cierra en 6.
              </Text>
              {/* Medidor ilustrativo de la regla, no el estado de un pedido
                  concreto: el conteo real vive en el detalle de cada pedido. */}
              <SlotMeter usados={3} title="Ejemplo: 3 de 6 usadas" style={s.slotMeter} />
            </Card>

            <PremiumPanel
              premium={premium}
              onActivar={onActivarPremium}
              activando={activando}
              error={premiumError}
            />
          </View>

          {/* Columna derecha: historial paginado */}
          <View style={[s.col, desktop && s.colSide]}>
            <Card>
              <View style={s.historialHead}>
                <Text style={s.sectionTitle}>Historial</Text>
                {totalTx > 0 ? <Text style={s.historialCount}>{totalTx} movimiento(s)</Text> : null}
              </View>

              {txLoading ? (
                <ActivityIndicator color={T.blue} style={s.txLoader} />
              ) : txError ? (
                <EmptyState
                  error
                  title="No se pudo cargar el historial"
                  description={txError}
                  actionLabel="Reintentar"
                  onAction={() => cargarTransacciones(page)}
                />
              ) : transacciones.length === 0 ? (
                <EmptyState
                  icon="file-text"
                  title="Sin movimientos todavía"
                  description="Cuando compres créditos, actives Premium o cotices un pedido, el movimiento aparecerá aquí."
                  actionLabel="Ver paquetes"
                  onAction={() => navigation?.navigate('PaquetesCreditos')}
                />
              ) : (
                <View style={s.txList}>
                  {transacciones.map((tx) => (
                    <TransaccionRow key={tx.id} transaccion={tx} />
                  ))}
                </View>
              )}

              {lastPage > 1 ? (
                <View style={s.pager}>
                  <Button
                    kind="ghost"
                    size="sm"
                    icon="chevron-left"
                    disabled={page <= 1 || txLoading}
                    onPress={() => cargarTransacciones(page - 1)}
                  >
                    Anterior
                  </Button>
                  <Text style={s.pagerText}>Página {page} de {lastPage}</Text>
                  <Button
                    kind="ghost"
                    size="sm"
                    iconRight="chevron-right"
                    disabled={page >= lastPage || txLoading}
                    onPress={() => cargarTransacciones(page + 1)}
                  >
                    Siguiente
                  </Button>
                </View>
              ) : null}
            </Card>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.canvas },
  scroll:    { padding: T.s4, paddingBottom: 40, gap: T.s4 },

  grid:        { gap: T.s4 },
  gridDesktop: { flexDirection: 'row', alignItems: 'flex-start' },
  col:         { gap: T.s4, minWidth: 0 },
  colMain:     { flex: 3 },
  colSide:     { flex: 2 },

  kpiRow: { flexDirection: 'row', flexWrap: 'wrap', gap: T.s3 },

  sectionTitle: { fontSize: 15, fontWeight: '800', color: T.ink },
  sectionDesc:  { fontSize: 13, color: T.muted, lineHeight: 20, marginTop: 4 },
  slotMeter:    { marginTop: T.s3 },

  premiumCard:    { gap: T.s3 },
  premiumHead:    { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: T.s3 },
  premiumTitleBox:{ flex: 1, minWidth: 0 },
  premiumExpiry:  { marginTop: 2 },
  premiumBtn:     { marginTop: 2 },
  beneficios:     { gap: 6 },
  beneficioRow:   { flexDirection: 'row', alignItems: 'flex-start', gap: 7 },
  beneficioText:  { flex: 1, fontSize: 13, color: T.text, lineHeight: 19 },
  simuladoNota:   { fontSize: 11, color: T.faint, textAlign: 'center' },
  inlineError:    { fontSize: 12, color: T.danger, fontWeight: '600' },

  historialHead:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: T.s3 },
  historialCount: { fontSize: 12, color: T.muted, fontWeight: '600' },
  txLoader:       { paddingVertical: 28 },
  txList:         { gap: T.s3 },
  txRow:          { flexDirection: 'row', alignItems: 'center', gap: T.s3 },
  txIcon:         { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  txTextBox:      { flex: 1, minWidth: 0, gap: 4 },
  txMotivo:       { fontSize: 13, color: T.text, fontWeight: '600' },
  txMetaRow:      { flexDirection: 'row', alignItems: 'center', gap: T.s2, flexWrap: 'wrap' },
  txFecha:        { fontSize: 11, color: T.faint },
  txMonto:        { fontSize: 15, fontWeight: '800' },
  txMontoPos:     { color: T.success },
  txMontoNeg:     { color: T.warn },

  pager:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: T.s2, marginTop: T.s4 },
  pagerText: { fontSize: 12, color: T.muted, fontWeight: '600' },
});
