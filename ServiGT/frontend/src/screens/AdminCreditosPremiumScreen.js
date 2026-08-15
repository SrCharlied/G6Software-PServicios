import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { getAdminCompras, getAdminPremium } from '../services/api';
import { T } from '../theme';
import {
  Button,
  Card,
  EmptyState,
  KpiCard,
  PremiumBadge,
  ScreenHeader,
  StatusChip,
} from '../components/ui';

const TABS = [
  { key: 'compras', label: 'Compras' },
  { key: 'premium', label: 'Premium' },
];

const ESTADO_COMPRA = {
  completada: { variant: 'success', label: 'Completada' },
  pendiente:  { variant: 'warn',    label: 'Pendiente' },
  fallida:    { variant: 'danger',  label: 'Fallida' },
  cancelada:  { variant: 'neutral', label: 'Cancelada' },
};

const FILTROS_COMPRA = [
  { key: null,          label: 'Todas' },
  { key: 'completada',  label: 'Completadas' },
  { key: 'pendiente',   label: 'Pendientes' },
  { key: 'fallida',     label: 'Fallidas' },
  { key: 'cancelada',   label: 'Canceladas' },
];

const FILTROS_PREMIUM = [
  { key: null,      label: 'Todos' },
  { key: 'activo',  label: 'Activos' },
  { key: 'vencido', label: 'Vencidos' },
  { key: 'nunca',   label: 'Nunca' },
];

const quetzales = (valor) => `Q${Number(valor ?? 0).toFixed(2)}`;

const formatFecha = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('es-GT', { day: '2-digit', month: 'short', year: 'numeric' });
};

