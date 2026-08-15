import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import {
  comprarCreditos,
  getMiCredito,
  getPaquetesCreditos,
  nuevaIdempotencyKey,
} from '../services/api';
import { T } from '../theme';
import {
  Button,
  Card,
  CreditBalance,
  EmptyState,
  ScreenHeader,
  StatusChip,
} from '../components/ui';

// Tipo de cambio solo informativo. El precio oficial se cobra en quetzales;
// el equivalente en dolares se muestra siempre con "≈" para dejar claro que
// es secundario y no es el monto cobrado.
const USD_POR_GTQ = 0.13;

const ESTADO_COMPRA = {
  completada: { variant: 'success', label: 'Completada' },
  pendiente:  { variant: 'warn',    label: 'Pendiente' },
  fallida:    { variant: 'danger',  label: 'Fallida' },
  cancelada:  { variant: 'neutral', label: 'Cancelada' },
};

const quetzales = (valor) => `Q${Number(valor ?? 0).toFixed(2)}`;
const dolares   = (valor) => `≈ US$${(Number(valor ?? 0) * USD_POR_GTQ).toFixed(2)}`;

function PaqueteCard({ paquete, seleccionado, onSelect, destacado }) {
  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={() => onSelect(paquete)}
      style={s.paqueteWrap}
      accessibilityRole="button"
      accessibilityState={{ selected: seleccionado }}
    >
      <Card style={[s.paquete, seleccionado && s.paqueteActivo]}>
        {destacado ? (
          <StatusChip variant="info" label="MÁS ELEGIDO" size="sm" dot={false} />
        ) : null}

        <Text style={s.paqueteNombre}>{paquete.nombre}</Text>

        <View style={s.precioRow}>
          <Text style={s.precio}>{quetzales(paquete.precio_gtq)}</Text>
          <Text style={s.precioUsd}>{dolares(paquete.precio_gtq)}</Text>
        </View>

        <View style={s.creditosBox}>
          <Text style={s.creditosTotal}>{paquete.total_creditos} créditos</Text>
          <Text style={s.creditosDetalle}>
            {paquete.creditos_base} base
            {paquete.creditos_bonus > 0 ? ` + ${paquete.creditos_bonus} bonus` : ''}
          </Text>
        </View>

        <View style={s.paqueteFoot}>
          <Text style={s.costoUnitario}>{quetzales(paquete.costo_por_credito)} por crédito</Text>
          {paquete.ahorro_porcentaje > 0 ? (
            <StatusChip variant="success" label={`-${paquete.ahorro_porcentaje}%`} size="sm" dot={false} />
          ) : null}
        </View>

        <View style={[s.selector, seleccionado && s.selectorActivo]}>
          <Feather
            name={seleccionado ? 'check-circle' : 'circle'}
            size={14}
            color={seleccionado ? T.blue : T.faint}
          />
          <Text style={[s.selectorText, seleccionado && s.selectorTextActivo]}>
            {seleccionado ? 'Seleccionado' : 'Seleccionar'}
          </Text>
        </View>
      </Card>
    </TouchableOpacity>
  );
}

