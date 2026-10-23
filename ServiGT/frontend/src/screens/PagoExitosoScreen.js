import { Feather } from '@expo/vector-icons';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { getCompraCredito, getPagoPremium } from '../services/api';
import { Button, Card } from '../components/ui';
import { T } from '../theme';

const INTENTOS = 10;
const ESPERA_MS = 1500;

const formatMoney = (value) => `Q${Number(value || 0).toFixed(2)}`;

const formatDate = (value) => {
  if (!value) return 'Sin fecha';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Sin fecha';
  return date.toLocaleString('es-GT', { dateStyle: 'medium', timeStyle: 'short' });
};

function Linea({ label, value, accent }) {
  return (
    <View style={styles.linea}>
      <Text style={styles.lineaLabel}>{label}</Text>
      <Text style={[styles.lineaValue, accent ? { color: accent } : null]}>{value}</Text>
    </View>
  );
}

/**
 * Destino del return_url de Stripe: /pago-exitoso?compra_id=...
 *
 * Que el navegador vuelva aqui NO prueba que se pago. El estado sale de
 * GET /creditos/compras/{id}, que el backend concilia con Stripe, y la pantalla
 * solo celebra cuando la compra figura 'completada'.
 *
 * @param {number|null} compraId id de la compra (tipo 'creditos') o del pago (tipo 'premium')
 * @param {'creditos'|'premium'} tipo que se esta verificando
 * @param {() => void} onVerCreditos navega a /creditos
 * @param {() => void} onContinuar navega al panel de oportunidades
 */