function FiltroChips({ opciones, valor, onChange }) {
  return (
    <View style={s.filtroRow}>
      {opciones.map((opt) => {
        const activo = valor === opt.key;
        return (
          <TouchableOpacity
            key={opt.label}
            style={[s.filtroChip, activo && s.filtroChipActivo]}
            onPress={() => onChange(opt.key)}
            accessibilityRole="button"
            accessibilityState={{ selected: activo }}
          >
            <Text style={[s.filtroTexto, activo && s.filtroTextoActivo]}>{opt.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

/**
 * Tabla en desktop y tarjetas apiladas en movil. La misma fuente de datos
 * alimenta ambas para que no se dupliquen los campos mostrados.
 */
function ComprasTabla({ compras, desktop }) {
  if (desktop) {
    return (
      <View style={s.tabla}>
        <View style={[s.fila, s.filaHead]}>
          <Text style={[s.celda, s.celdaHead, s.colProveedor]}>Proveedor</Text>
          <Text style={[s.celda, s.celdaHead, s.colPaquete]}>Paquete</Text>
          <Text style={[s.celda, s.celdaHead, s.colMonto]}>Monto</Text>
          <Text style={[s.celda, s.celdaHead, s.colCreditos]}>Créditos</Text>
          <Text style={[s.celda, s.celdaHead, s.colRef]}>Referencia</Text>
          <Text style={[s.celda, s.celdaHead, s.colFecha]}>Fecha</Text>
          <Text style={[s.celda, s.celdaHead, s.colEstado]}>Estado</Text>
        </View>

        {compras.map((compra) => {
          const estado = ESTADO_COMPRA[compra.estado] ?? ESTADO_COMPRA.pendiente;
          return (
            <View key={compra.id} style={s.fila}>
              <Text style={[s.celda, s.colProveedor]} numberOfLines={1}>{compra.proveedor ?? '—'}</Text>
              <Text style={[s.celda, s.colPaquete]} numberOfLines={1}>{compra.paquete ?? '—'}</Text>
              <Text style={[s.celda, s.colMonto]}>{quetzales(compra.monto_gtq)}</Text>
              <Text style={[s.celda, s.colCreditos]}>+{compra.creditos_otorgados}</Text>
              <Text style={[s.celda, s.colRef, s.celdaRef]}>{compra.referencia}</Text>
              <Text style={[s.celda, s.colFecha]}>{formatFecha(compra.created_at)}</Text>
              <View style={s.colEstado}>
                <StatusChip variant={estado.variant} label={estado.label} size="sm" />
              </View>
            </View>
          );
        })}
      </View>
    );
  }

  return (
    <View style={s.cardList}>
      {compras.map((compra) => {
        const estado = ESTADO_COMPRA[compra.estado] ?? ESTADO_COMPRA.pendiente;
        return (
          <Card key={compra.id} style={s.itemCard}>
            <View style={s.itemHead}>
              <Text style={s.itemTitulo} numberOfLines={1}>{compra.proveedor ?? 'Proveedor'}</Text>
              <StatusChip variant={estado.variant} label={estado.label} size="sm" />
            </View>
            <Text style={s.itemSub}>
              {compra.paquete ?? 'Paquete'} · +{compra.creditos_otorgados} créditos
            </Text>
            <View style={s.itemMeta}>
              <Text style={s.itemMetaTexto}>{quetzales(compra.monto_gtq)}</Text>
              <Text style={s.itemMetaTexto}>{compra.referencia}</Text>
              <Text style={s.itemMetaTexto}>{formatFecha(compra.created_at)}</Text>
            </View>
          </Card>
        );
      })}
    </View>
  );
}

function PremiumTabla({ filas, desktop }) {
  if (desktop) {
    return (
      <View style={s.tabla}>
        <View style={[s.fila, s.filaHead]}>
          <Text style={[s.celda, s.celdaHead, s.colProveedor]}>Proveedor</Text>
          <Text style={[s.celda, s.celdaHead, s.colPaquete]}>Correo</Text>
          <Text style={[s.celda, s.celdaHead, s.colFecha]}>Inicio</Text>
          <Text style={[s.celda, s.celdaHead, s.colFecha]}>Vence</Text>
          <Text style={[s.celda, s.celdaHead, s.colCreditos]}>Días</Text>
          <Text style={[s.celda, s.celdaHead, s.colCreditos]}>Renov.</Text>
          <Text style={[s.celda, s.celdaHead, s.colCreditos]}>Saldo</Text>
          <View style={s.colEstado} />
        </View>

        {filas.map((fila) => (
          <View key={fila.proveedor_id} style={s.fila}>
            <Text style={[s.celda, s.colProveedor]} numberOfLines={1}>{fila.nombre}</Text>
            <Text style={[s.celda, s.colPaquete]} numberOfLines={1}>{fila.email}</Text>
            <Text style={[s.celda, s.colFecha]}>{formatFecha(fila.inicio_at)}</Text>
            <Text style={[s.celda, s.colFecha]}>{formatFecha(fila.vence_at)}</Text>
            <Text style={[s.celda, s.colCreditos]}>{fila.dias_restantes}</Text>
            <Text style={[s.celda, s.colCreditos]}>{fila.renovaciones}</Text>
            <Text style={[s.celda, s.colCreditos]}>{fila.saldo}</Text>
            <View style={s.colEstado}>
              <PremiumBadge estado={fila.estado} size="sm" mostrarInactivo />
            </View>
          </View>
        ))}
      </View>
    );
  }

  return (
    <View style={s.cardList}>
      {filas.map((fila) => (
        <Card key={fila.proveedor_id} style={s.itemCard}>
          <View style={s.itemHead}>
            <Text style={s.itemTitulo} numberOfLines={1}>{fila.nombre}</Text>
            <PremiumBadge
              estado={fila.estado}
              diasRestantes={fila.dias_restantes}
              size="sm"
              mostrarInactivo
            />
          </View>
          <Text style={s.itemSub} numberOfLines={1}>{fila.email}</Text>
          <View style={s.itemMeta}>
            <Text style={s.itemMetaTexto}>Inicio: {formatFecha(fila.inicio_at)}</Text>
            <Text style={s.itemMetaTexto}>Vence: {formatFecha(fila.vence_at)}</Text>
            <Text style={s.itemMetaTexto}>Renovaciones: {fila.renovaciones}</Text>
            <Text style={s.itemMetaTexto}>Saldo: {fila.saldo}</Text>
          </View>
        </Card>
      ))}
    </View>
  );
}

export default function AdminCreditosPremiumScreen({ navigation }) {
  const { width } = useWindowDimensions();
  const desktop = width >= 1024;

  const [tab, setTab] = useState('compras');

  const [compras, setCompras]             = useState([]);
  const [filtroCompra, setFiltroCompra]   = useState(null);
  const [pagina, setPagina]               = useState(1);
  const [ultimaPagina, setUltimaPagina]   = useState(1);
  const [totalCompras, setTotalCompras]   = useState(0);

  const [premium, setPremium]             = useState([]);
  const [filtroPremium, setFiltroPremium] = useState(null);

  const [kpis, setKpis]         = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // Los cargadores reciben filtro y pagina por parametro y no cierran sobre el
  // estado: si dependieran de `filtroCompra`, cambiar el filtro recrearia la
  // funcion, dispararia el efecto y la peticion saldria dos veces.
  const cargarCompras = useCallback(async (paginaSolicitada = 1, estado = null) => {
    setLoading(true);
    setError('');
    try {
      const data = await getAdminCompras({ estado, page: paginaSolicitada });
      setCompras(data.compras ?? []);
      setPagina(data.pagina_actual ?? paginaSolicitada);
      setUltimaPagina(data.ultima_pagina ?? 1);
      setTotalCompras(data.total ?? 0);
      setKpis(data.kpis ?? null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const cargarPremium = useCallback(async (estado = null) => {
    setLoading(true);
    setError('');
    try {
      const data = await getAdminPremium({ estado });
      setPremium(data.proveedores ?? []);
      setKpis(data.kpis ?? null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab === 'compras') cargarCompras(1, filtroCompra);
    else cargarPremium(filtroPremium);
  }, [tab, filtroCompra, filtroPremium, cargarCompras, cargarPremium]);

  const onRefresh = async () => {
    setRefreshing(true);
    if (tab === 'compras') await cargarCompras(pagina, filtroCompra);
    else await cargarPremium(filtroPremium);
    setRefreshing(false);
  };

  const listaVacia = tab === 'compras' ? compras.length === 0 : premium.length === 0;

  return (
    <SafeAreaView style={s.container}>
      <ScreenHeader
        title="Créditos y Premium"
        subtitle="Compras simuladas de la plataforma y vigencia Premium por proveedor"
        onBack={() => navigation?.navigate('Admin')}
        backLabel="Panel"
      />

      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={T.blue} />}
      >
        {kpis ? (
          <View style={s.kpiRow}>
            <KpiCard
              label="Ingresos simulados"
              value={quetzales(kpis.ingresos_gtq)}
              hint={`${kpis.compras_completadas} compra(s) completada(s)`}
              icon="dollar-sign"
              color={T.deep}
            />
            <KpiCard
              label="Créditos vendidos"
              value={kpis.creditos_vendidos}
              hint="Base + bonus acreditados"
              icon="zap"
            />
            <KpiCard
              label="Bonos Premium"
              value={kpis.bonos_premium}
              hint="Créditos otorgados por ciclos"
              icon="award"
              color={T.amber}
            />
            <KpiCard
              label="Premium activos"
              value={kpis.premium_activos}
              hint={`${kpis.premium_vencidos} vencido(s)`}
              icon="star"
              color={T.success}
            />
          </View>
        ) : null}

        <View style={s.tabsRow}>
          {TABS.map((item) => {
            const activo = tab === item.key;
            return (
              <TouchableOpacity
                key={item.key}
                style={[s.tab, activo && s.tabActivo]}
                onPress={() => setTab(item.key)}
                accessibilityRole="tab"
                accessibilityState={{ selected: activo }}
              >
                <Text style={[s.tabTexto, activo && s.tabTextoActivo]}>{item.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {tab === 'compras' ? (
          <FiltroChips opciones={FILTROS_COMPRA} valor={filtroCompra} onChange={setFiltroCompra} />
        ) : (
          <FiltroChips opciones={FILTROS_PREMIUM} valor={filtroPremium} onChange={setFiltroPremium} />
        )}

        {loading ? (
          <ActivityIndicator size="large" color={T.blue} style={s.loader} />
        ) : error ? (
          <EmptyState
            error
            title="No se pudo cargar la información"
            description={error}
            actionLabel="Reintentar"
            onAction={() => (tab === 'compras' ? cargarCompras(pagina, filtroCompra) : cargarPremium(filtroPremium))}
          />
        ) : listaVacia ? (
          <EmptyState
            icon={tab === 'compras' ? 'shopping-bag' : 'award'}
            title={tab === 'compras' ? 'Sin compras con ese filtro' : 'Sin proveedores con ese filtro'}
            description="Ajusta el filtro o espera a que se registren nuevos movimientos."
          />
        ) : (
          <Card style={s.tablaCard} padding={desktop ? T.s3 : T.s2}>
            {tab === 'compras' ? (
              <>
                <Text style={s.tablaTitulo}>{totalCompras} compra(s)</Text>
                <ComprasTabla compras={compras} desktop={desktop} />
                {ultimaPagina > 1 ? (
                  <View style={s.pager}>
                    <Button
                      kind="ghost"
                      size="sm"
                      icon="chevron-left"
                      disabled={pagina <= 1}
                      onPress={() => cargarCompras(pagina - 1, filtroCompra)}
                    >
                      Anterior
                    </Button>
                    <Text style={s.pagerTexto}>Página {pagina} de {ultimaPagina}</Text>
                    <Button
                      kind="ghost"
                      size="sm"
                      iconRight="chevron-right"
                      disabled={pagina >= ultimaPagina}
                      onPress={() => cargarCompras(pagina + 1, filtroCompra)}
                    >
                      Siguiente
                    </Button>
                  </View>
                ) : null}
              </>
            ) : (
              <>
                <Text style={s.tablaTitulo}>{premium.length} proveedor(es)</Text>
                <PremiumTabla filas={premium} desktop={desktop} />
              </>
            )}
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.canvas },
  scroll:    { padding: T.s4, paddingBottom: 40, gap: T.s4 },
  loader:    { paddingVertical: 48 },

  kpiRow: { flexDirection: 'row', flexWrap: 'wrap', gap: T.s3 },

  tabsRow: { flexDirection: 'row', gap: T.s2 },
  tab: {
    paddingHorizontal: T.s5, paddingVertical: 10,
    borderRadius: T.rSm, borderWidth: 1, borderColor: T.inputBorder,
    backgroundColor: T.paper,
  },
  tabActivo:      { backgroundColor: T.blue, borderColor: T.blue },
  tabTexto:       { fontSize: 13, fontWeight: '700', color: T.muted },
  tabTextoActivo: { color: T.white },

  filtroRow:  { flexDirection: 'row', flexWrap: 'wrap', gap: T.s2 },
  filtroChip: {
    paddingHorizontal: 13, paddingVertical: 6,
    borderRadius: 999, borderWidth: 1, borderColor: T.inputBorder,
    backgroundColor: T.paper,
  },
  filtroChipActivo: { backgroundColor: T.deep, borderColor: T.deep },
  filtroTexto:      { fontSize: 12, fontWeight: '700', color: T.muted },
  filtroTextoActivo:{ color: T.white },

  tablaCard:   { gap: T.s3 },
  tablaTitulo: { fontSize: 13, fontWeight: '700', color: T.muted },

  tabla:    { borderRadius: T.rSm, overflow: 'hidden' },
  fila: {
    flexDirection: 'row', alignItems: 'center', gap: T.s2,
    paddingVertical: 10, paddingHorizontal: T.s2,
    borderBottomWidth: 1, borderBottomColor: T.border,
  },
  filaHead:  { backgroundColor: T.inputBg, borderBottomColor: T.inputBorder },
  celda:     { fontSize: 12, color: T.text },
  celdaHead: { fontSize: 11, color: T.muted, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.3 },
  celdaRef:  { fontWeight: '700', color: T.deep, letterSpacing: 0.4 },

  colProveedor: { flex: 2, minWidth: 0 },
  colPaquete:   { flex: 2, minWidth: 0 },
  colMonto:     { flex: 1, minWidth: 0 },
  colCreditos:  { width: 64 },
  colRef:       { width: 92 },
  colFecha:     { width: 96 },
  colEstado:    { width: 110, alignItems: 'flex-start' },

  cardList:  { gap: T.s3 },
  itemCard:  { gap: 6 },
  itemHead:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: T.s2 },
  itemTitulo:{ flex: 1, fontSize: 14, fontWeight: '800', color: T.ink },
  itemSub:   { fontSize: 12, color: T.muted },
  itemMeta:  { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  itemMetaTexto: { fontSize: 11, color: T.faint, fontWeight: '600' },

  pager:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: T.s2 },
  pagerTexto: { fontSize: 12, color: T.muted, fontWeight: '600' },
});
