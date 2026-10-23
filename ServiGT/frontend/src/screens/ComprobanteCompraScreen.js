import { Feather } from '@expo/vector-icons';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { getComprobanteCompra } from '../services/api';
import { Button, Card } from '../components/ui';
import {
  filasComprobante,
  imprimirComprobante,
  LEYENDA_SIN_VALIDEZ_FISCAL,
  puedeImprimir,
} from '../utils/comprobante';
import { T } from '../theme';

/**
 * Comprobante informativo de una compra de créditos (HU 4.1).
 *
 * Muestra el snapshot guardado al completarse la compra: no recalcula nada a
 * partir del paquete ni del proveedor actuales. No es PDF ni documento fiscal;
 * la impresión solo existe en la versión web.
 *
 * @param {number|null} compraId id de la compra propia
 * @param {() => void} onVolver regresa a /creditos
 */
export default function ComprobanteCompraScreen({ compraId, onVolver }) {
  const [fase, setFase] = useState('cargando'); // cargando | listo | error
  const [comprobante, setComprobante] = useState(null);
  const [error, setError] = useState('');
  const [avisoImpresion, setAvisoImpresion] = useState('');
  const carga = useRef(0);

  const cargar = useCallback(async () => {
    const actual = ++carga.current;
    setFase('cargando');
    setError('');

    try {
      const data = await getComprobanteCompra(compraId);
      if (actual !== carga.current) return;
      setComprobante(data?.comprobante || null);
      setFase(data?.comprobante ? 'listo' : 'error');
      if (!data?.comprobante) setError('No se pudo cargar el comprobante.');
    } catch (err) {
      if (actual !== carga.current) return;
      setError(err.message);
      setFase('error');
    }
  }, [compraId]);

  useEffect(() => {
    if (!compraId) {
      setFase('error');
      setError('No se indicó qué comprobante mostrar.');
      return undefined;
    }
    cargar();
    return () => { carga.current += 1; };
  }, [compraId, cargar]);

  const imprimir = () => {
    setAvisoImpresion('');
    if (!imprimirComprobante(comprobante)) {
      setAvisoImpresion('No se pudo abrir la impresión en este navegador.');
    }
  };

  const web = Platform.OS === 'web' && puedeImprimir();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Card style={styles.card}>
        {fase === 'cargando' ? (
          <View style={styles.centro} testID="comprobante-cargando">
            <ActivityIndicator size="large" color={T.blue} />
            <Text style={styles.texto}>Cargando comprobante…</Text>
          </View>
        ) : null}

        {fase === 'error' ? (
          <View style={styles.centro} testID="comprobante-error">
            <View style={styles.icono}>
              <Feather name="alert-triangle" size={30} color={T.danger} />
            </View>
            <Text style={styles.titulo}>No se pudo mostrar el comprobante</Text>
            <Text style={styles.texto}>{error}</Text>
            <View style={styles.acciones}>
              {compraId ? <Button icon="refresh-cw" onPress={cargar}>Reintentar</Button> : null}
              <Button kind="ghost" onPress={onVolver}>Volver a créditos</Button>
            </View>
          </View>
        ) : null}

        {fase === 'listo' && comprobante ? (
          <View testID="comprobante-listo">
            <Text style={styles.titulo}>Comprobante de compra</Text>
            <Text style={styles.folio}>Folio {comprobante.folio}</Text>

            <View style={styles.detalle}>
              {filasComprobante(comprobante).map(([label, value]) => (
                <View key={label} style={styles.linea}>
                  <Text style={styles.lineaLabel}>{label}</Text>
                  <Text style={styles.lineaValue}>{value}</Text>
                </View>
              ))}
            </View>

            <Text style={styles.leyenda} testID="comprobante-leyenda">
              {comprobante.leyenda || LEYENDA_SIN_VALIDEZ_FISCAL}
            </Text>

            <View style={styles.acciones}>
              {web ? (
                <Button icon="printer" onPress={imprimir}>Imprimir comprobante</Button>
              ) : (
                <Text style={styles.nota}>La impresión del comprobante está disponible en la versión web.</Text>
              )}
              {avisoImpresion ? <Text style={styles.error}>{avisoImpresion}</Text> : null}
              <Button kind="ghost" onPress={onVolver}>Volver a créditos</Button>
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
  icono: {
    width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#fff1f2', borderWidth: 1, borderColor: '#fecdd3',
  },
  titulo: { color: T.ink, fontSize: 22, fontWeight: '900', textAlign: 'center' },
  folio: { color: T.muted, fontSize: 14, textAlign: 'center', marginTop: 4 },
  texto: { color: T.muted, fontSize: 14, lineHeight: 20, textAlign: 'center' },
  detalle: { marginTop: T.s4, paddingTop: T.s3, borderTopWidth: 1, borderTopColor: T.border, gap: T.s2 },
  linea: { flexDirection: 'row', justifyContent: 'space-between', gap: T.s3 },
  lineaLabel: { color: T.muted, fontSize: 13 },
  lineaValue: { color: T.ink, fontSize: 13, fontWeight: '800', flexShrink: 1, textAlign: 'right' },
  leyenda: { marginTop: T.s4, color: T.muted, fontSize: 12, lineHeight: 18, textAlign: 'center' },
  nota: { color: T.muted, fontSize: 13, textAlign: 'center' },
  error: { color: T.danger, fontSize: 13, textAlign: 'center' },
  acciones: { marginTop: T.s4, gap: T.s2, alignSelf: 'stretch' },
});
