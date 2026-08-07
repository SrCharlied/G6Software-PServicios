import { Feather } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import {
  activarPremium,
  comprarCreditos,
  getCreditosPaquetes,
  getCreditosTransacciones,
  getMiCredito,
  getPremiumMiEstado,
} from '../services/api';
import { useToast } from '../context/ToastContext';
import { Button, Card, StatusChip } from '../components/ui';
import { T } from '../theme';

const USD_RATE = 7.85;

const TX_VARIANT = {
  compra: 'info',
  bono: 'success',
  recarga: 'info',
  gasto: 'danger',
};

const COMPRA_VARIANT = {
  pendiente: 'warn',
  completada: 'success',
  fallida: 'danger',
  cancelada: 'neutral',
};

const PREMIUM_VARIANT = {
  activo: 'warn',
  vencido: 'neutral',
  nunca: 'neutral',
};

const formatMoney = (value) => `Q${Number(value || 0).toFixed(2)}`;

const formatDate = (value) => {
  if (!value) return 'Sin fecha';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Sin fecha';
  return date.toLocaleString('es-GT', { dateStyle: 'medium', timeStyle: 'short' });
};

const makeIdempotencyKey = () =>
  `web-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

function PremiumBadge({ compact = false }) {
  return (
    <View style={[styles.premiumBadge, compact && styles.premiumBadgeCompact]}>
      <Feather name="star" size={compact ? 12 : 14} color="#8a5a08" />
      <Text style={[styles.premiumBadgeText, compact && styles.premiumBadgeTextCompact]}>
        Premium
      </Text>
    </View>
  );
}

function InfoLine({ label, value, accent }) {
  return (
    <View style={styles.infoLine}>
      <Text style={styles.infoLineLabel}>{label}</Text>
      <Text style={[styles.infoLineValue, accent ? { color: accent } : null]}>{value}</Text>
    </View>
  );
}

function PackageCard({ paquete, selected, onPress }) {
  const total = paquete.total_creditos ?? (paquete.creditos_base + paquete.creditos_bonus);
  const popular = paquete.nombre === 'Impulso';

  return (
    <TouchableOpacity
      activeOpacity={0.86}
      onPress={onPress}
      style={[
        styles.packageCard,
        selected && styles.packageCardSelected,
        popular && styles.packageCardPopular,
      ]}
    >
      <View style={styles.packageTop}>
        <Text style={styles.packageName}>{paquete.nombre}</Text>
        {popular ? <StatusChip variant="info" label="Popular" size="sm" dot={false} /> : null}
      </View>

      <View style={styles.packageCreditsRow}>
        <Text style={styles.packageCredits}>{total}</Text>
        <Text style={styles.packageCreditsLabel}>creditos</Text>
      </View>

      <Text style={styles.packagePrice}>{formatMoney(paquete.precio_gtq)}</Text>
      <Text style={styles.packageUsd}>≈ US${(Number(paquete.precio_gtq) / USD_RATE).toFixed(0)} aprox.</Text>

      <View style={styles.packageBreakdown}>
        <InfoLine label="Base" value={`${paquete.creditos_base}`} />
        <InfoLine label="Bonus" value={`+${paquete.creditos_bonus}`} accent={T.success} />
        <InfoLine label="Por credito" value={`Q${Number(paquete.costo_por_credito || 0).toFixed(2)}`} />
        <InfoLine
          label="vs. Inicial"
          value={paquete.ahorro_porcentaje ? `${paquete.ahorro_porcentaje}% menos` : 'precio base'}
          accent={paquete.ahorro_porcentaje ? T.success : T.faint}
        />
      </View>

      <Button kind={selected ? 'primary' : 'secondary'} size="sm" full style={styles.packageButton} onPress={onPress}>
        {selected ? 'Seleccionado' : 'Elegir'}
      </Button>
    </TouchableOpacity>
  );
}

function CheckoutModal({
  visible,
  paquete,
  saldo,
  status,
  compra,
  error,
  onClose,
  onConfirm,
}) {
  if (!paquete) return null;

  const total = paquete.total_creditos ?? (paquete.creditos_base + paquete.creditos_bonus);
  const done = status === 'completada';
  const failed = status === 'fallida';
  const cancelled = status === 'cancelada';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.checkoutCard}>
          <View style={styles.checkoutHeader}>
            <View style={styles.checkoutTitleBox}>
              <Text style={styles.checkoutTitle}>Confirmar compra</Text>
              <Text style={styles.checkoutSubtitle}>Compra simulada con acreditacion inmediata.</Text>
            </View>
            {status !== 'confirmar' ? (
              <StatusChip
                variant={COMPRA_VARIANT[status] ?? 'neutral'}
                label={status}
                size="sm"
              />
            ) : null}
          </View>

          {status !== 'confirmar' ? (
            <View style={[
              styles.checkoutBanner,
              done && styles.checkoutBannerSuccess,
              failed && styles.checkoutBannerDanger,
              cancelled && styles.checkoutBannerNeutral,
            ]}>
              <Feather
                name={done ? 'check-circle' : failed ? 'x-circle' : cancelled ? 'minus-circle' : 'loader'}
                size={22}
                color={done ? T.success : failed ? T.danger : cancelled ? T.faint : T.warn}
              />
              <View style={styles.checkoutBannerText}>
                <Text style={styles.checkoutBannerTitle}>
                  {done ? `Se acreditaron ${total} creditos` : failed ? 'No se pudo completar' : cancelled ? 'Compra cancelada' : 'Procesando compra'}
                </Text>
                <Text style={styles.checkoutBannerBody}>
                  {done
                    ? `Tu saldo se actualizo a ${saldo + total} creditos.`
                    : failed
                      ? error || 'No se acreditaron creditos.'
                      : cancelled
                        ? `Tu saldo sigue en ${saldo} creditos.`
                        : 'No cierres esta ventana mientras se registra la compra.'}
                </Text>
              </View>
            </View>
          ) : null}

          <View style={styles.checkoutPackage}>
            <View style={styles.checkoutCreditsBox}>
              <Text style={styles.checkoutCredits}>{total}</Text>
              <Text style={styles.checkoutCreditsLabel}>cred.</Text>
            </View>
            <View style={styles.checkoutPackageBody}>
              <Text style={styles.checkoutPackageName}>{paquete.nombre}</Text>
              <Text style={styles.checkoutPackageMeta}>
                {paquete.creditos_base} base + {paquete.creditos_bonus} bonus
              </Text>
            </View>
            <Text style={styles.checkoutAmount}>{formatMoney(paquete.precio_gtq)}</Text>
          </View>

          <View style={styles.checkoutLines}>
            <InfoLine label="Saldo actual" value={`${saldo} creditos`} />
            <InfoLine label="Esta compra" value={`+${total}`} accent={T.success} />
            <InfoLine label="Saldo despues" value={`${saldo + total} creditos`} />
          </View>

          <View style={styles.simNote}>
            <Feather name="shield" size={16} color={T.muted} />
            <Text style={styles.simNoteText}>
              Sin datos bancarios reales. Sprint 6 usa compra simulada y referencia visible.
            </Text>
          </View>

          {compra?.referencia ? (
            <View style={styles.referenceBox}>
              <Text style={styles.referenceLabel}>Referencia</Text>
              <Text style={styles.referenceValue}>{compra.referencia}</Text>
            </View>
          ) : null}

          <View style={styles.checkoutActions}>
            <Button kind="ghost" onPress={onClose} disabled={status === 'pendiente'}>
              {done ? 'Cerrar' : 'Cancelar'}
            </Button>
            {done ? null : (
              <Button
                icon="shield"
                loading={status === 'pendiente'}
                disabled={status === 'pendiente'}
                onPress={onConfirm}
              >
                Confirmar
              </Button>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default function CreditosScreen() {
  const toast = useToast();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 900;

  const [saldo, setSaldo] = useState(null);
  const [paquetes, setPaquetes] = useState([]);
  const [transacciones, setTransacciones] = useState([]);
  const [premium, setPremium] = useState(null);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [selectedPackageId, setSelectedPackageId] = useState(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkoutStatus, setCheckoutStatus] = useState('confirmar');
  const [checkoutCompra, setCheckoutCompra] = useState(null);
  const [checkoutError, setCheckoutError] = useState('');
  const [checkoutBaseSaldo, setCheckoutBaseSaldo] = useState(0);
  const [activatingPremium, setActivatingPremium] = useState(false);

  const selectedPackage = useMemo(
    () => paquetes.find((paquete) => paquete.id === selectedPackageId) ?? paquetes[0],
    [paquetes, selectedPackageId],
  );

  const loadData = useCallback(async ({ showLoader = true, targetPage = 1 } = {}) => {
    if (showLoader) setLoading(true);
    setError('');
    try {
      const [creditoData, paquetesData, txData, premiumData] = await Promise.all([
        getMiCredito(),
        getCreditosPaquetes(),
        getCreditosTransacciones({ page: targetPage, perPage: 8 }),
        getPremiumMiEstado(),
      ]);

      setSaldo(Number(creditoData.saldo ?? 0));
      const paquetesList = paquetesData.paquetes || [];
      setPaquetes(paquetesList);
      setSelectedPackageId((current) => current ?? paquetesList[0]?.id ?? null);
      setTransacciones(txData.transacciones || []);
      setPage(txData.pagina_actual || targetPage);
      setLastPage(txData.ultima_pagina || 1);
      setPremium(premiumData);
    } catch (err) {
      setError(err.message);
      toast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadData({ showLoader: true, targetPage: 1 });
  }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData({ showLoader: false, targetPage: page });
    setRefreshing(false);
  };

  const openCheckout = (paquete) => {
    setSelectedPackageId(paquete.id);
    setCheckoutStatus('confirmar');
    setCheckoutCompra(null);
    setCheckoutError('');
    setCheckoutBaseSaldo(saldo ?? 0);
    setCheckoutOpen(true);
  };

  const confirmCheckout = async () => {
    if (!selectedPackage) return;

    setCheckoutStatus('pendiente');
    setCheckoutError('');
    try {
      const data = await comprarCreditos({
        paqueteId: selectedPackage.id,
        idempotencyKey: makeIdempotencyKey(),
      });
      setCheckoutCompra(data.compra);
      setCheckoutStatus(data.compra?.estado || 'completada');
      await loadData({ showLoader: false, targetPage: 1 });
      toast(data.message || 'Compra completada correctamente.', 'success');
    } catch (err) {
      setCheckoutError(err.message);
      setCheckoutStatus('fallida');
      toast(err.message, 'error');
    }
  };

  const closeCheckout = () => {
    if (checkoutStatus === 'pendiente') return;
    if (checkoutStatus === 'confirmar') {
      setCheckoutStatus('cancelada');
      setTimeout(() => setCheckoutOpen(false), 450);
      return;
    }
    setCheckoutOpen(false);
  };

  const handlePremium = async () => {
    setActivatingPremium(true);
    try {
      const data = await activarPremium();
      setPremium(data);
      if (typeof data.saldo === 'number') setSaldo(data.saldo);
      await loadData({ showLoader: false, targetPage: 1 });
      toast(data.message || 'Premium actualizado.', 'success');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setActivatingPremium(false);
    }
  };

  const changePage = async (nextPage) => {
    if (nextPage < 1 || nextPage > lastPage) return;
    await loadData({ showLoader: false, targetPage: nextPage });
  };

  if (loading && saldo === null) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={T.blue} />
        <Text style={styles.loadingText}>Cargando creditos...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.headerRow}>
        <View style={styles.headerCopy}>
          <Text style={styles.title}>Creditos</Text>
          <Text style={styles.subtitle}>
            Compra paquetes simulados y revisa tus movimientos de credito.
          </Text>
        </View>
        <Button icon="refresh-cw" kind="ghost" onPress={() => loadData({ showLoader: false })}>
          Actualizar
        </Button>
      </View>

      {error ? (
        <Card style={styles.errorCard}>
          <Text style={styles.errorTitle}>No se pudo cargar la informacion</Text>
          <Text style={styles.errorText}>{error}</Text>
        </Card>
      ) : null}

      <View style={[styles.heroGrid, isDesktop && styles.heroGridDesktop]}>
        <Card padding={0} style={styles.balanceCard}>
          <View style={styles.balanceHero}>
            <Text style={styles.balanceLabel}>Saldo disponible</Text>
            <Text style={styles.balanceValue}>{saldo ?? 0}</Text>
            <Text style={styles.balanceHint}>
              Equivale a {saldo ?? 0} cotizaciones en slots pagados.
            </Text>
          </View>
          <View style={styles.balanceActions}>
            <Button icon="shopping-cart" size="sm" onPress={() => selectedPackage && openCheckout(selectedPackage)}>
              Comprar creditos
            </Button>
            <Button kind="ghost" size="sm" icon="help-circle">
              Slots
            </Button>
          </View>
        </Card>

        <Card style={styles.slotCard}>
          <Text style={styles.cardEyebrow}>Medidor de slots</Text>
          <View style={styles.slotMeter}>
            {[1, 2, 3, 4, 5, 6].map((slot) => (
              <View key={slot} style={[styles.slotStep, slot <= 3 ? styles.slotFree : styles.slotPaid]}>
                <Text style={[styles.slotStepText, slot <= 3 ? styles.slotFreeText : styles.slotPaidText]}>
                  {slot}
                </Text>
              </View>
            ))}
          </View>
          <InfoLine label="Slots 1-3" value="gratis" accent={T.success} />
          <InfoLine label="Slots 4-6" value="1 credito c/u" accent={T.warn} />
          <InfoLine label="Limite por pedido" value="6 cotizaciones" />
          <Text style={styles.slotNote}>Premium no modifica esta regla durante Sprint 6.</Text>
        </Card>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Paquetes</Text>
        <Text style={styles.sectionMeta}>Acreditacion inmediata</Text>
      </View>
      <View style={[styles.packagesGrid, isDesktop && styles.packagesGridDesktop]}>
        {paquetes.map((paquete) => (
          <PackageCard
            key={paquete.id}
            paquete={paquete}
            selected={selectedPackage?.id === paquete.id}
            onPress={() => openCheckout(paquete)}
          />
        ))}
      </View>

      <View style={styles.assistedBox}>
        <View style={styles.assistedCopy}>
          <Text style={styles.assistedTitle}>Compra simulada, sin datos bancarios</Text>
          <Text style={styles.assistedText}>
            Las compras completadas acreditan una sola vez. Pagos por transferencia quedan como recarga manual de admin.
          </Text>
        </View>
        <Feather name="shield" size={22} color={T.muted} />
      </View>

      <Card style={styles.premiumCard}>
        <View style={styles.premiumHead}>
          <View style={styles.premiumHeadCopy}>
            <PremiumBadge />
            <Text style={styles.premiumTitle}>
              {premium?.estado === 'activo'
                ? 'Premium activo'
                : premium?.estado === 'vencido'
                  ? 'Premium vencido'
                  : 'Activa Premium'}
            </Text>
            <Text style={styles.premiumText}>
              Q115 por 30 dias, badge, visibilidad limitada y 10 creditos por ciclo.
            </Text>
          </View>
          <StatusChip
            variant={PREMIUM_VARIANT[premium?.estado] ?? 'neutral'}
            label={premium?.estado || 'nunca'}
          />
        </View>

        <View style={styles.premiumLines}>
          <InfoLine label="Vigencia" value={premium?.vence_at ? formatDate(premium.vence_at) : 'Nunca activado'} />
          <InfoLine label="Dias restantes" value={`${premium?.dias_restantes ?? 0}`} />
          <InfoLine label="Renovaciones" value={`${premium?.renovaciones ?? 0}`} />
          <InfoLine label="Creditos incluidos" value={`${premium?.creditos_por_ciclo ?? 10}`} accent={T.success} />
        </View>

        <View style={styles.benefitsGrid}>
          {(premium?.beneficios || []).map((beneficio) => (
            <View key={beneficio.clave} style={styles.benefitItem}>
              <Feather name={beneficio.clave === 'creditos' ? 'gift' : beneficio.clave === 'visibilidad' ? 'trending-up' : 'star'} size={16} color="#8a5a08" />
              <Text style={styles.benefitText}>{beneficio.titulo}</Text>
            </View>
          ))}
        </View>

        <Button
          icon="star"
          loading={activatingPremium}
          disabled={activatingPremium || premium?.estado === 'activo'}
          onPress={handlePremium}
          style={styles.premiumButton}
        >
          {premium?.estado === 'activo' ? 'Ciclo activo' : premium?.estado === 'vencido' ? 'Reactivar Premium' : 'Activar Premium'}
        </Button>
      </Card>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Movimientos</Text>
        <Text style={styles.sectionMeta}>Pagina {page} de {lastPage}</Text>
      </View>

      <Card padding={0} style={styles.transactionsCard}>
        {transacciones.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>Sin movimientos todavia</Text>
            <Text style={styles.emptyText}>Tus compras, bonos, gastos y recargas apareceran aqui.</Text>
          </View>
        ) : (
          transacciones.map((tx, index) => (
            <View
              key={tx.id}
              style={[
                styles.transactionRow,
                index === transacciones.length - 1 && styles.transactionRowLast,
              ]}
            >
              <View style={styles.transactionIcon}>
                <Feather
                  name={tx.tipo === 'gasto' ? 'arrow-down-right' : tx.tipo === 'bono' ? 'gift' : 'arrow-up-right'}
                  size={17}
                  color={TX_VARIANT[tx.tipo] === 'danger' ? T.danger : TX_VARIANT[tx.tipo] === 'success' ? T.success : T.blue}
                />
              </View>
              <View style={styles.transactionBody}>
                <Text style={styles.transactionReason}>{tx.motivo}</Text>
                <Text style={styles.transactionDate}>{formatDate(tx.created_at)}</Text>
              </View>
              <View style={styles.transactionSide}>
                <Text style={[styles.transactionAmount, tx.tipo === 'gasto' ? styles.transactionAmountOut : styles.transactionAmountIn]}>
                  {tx.tipo === 'gasto' ? '-' : '+'}{tx.monto}
                </Text>
                <StatusChip
                  variant={TX_VARIANT[tx.tipo] ?? 'neutral'}
                  label={tx.tipo}
                  size="sm"
                />
              </View>
            </View>
          ))
        )}
      </Card>

      <View style={styles.pagination}>
        <Button kind="ghost" size="sm" disabled={page <= 1} onPress={() => changePage(page - 1)}>
          Anterior
        </Button>
        <Button kind="ghost" size="sm" disabled={page >= lastPage} onPress={() => changePage(page + 1)}>
          Siguiente
        </Button>
      </View>

      <CheckoutModal
        visible={checkoutOpen}
        paquete={selectedPackage}
        saldo={checkoutBaseSaldo}
        status={checkoutStatus}
        compra={checkoutCompra}
        error={checkoutError}
        onClose={closeCheckout}
        onConfirm={confirmCheckout}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.canvas },
  content: { padding: T.s4, paddingBottom: 42 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: T.s6 },
  loadingText: { marginTop: T.s2, color: T.muted, fontSize: 14 },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: T.s3,
    marginBottom: T.s4,
    flexWrap: 'wrap',
  },
  headerCopy: { flex: 1, minWidth: 220 },
  title: { color: T.ink, fontSize: 28, fontWeight: '900' },
  subtitle: { color: T.muted, fontSize: 14, marginTop: 4, lineHeight: 20 },
  errorCard: { borderColor: '#fecdd3', backgroundColor: '#fff1f2', marginBottom: T.s4 },
  errorTitle: { color: T.danger, fontSize: 14, fontWeight: '900' },
  errorText: { color: T.danger, fontSize: 13, marginTop: 4 },
  heroGrid: { gap: T.s3, marginBottom: T.s5 },
  heroGridDesktop: { flexDirection: 'row' },
  balanceCard: { overflow: 'hidden', flex: 1.1 },
  balanceHero: { backgroundColor: T.ink, padding: T.s5 },
  balanceLabel: { color: 'rgba(255,255,255,0.78)', fontSize: 12, fontWeight: '800', textTransform: 'uppercase' },
  balanceValue: { color: T.white, fontSize: 52, fontWeight: '900', lineHeight: 58, marginTop: 4 },
  balanceHint: { color: 'rgba(255,255,255,0.82)', fontSize: 13, marginTop: 6 },
  balanceActions: { flexDirection: 'row', gap: T.s2, flexWrap: 'wrap', padding: T.s4, backgroundColor: T.white },
  slotCard: { flex: 1 },
  cardEyebrow: { color: T.faint, fontSize: 11, fontWeight: '900', textTransform: 'uppercase' },
  slotMeter: { flexDirection: 'row', gap: T.s2, marginVertical: T.s4 },
  slotStep: { flex: 1, minHeight: 42, borderRadius: T.rSm, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  slotFree: { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' },
  slotPaid: { backgroundColor: '#fef3c7', borderColor: '#fde68a' },
  slotStepText: { fontSize: 15, fontWeight: '900' },
  slotFreeText: { color: T.success },
  slotPaidText: { color: T.warn },
  slotNote: { color: T.muted, fontSize: 12, lineHeight: 17, marginTop: T.s3 },
  infoLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: T.s3, marginTop: 8 },
  infoLineLabel: { color: T.muted, fontSize: 12 },
  infoLineValue: { color: T.ink, fontSize: 13, fontWeight: '800' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: T.s3, marginBottom: T.s3 },
  sectionTitle: { color: T.ink, fontSize: 18, fontWeight: '900' },
  sectionMeta: { color: T.faint, fontSize: 12, fontWeight: '700' },
  packagesGrid: { gap: T.s3, marginBottom: T.s4 },
  packagesGridDesktop: { flexDirection: 'row', flexWrap: 'wrap' },
  packageCard: {
    ...T.card,
    ...T.sh1,
    padding: T.s4,
    flexBasis: 210,
    flexGrow: 1,
  },
  packageCardSelected: { borderColor: T.blue, borderWidth: 2 },
  packageCardPopular: { backgroundColor: '#fbfdff' },
  packageTop: { minHeight: 24, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: T.s2 },
  packageName: { color: T.ink, fontSize: 15, fontWeight: '900' },
  packageCreditsRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: T.s3 },
  packageCredits: { color: T.ink, fontSize: 34, fontWeight: '900', lineHeight: 38 },
  packageCreditsLabel: { color: T.muted, fontSize: 12, fontWeight: '700' },
  packagePrice: { color: T.ink, fontSize: 22, fontWeight: '900', marginTop: T.s3 },
  packageUsd: { color: T.faint, fontSize: 11, marginTop: 2 },
  packageBreakdown: { marginTop: T.s3, paddingTop: T.s2, borderTopWidth: 1, borderTopColor: T.border },
  packageButton: { marginTop: T.s4 },
  assistedBox: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: T.border,
    borderRadius: T.rMd,
    padding: T.s4,
    marginBottom: T.s5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: T.s3,
    backgroundColor: T.paper,
  },
  assistedCopy: { flex: 1, minWidth: 0 },
  assistedTitle: { color: T.ink, fontSize: 14, fontWeight: '900' },
  assistedText: { color: T.muted, fontSize: 12, lineHeight: 18, marginTop: 4 },
  premiumCard: { marginBottom: T.s5, borderColor: '#f0cd8c' },
  premiumHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: T.s3 },
  premiumHeadCopy: { flex: 1, minWidth: 0 },
  premiumBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: '#fbf1dc',
    borderWidth: 1,
    borderColor: '#f0cd8c',
  },
  premiumBadgeCompact: { paddingHorizontal: 8, paddingVertical: 3 },
  premiumBadgeText: { color: '#8a5a08', fontSize: 12, fontWeight: '900' },
  premiumBadgeTextCompact: { fontSize: 10 },
  premiumTitle: { color: T.ink, fontSize: 20, fontWeight: '900', marginTop: T.s3 },
  premiumText: { color: T.muted, fontSize: 13, lineHeight: 19, marginTop: 4 },
  premiumLines: { marginTop: T.s3, paddingTop: T.s2, borderTopWidth: 1, borderTopColor: T.border },
  benefitsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: T.s2, marginTop: T.s4 },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: '#fff9ec',
    borderWidth: 1,
    borderColor: '#f6dfb1',
    borderRadius: T.rSm,
    paddingHorizontal: T.s3,
    paddingVertical: 8,
  },
  benefitText: { color: '#8a5a08', fontSize: 12, fontWeight: '800' },
  premiumButton: { marginTop: T.s4, alignSelf: 'flex-start' },
  transactionsCard: { overflow: 'hidden' },
  emptyState: { padding: T.s6, alignItems: 'center' },
  emptyTitle: { color: T.ink, fontSize: 16, fontWeight: '900' },
  emptyText: { color: T.muted, fontSize: 13, marginTop: 6, textAlign: 'center' },
  transactionRow: { flexDirection: 'row', alignItems: 'center', gap: T.s3, padding: T.s4, borderBottomWidth: 1, borderBottomColor: T.border },
  transactionRowLast: { borderBottomWidth: 0 },
  transactionIcon: { width: 36, height: 36, borderRadius: T.rSm, backgroundColor: T.paper, alignItems: 'center', justifyContent: 'center' },
  transactionBody: { flex: 1, minWidth: 0 },
  transactionReason: { color: T.ink, fontSize: 13, fontWeight: '700', lineHeight: 18 },
  transactionDate: { color: T.faint, fontSize: 11, marginTop: 3 },
  transactionSide: { alignItems: 'flex-end', gap: 5 },
  transactionAmount: { fontSize: 16, fontWeight: '900' },
  transactionAmountIn: { color: T.success },
  transactionAmountOut: { color: T.danger },
  pagination: { flexDirection: 'row', justifyContent: 'flex-end', gap: T.s2, marginTop: T.s3 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(14,20,36,0.46)', justifyContent: 'center', alignItems: 'center', padding: T.s4 },
  checkoutCard: { width: '100%', maxWidth: 620, backgroundColor: T.white, borderRadius: T.rMd, padding: T.s5, ...T.sh3 },
  checkoutHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: T.s3 },
  checkoutTitleBox: { flex: 1, minWidth: 0 },
  checkoutTitle: { color: T.ink, fontSize: 20, fontWeight: '900' },
  checkoutSubtitle: { color: T.muted, fontSize: 13, marginTop: 3 },
  checkoutBanner: { flexDirection: 'row', gap: T.s3, borderWidth: 1, borderColor: '#fde68a', backgroundColor: '#fffbeb', borderRadius: T.rMd, padding: T.s3, marginTop: T.s4 },
  checkoutBannerSuccess: { borderColor: '#bbf7d0', backgroundColor: '#f0fdf4' },
  checkoutBannerDanger: { borderColor: '#fecdd3', backgroundColor: '#fff1f2' },
  checkoutBannerNeutral: { borderColor: T.border, backgroundColor: T.paper },
  checkoutBannerText: { flex: 1, minWidth: 0 },
  checkoutBannerTitle: { color: T.ink, fontSize: 14, fontWeight: '900' },
  checkoutBannerBody: { color: T.muted, fontSize: 12, lineHeight: 17, marginTop: 2 },
  checkoutPackage: { flexDirection: 'row', alignItems: 'center', gap: T.s3, paddingVertical: T.s4, borderBottomWidth: 1, borderBottomColor: T.border },
  checkoutCreditsBox: { width: 58, height: 58, borderRadius: T.rMd, backgroundColor: '#e6effa', alignItems: 'center', justifyContent: 'center' },
  checkoutCredits: { color: T.deep, fontSize: 20, fontWeight: '900', lineHeight: 22 },
  checkoutCreditsLabel: { color: T.deep, fontSize: 9, fontWeight: '900' },
  checkoutPackageBody: { flex: 1, minWidth: 0 },
  checkoutPackageName: { color: T.ink, fontSize: 16, fontWeight: '900' },
  checkoutPackageMeta: { color: T.muted, fontSize: 12, marginTop: 3 },
  checkoutAmount: { color: T.ink, fontSize: 20, fontWeight: '900' },
  checkoutLines: { paddingTop: T.s3 },
  simNote: { flexDirection: 'row', gap: T.s2, alignItems: 'flex-start', padding: T.s3, borderRadius: T.rSm, backgroundColor: T.paper, marginTop: T.s4 },
  simNoteText: { flex: 1, color: T.muted, fontSize: 12, lineHeight: 17 },
  referenceBox: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: T.s3, marginTop: T.s3, padding: T.s3, borderRadius: T.rSm, borderWidth: 1, borderColor: T.border },
  referenceLabel: { color: T.muted, fontSize: 12, fontWeight: '700' },
  referenceValue: { color: T.ink, fontSize: 13, fontWeight: '900', fontFamily: 'monospace' },
  checkoutActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: T.s2, marginTop: T.s5, flexWrap: 'wrap' },
});