export default function PagoExitosoScreen({ compraId, tipo = 'creditos', onVerCreditos, onContinuar, onVerComprobante }) {
  const esPremium = tipo === 'premium';
  const [fase, setFase] = useState('verificando'); // verificando | completada | pendiente | cancelada | fallida | error
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState('');
  const verificacion = useRef(0);

  const verificar = useCallback(async () => {
    const actual = ++verificacion.current;
    setFase('verificando');
    setError('');

    try {
      let ultima = null;
      for (let intento = 0; intento < INTENTOS; intento += 1) {
        ultima = await (esPremium ? getPagoPremium(compraId) : getCompraCredito(compraId));
        if (actual !== verificacion.current) return;
        const estado = (esPremium ? ultima?.pago : ultima?.compra)?.estado;
        if (estado && estado !== 'pendiente') break;
        await new Promise((resolve) => setTimeout(resolve, ESPERA_MS));
        if (actual !== verificacion.current) return;
      }

      setDatos(ultima);
      setFase((esPremium ? ultima?.pago : ultima?.compra)?.estado || 'pendiente');
    } catch (err) {
      if (actual !== verificacion.current) return;
      setError(err.message);
      setFase('error');
    }
  }, [compraId, esPremium]);

  useEffect(() => {
    if (!compraId) {
      setFase('error');
      setError('No se indico que compra verificar.');
      return undefined;
    }
    verificar();
    // Invalida una verificacion en curso al salir de la pantalla.
    return () => { verificacion.current += 1; };
  }, [compraId, verificar]);

  const compra = esPremium ? datos?.pago : datos?.compra;
  const premium = datos?.premium;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Card style={styles.card}>
        {fase === 'verificando' ? (
          <View style={styles.centro} testID="pago-verificando">
            <ActivityIndicator size="large" color={T.blue} />
            <Text style={styles.titulo}>Confirmando tu pago</Text>
            <Text style={styles.texto}>No cierres esta ventana. Estamos verificando el pago con Stripe.</Text>
          </View>
        ) : null}

        {fase === 'completada' && compra ? (
          <View testID="pago-exitoso">
            <View style={styles.centro}>
              <View style={[styles.icono, styles.iconoExito]}>
                <Feather name="check" size={36} color={T.success} />
              </View>
              <Text style={styles.titulo}>
                {esPremium ? 'Premium activado con exito' : 'Pago realizado con exito'}
              </Text>
              <Text style={styles.texto}>
                {esPremium
                  ? 'Tu pago se confirmo y ya tienes Premium.'
                  : `Se acreditaron ${compra.creditos_otorgados} creditos a tu cuenta.`}
              </Text>
            </View>

            <View style={styles.detalle}>
              {esPremium ? (
                <>
                  <Linea label="Plan" value={compra.recurrente ? 'Suscripcion mensual' : 'Pago unico (30 dias)'} />
                  <Linea label="Monto pagado" value={formatMoney(compra.monto_gtq)} />
                  <Linea label="Premium vigente hasta" value={formatDate(premium?.vence_at)} />
                  {compra.recurrente ? (
                    <Linea label="Proximo cobro" value={formatDate(premium?.proximo_cobro_at)} />
                  ) : null}
                  <Linea label="Creditos de bono" value={`+${premium?.creditos_por_ciclo ?? 10}`} accent={T.success} />
                </>
              ) : (
                <>
                  <Linea label="Paquete" value={compra.paquete || 'Paquete de creditos'} />
                  <Linea label="Monto pagado" value={formatMoney(compra.monto_gtq)} />
                  <Linea label="Creditos acreditados" value={`+${compra.creditos_otorgados}`} accent={T.success} />
                  {typeof datos?.saldo === 'number' ? (
                    <Linea label="Saldo actual" value={`${datos.saldo} creditos`} />
                  ) : null}
                </>
              )}
              <Linea label="Referencia" value={compra.referencia} />
              <Linea label="Fecha" value={formatDate(compra.completada_at)} />
            </View>

            <View style={styles.acciones}>
              {!esPremium && compra.comprobante_disponible && onVerComprobante ? (
                <Button icon="file-text" onPress={() => onVerComprobante(compra.id)}>Ver comprobante</Button>
              ) : null}
              <Button kind={!esPremium && compra.comprobante_disponible && onVerComprobante ? 'secondary' : undefined} icon="credit-card" onPress={onVerCreditos}>{esPremium ? 'Ver mi Premium' : 'Ver mis creditos'}</Button>
              <Button kind="secondary" icon="search" onPress={onContinuar}>Buscar oportunidades</Button>
            </View>
          </View>
        ) : null}

        {fase === 'pendiente' ? (
          <View style={styles.centro} testID="pago-pendiente">
            <View style={[styles.icono, styles.iconoAviso]}>
              <Feather name="clock" size={32} color={T.warn} />
            </View>
            <Text style={styles.titulo}>Tu pago aun se esta confirmando</Text>
            <Text style={styles.texto}>
              Stripe todavia no confirma el pago. No se cobrara dos veces: los creditos llegaran
              apenas se confirme. Referencia {compra?.referencia || 'pendiente'}.
            </Text>
            <View style={styles.acciones}>
              <Button icon="refresh-cw" onPress={verificar}>Verificar de nuevo</Button>
              <Button kind="ghost" onPress={onVerCreditos}>Volver a creditos</Button>
            </View>
          </View>
        ) : null}

        {fase === 'cancelada' || fase === 'fallida' ? (
          <View style={styles.centro} testID="pago-no-completado">
            <View style={[styles.icono, styles.iconoError]}>
              <Feather name="x" size={34} color={T.danger} />
            </View>
            <Text style={styles.titulo}>El pago no se completo</Text>
            <Text style={styles.texto}>
              {compra?.fallo_motivo || 'No se acreditaron creditos ni se realizo ningun cobro.'}
            </Text>
            <View style={styles.acciones}>
              <Button icon="credit-card" onPress={onVerCreditos}>Intentar de nuevo</Button>
            </View>
          </View>
        ) : null}

        {fase === 'error' ? (
          <View style={styles.centro} testID="pago-error">
            <View style={[styles.icono, styles.iconoError]}>
              <Feather name="alert-triangle" size={32} color={T.danger} />
            </View>
            <Text style={styles.titulo}>No pudimos verificar tu pago</Text>
            <Text style={styles.texto}>{error}</Text>
            <View style={styles.acciones}>
              {compraId ? <Button icon="refresh-cw" onPress={verificar}>Reintentar</Button> : null}
              <Button kind="ghost" onPress={onVerCreditos}>Volver a creditos</Button>
            </View>
          </View>
        ) : null}
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.canvas },
  content: { padding: T.s4, paddingBottom: 42, alignItems: 'center' },
  card: { width: '100%', maxWidth: 560 },
  centro: { alignItems: 'center', gap: T.s2, paddingVertical: T.s3 },
  icono: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: T.s2 },
  iconoExito: { backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#bbf7d0' },
  iconoAviso: { backgroundColor: '#fffbeb', borderWidth: 1, borderColor: '#fde68a' },
  iconoError: { backgroundColor: '#fff1f2', borderWidth: 1, borderColor: '#fecdd3' },
  titulo: { color: T.ink, fontSize: 22, fontWeight: '900', textAlign: 'center' },
  texto: { color: T.muted, fontSize: 14, lineHeight: 20, textAlign: 'center' },
  detalle: { marginTop: T.s4, paddingTop: T.s3, borderTopWidth: 1, borderTopColor: T.border, gap: T.s2 },
  linea: { flexDirection: 'row', justifyContent: 'space-between', gap: T.s3 },
  lineaLabel: { color: T.muted, fontSize: 13 },
  lineaValue: { color: T.ink, fontSize: 13, fontWeight: '800', flexShrink: 1, textAlign: 'right' },
  acciones: { marginTop: T.s4, gap: T.s2, alignSelf: 'stretch' },
});