function CheckoutModal({ visible, paquete, procesando, resultado, error, onConfirm, onClose }) {
  if (!paquete) return null;

  const estado = resultado ? (ESTADO_COMPRA[resultado.estado] ?? ESTADO_COMPRA.pendiente) : null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={s.modalBackdrop}>
        <View style={s.modalCard}>
          <View style={s.modalHead}>
            <Text style={s.modalTitle}>
              {resultado ? 'Compra registrada' : 'Confirmar compra'}
            </Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Feather name="x" size={18} color={T.muted} />
            </TouchableOpacity>
          </View>

          {resultado ? (
            <View style={s.modalBody}>
              <View style={s.resumenRow}>
                <Text style={s.resumenLabel}>Estado</Text>
                <StatusChip variant={estado.variant} label={estado.label} size="sm" />
              </View>
              <View style={s.resumenRow}>
                <Text style={s.resumenLabel}>Referencia</Text>
                <Text style={s.resumenValorMono}>{resultado.referencia}</Text>
              </View>
              <View style={s.resumenRow}>
                <Text style={s.resumenLabel}>Paquete</Text>
                <Text style={s.resumenValor}>{resultado.paquete}</Text>
              </View>
              <View style={s.resumenRow}>
                <Text style={s.resumenLabel}>Créditos acreditados</Text>
                <Text style={s.resumenValor}>+{resultado.creditos_otorgados}</Text>
              </View>
              <View style={s.resumenRow}>
                <Text style={s.resumenLabel}>Monto</Text>
                <Text style={s.resumenValor}>{quetzales(resultado.monto_gtq)}</Text>
              </View>

              <Button kind="primary" full onPress={onClose} style={s.modalBtn}>
                Listo
              </Button>
            </View>
          ) : (
            <View style={s.modalBody}>
              <View style={s.resumenRow}>
                <Text style={s.resumenLabel}>Paquete</Text>
                <Text style={s.resumenValor}>{paquete.nombre}</Text>
              </View>
              <View style={s.resumenRow}>
                <Text style={s.resumenLabel}>Créditos</Text>
                <Text style={s.resumenValor}>
                  {paquete.total_creditos}
                  {paquete.creditos_bonus > 0 ? ` (incluye ${paquete.creditos_bonus} bonus)` : ''}
                </Text>
              </View>
              <View style={s.resumenRow}>
                <Text style={s.resumenLabel}>Total a pagar</Text>
                <View style={s.totalBox}>
                  <Text style={s.totalValor}>{quetzales(paquete.precio_gtq)}</Text>
                  <Text style={s.totalUsd}>{dolares(paquete.precio_gtq)}</Text>
                </View>
              </View>

              <View style={s.avisoBox}>
                <Feather name="shield" size={14} color={T.blue} />
                <Text style={s.avisoText}>
                  Compra simulada para el MVP. No se piden ni se almacenan número de tarjeta,
                  CVV ni datos bancarios. Los créditos se acreditan al confirmar.
                </Text>
              </View>

              {error ? <Text style={s.modalError}>{error}</Text> : null}

              <View style={s.modalActions}>
                <Button kind="ghost" onPress={onClose} disabled={procesando}>
                  Cancelar
                </Button>
                <Button kind="primary" icon="check" loading={procesando} onPress={onConfirm}>
                  Confirmar compra
                </Button>
              </View>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

export default function PaquetesCreditosScreen({ navigation }) {
  const { width } = useWindowDimensions();
  const columnas = width >= 1100 ? 4 : width >= 760 ? 2 : 1;

  const [paquetes, setPaquetes]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');

  const [saldo, setSaldo]               = useState(null);
  const [saldoLoading, setSaldoLoading] = useState(true);
  const [saldoError, setSaldoError]     = useState('');

  const [seleccionado, setSeleccionado] = useState(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [procesando, setProcesando]     = useState(false);
  const [compraError, setCompraError]   = useState('');
  const [resultado, setResultado]       = useState(null);
  // La clave se fija al abrir el checkout: reintentar el mismo checkout no
  // puede acreditar dos veces, pero una compra nueva si genera otra clave.
  const [idempotencyKey, setIdempotencyKey] = useState(null);

  const cargarPaquetes = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getPaquetesCreditos();
      setPaquetes(data.paquetes ?? []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const cargarSaldo = useCallback(async () => {
    setSaldoLoading(true);
    setSaldoError('');
    try {
      const data = await getMiCredito();
      setSaldo(data.saldo ?? 0);
    } catch (err) {
      setSaldo(null);
      setSaldoError(err.message);
    } finally {
      setSaldoLoading(false);
    }
  }, []);

  useEffect(() => {
    cargarPaquetes();
    cargarSaldo();
  }, [cargarPaquetes, cargarSaldo]);

  const abrirCheckout = (paquete) => {
    setSeleccionado(paquete);
    setResultado(null);
    setCompraError('');
    setIdempotencyKey(nuevaIdempotencyKey('compra'));
    setCheckoutOpen(true);
  };

  const confirmarCompra = async () => {
    if (!seleccionado || !idempotencyKey) return;
    setProcesando(true);
    setCompraError('');
    try {
      const data = await comprarCreditos(seleccionado.id, idempotencyKey);
      setResultado(data.compra);
      // El saldo se toma de la respuesta cuando viene y si no se reconsulta,
      // para que la pantalla nunca muestre un saldo inventado.
      if (typeof data.saldo === 'number') {
        setSaldo(data.saldo);
        setSaldoError('');
      } else {
        await cargarSaldo();
      }
    } catch (err) {
      setCompraError(err.message);
    } finally {
      setProcesando(false);
    }
  };

  const cerrarCheckout = () => {
    setCheckoutOpen(false);
    setProcesando(false);
  };

  return (
    <SafeAreaView style={s.container}>
      <ScreenHeader
        title="Paquetes de créditos"
        subtitle="Precios oficiales en quetzales · compra simulada"
        onBack={navigation?.goBack}
        backLabel="Créditos"
      />

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <CreditBalance
          saldo={saldo}
          loading={saldoLoading}
          error={saldoError}
          onRetry={cargarSaldo}
          compact
        />

        {loading ? (
          <ActivityIndicator size="large" color={T.blue} style={s.loader} />
        ) : error ? (
          <EmptyState
            error
            title="No se pudieron cargar los paquetes"
            description={error}
            actionLabel="Reintentar"
            onAction={cargarPaquetes}
          />
        ) : paquetes.length === 0 ? (
          <EmptyState
            icon="package"
            title="No hay paquetes disponibles"
            description="El administrador puede activar paquetes sin necesidad de cambios en el código."
          />
        ) : (
          <>
            <View style={s.paquetesGrid}>
              {paquetes.map((paquete) => (
                <View
                  key={paquete.id}
                  style={[s.paqueteCol, { flexBasis: `${100 / columnas}%`, maxWidth: `${100 / columnas}%` }]}
                >
                  <PaqueteCard
                    paquete={paquete}
                    seleccionado={seleccionado?.id === paquete.id}
                    destacado={paquete.nombre === 'Impulso'}
                    onSelect={abrirCheckout}
                  />
                </View>
              ))}
            </View>

            <Card style={s.notaCard}>
              <Text style={s.notaTitulo}>Cómo funciona la compra</Text>
              <Text style={s.notaTexto}>
                • El precio oficial se cobra en quetzales; el equivalente en dólares es solo referencial.{'\n'}
                • La compra es simulada durante esta fase: no se solicitan datos bancarios.{'\n'}
                • Los créditos se acreditan de inmediato y no expiran.{'\n'}
                • Cada compra queda con una referencia SGT-XXXXX visible en tu historial.
              </Text>
            </Card>
          </>
        )}
      </ScrollView>

      <CheckoutModal
        visible={checkoutOpen}
        paquete={seleccionado}
        procesando={procesando}
        resultado={resultado}
        error={compraError}
        onConfirm={confirmarCompra}
        onClose={cerrarCheckout}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.canvas },
  scroll:    { padding: T.s4, paddingBottom: 40, gap: T.s4 },
  loader:    { paddingVertical: 48 },

  paquetesGrid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -T.s2 },
  paqueteCol:   { paddingHorizontal: T.s2, paddingBottom: T.s3 },
  paqueteWrap:  { flex: 1 },
  paquete:      { gap: 8, minHeight: 230 },
  paqueteActivo:{ borderColor: T.blue, borderWidth: 2 },

  paqueteNombre: { fontSize: 17, fontWeight: '800', color: T.ink },
  precioRow:     { gap: 1 },
  precio:        { fontSize: 26, fontWeight: '800', color: T.deep },
  precioUsd:     { fontSize: 11, color: T.faint },

  creditosBox:     { marginTop: 2 },
  creditosTotal:   { fontSize: 15, fontWeight: '800', color: T.blue },
  creditosDetalle: { fontSize: 12, color: T.muted, marginTop: 1 },

  paqueteFoot:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: T.s2, marginTop: 'auto' },
  costoUnitario: { fontSize: 11, color: T.muted, fontWeight: '600' },

  selector: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    marginTop: T.s2, paddingVertical: 8,
    borderRadius: T.rSm, borderWidth: 1, borderColor: T.border, backgroundColor: T.inputBg,
  },
  selectorActivo:    { borderColor: T.blue, backgroundColor: '#eff6ff' },
  selectorText:      { fontSize: 12, fontWeight: '700', color: T.muted },
  selectorTextActivo:{ color: T.blue },

  notaCard:   { gap: 6 },
  notaTitulo: { fontSize: 14, fontWeight: '800', color: T.ink },
  notaTexto:  { fontSize: 12, color: T.muted, lineHeight: 20 },

  modalBackdrop: {
    flex: 1, backgroundColor: 'rgba(14,20,36,0.45)',
    alignItems: 'center', justifyContent: 'center', padding: T.s4,
  },
  modalCard: {
    width: '100%', maxWidth: 440,
    backgroundColor: T.white, borderRadius: T.rLg,
    borderWidth: 1, borderColor: T.border, ...T.sh3,
  },
  modalHead: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: T.s4, paddingVertical: T.s3,
    borderBottomWidth: 1, borderBottomColor: T.border,
  },
  modalTitle: { fontSize: 16, fontWeight: '800', color: T.ink },
  modalBody:  { padding: T.s4, gap: T.s3 },

  resumenRow:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: T.s3 },
  resumenLabel:    { fontSize: 13, color: T.muted },
  resumenValor:    { fontSize: 14, fontWeight: '700', color: T.ink, flexShrink: 1, textAlign: 'right' },
  resumenValorMono:{ fontSize: 14, fontWeight: '800', color: T.deep, letterSpacing: 0.5 },
  totalBox:        { alignItems: 'flex-end' },
  totalValor:      { fontSize: 20, fontWeight: '800', color: T.deep },
  totalUsd:        { fontSize: 11, color: T.faint },

  avisoBox: {
    flexDirection: 'row', gap: 8, alignItems: 'flex-start',
    backgroundColor: '#eff6ff', borderRadius: T.rSm, borderWidth: 1, borderColor: '#bfdbfe',
    padding: T.s3,
  },
  avisoText: { flex: 1, fontSize: 12, color: '#1d4ed8', lineHeight: 18 },

  modalError:   { fontSize: 12, color: T.danger, fontWeight: '600' },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: T.s2 },
  modalBtn:     { marginTop: T.s2 },
});
