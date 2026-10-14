import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  cambiarEstadoReporteSeguridad,
  descargarEvidenciaSeguridad,
  getReporteSeguridadAdmin,
  getReportesSeguridadAdmin,
} from '../services/api';
import { useToast } from '../context/ToastContext';
import { guardarArchivo } from '../utils/descargas';
import { T } from '../theme';
import { Button, Card, ScreenHeader, StatusChip } from '../components/ui';
import {
  chipDeReporte,
  chipDeServicio,
  ETIQUETA_TRANSICION,
  etiquetaCategoria,
  FILTROS_ESTADO,
  formatoFecha,
  formatoTamano,
} from '../utils/seguridadEstados';

const EXTENSION_POR_MIME = { 'image/jpeg': 'jpg', 'image/png': 'png', 'application/pdf': 'pdf' };

/**
 * Bandeja administrativa del Centro de seguridad: cola paginada con filtros,
 * detalle con historial auditable, descarga autorizada de evidencias y cambio
 * de estado con nota interna.
 *
 * - El estado del REPORTE y el del SERVICIO se muestran siempre por separado.
 * - Las transiciones salen de `transiciones_permitidas` (las decide el backend).
 * - No hay ninguna accion para reabrir, completar o cancelar el servicio.
 * - Tras guardar, el estado mostrado se vuelve a pedir al backend; un error nunca
 *   cambia lo que se ve.
 */
export default function AdminSecurityReportsScreen({ navigation, user }) {
  const toast = useToast();
  const esAdmin = user?.role === 'admin';

  const [filtroEstado, setFiltroEstado] = useState(null);
  const [soloInterrupciones, setSoloInterrupciones] = useState(false);
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  // Solo la primera carga ocupa toda la pantalla; al refiltrar la barra de filtros se conserva.
  const [primeraCarga, setPrimeraCarga] = useState(true);
  const [error, setError] = useState('');
  const [cargandoMas, setCargandoMas] = useState(false);
  const peticion = useRef(0);

  const [detalleId, setDetalleId] = useState(null);
  const [detalle, setDetalle] = useState({ loading: false, error: '', data: null });
  const [seleccion, setSeleccion] = useState(null);
  const [nota, setNota] = useState('');
  const [errorForm, setErrorForm] = useState('');
  const [guardando, setGuardando] = useState(false);
  const enCurso = useRef(false);

  const interrumpio = soloInterrupciones ? true : null;

  const cargarPagina = useCallback(async (pagina, { reemplazar = true, silencioso = false } = {}) => {
    const numero = ++peticion.current;
    if (!silencioso && reemplazar) setLoading(true);
    setError('');
    try {
      const data = await getReportesSeguridadAdmin({ estado: filtroEstado, interrumpio, page: pagina });
      if (numero !== peticion.current) return; // llego una respuesta de un filtro anterior
      setItems((prev) => (reemplazar ? (data.reportes || []) : [...prev, ...(data.reportes || [])]));
      setMeta(data.meta || null);
    } catch (err) {
      if (numero !== peticion.current) return;
      if (reemplazar) setError(err.message);
      else toast(err.message, 'error'); // lo ya mostrado se conserva
    } finally {
      if (numero === peticion.current) {
        setLoading(false);
        setPrimeraCarga(false);
      }
    }
  }, [filtroEstado, interrumpio, toast]);

  useEffect(() => {
    if (esAdmin) cargarPagina(1);
  }, [esAdmin, cargarPagina]);

  const verMas = async () => {
    if (cargandoMas || !meta || meta.current_page >= meta.last_page) return;
    setCargandoMas(true);
    await cargarPagina(meta.current_page + 1, { reemplazar: false });
    setCargandoMas(false);
  };

  const cargarDetalle = useCallback(async (id, { silencioso = false } = {}) => {
    if (!silencioso) setDetalle({ loading: true, error: '', data: null });
    try {
      const data = await getReporteSeguridadAdmin(id);
      setDetalle({ loading: false, error: '', data: data.reporte });
    } catch (err) {
      setDetalle((prev) => (silencioso ? prev : { loading: false, error: err.message, data: null }));
      if (silencioso) toast(err.message, 'error');
    }
  }, [toast]);

  const abrirDetalle = (id) => {
    setDetalleId(id);
    setSeleccion(null);
    setNota('');
    setErrorForm('');
    cargarDetalle(id);
  };

  const cerrarDetalle = () => {
    if (guardando) return;
    setDetalleId(null);
  };

  const guardar = async () => {
    if (enCurso.current) return;
    if (!seleccion) {
      setErrorForm('Elige el nuevo estado.');
      return;
    }

    enCurso.current = true;
    setGuardando(true);
    setErrorForm('');

    try {
      await cambiarEstadoReporteSeguridad(detalleId, { estado: seleccion, notaInterna: nota.trim() || null });
      toast('Estado del reporte actualizado.', 'success');
      setSeleccion(null);
      setNota('');
      // El estado mostrado siempre viene del backend.
      await Promise.all([cargarDetalle(detalleId, { silencioso: true }), cargarPagina(1, { silencioso: true })]);
    } catch (err) {
      // No cambia nada en pantalla: se informa el error y todo queda como estaba.
      toast(err.message, 'error');
    } finally {
      enCurso.current = false;
      setGuardando(false);
    }
  };

  const descargar = async (reporteId, evidencia) => {
    try {
      const { blob } = await descargarEvidenciaSeguridad(reporteId, evidencia.id);
      const nombre = `evidencia-${reporteId}-${evidencia.orden}.${EXTENSION_POR_MIME[evidencia.mime] ?? 'bin'}`;

      if (!guardarArchivo(blob, nombre)) {
        toast('La descarga de evidencias está disponible en la versión web.', 'info');
      }
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  if (!esAdmin) {
    return (
      <View style={s.centered}>
        <Text style={s.restrictedTitle}>Acceso restringido</Text>
        <Text style={s.muted}>Esta sección es solo para administradores.</Text>
      </View>
    );
  }

  if (loading && primeraCarga) {
    return (
      <View style={s.centered}>
        <ActivityIndicator size="large" color={T.blue} />
        <Text style={s.muted}>Cargando reportes...</Text>
      </View>
    );
  }

  const hayFiltros = filtroEstado !== null || soloInterrupciones;
  const hayMas = !!meta && meta.current_page < meta.last_page;

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <ScreenHeader
        title="Reportes de seguridad"
        subtitle="Cola de reportes de clientes y proveedores. Resolver o descartar un reporte no modifica el servicio."
        onBack={() => navigation.goBack()}
      />

      <View style={s.filtros}>
        {FILTROS_ESTADO.map((f) => (
          <Button
            key={String(f.key)}
            kind={filtroEstado === f.key ? 'primary' : 'ghost'}
            size="sm"
            onPress={() => setFiltroEstado(f.key)}
          >
            {f.label}
          </Button>
        ))}
        <Button
          kind={soloInterrupciones ? 'dark' : 'ghost'}
          size="sm"
          onPress={() => setSoloInterrupciones((v) => !v)}
        >
          Solo interrupciones
        </Button>
      </View>

      {loading ? (
        <View style={s.cargandoLista}>
          <ActivityIndicator color={T.blue} />
          <Text style={s.muted}>Cargando reportes...</Text>
        </View>
      ) : error ? (
        <Card style={s.errorCard}>
          <Text style={s.errorText}>{error}</Text>
          <Button kind="primary" onPress={() => cargarPagina(1)} style={{ marginTop: 12 }}>Reintentar</Button>
        </Card>
      ) : items.length === 0 ? (
        <View style={s.emptyWrap}>
          <Text style={s.emptyTitle}>{hayFiltros ? 'No hay reportes con estos filtros' : 'No hay reportes de seguridad'}</Text>
          <Text style={s.emptyDesc}>
            {hayFiltros ? 'Prueba con otro estado o quita el filtro de interrupciones.' : 'Cuando un cliente o proveedor reporte un incidente, aparecerá aquí.'}
          </Text>
        </View>
      ) : (
        <View style={s.lista}>
          {items.map((reporte) => (
            <TarjetaReporte key={reporte.id} reporte={reporte} onVer={() => abrirDetalle(reporte.id)} />
          ))}
        </View>
      )}

      {!loading && !error && hayMas ? (
        <Button kind="secondary" loading={cargandoMas} disabled={cargandoMas} onPress={verMas} style={s.verMas}>Ver más</Button>
      ) : null}

      <Modal visible={detalleId !== null} animationType="slide" onRequestClose={cerrarDetalle}>
        <View style={s.modal}>
          <View testID="detalle-reporte" style={s.modalBody}>
            <View style={s.modalHead}>
              <Text style={s.modalTitle}>{`Detalle del reporte #${detalleId ?? ''}`}</Text>
              <Button kind="ghost" size="sm" onPress={cerrarDetalle} disabled={guardando}>Cerrar</Button>
            </View>

            <ScrollView contentContainerStyle={s.modalContent}>
              {detalle.loading ? (
                <ActivityIndicator size="large" color={T.blue} />
              ) : detalle.error ? (
                <Card style={s.errorCard}>
                  <Text style={s.errorText}>{detalle.error}</Text>
                  <Button kind="primary" onPress={() => cargarDetalle(detalleId)} style={{ marginTop: 12 }}>Reintentar</Button>
                </Card>
              ) : detalle.data ? (
                <DetalleReporte
                  reporte={detalle.data}
                  seleccion={seleccion}
                  onSeleccion={(estado) => { setSeleccion(estado); setErrorForm(''); }}
                  nota={nota}
                  onNota={setNota}
                  errorForm={errorForm}
                  guardando={guardando}
                  onGuardar={guardar}
                  onDescargar={(evidencia) => descargar(detalle.data.id, evidencia)}
                />
              ) : null}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

function TarjetaReporte({ reporte, onVer }) {
  const chipReporte = chipDeReporte(reporte.estado);
  const chipServicio = chipDeServicio(reporte.servicio?.estado);
  const n = Number(reporte.evidencias_count || 0);

  return (
    <Card>
      <View testID={`reporte-${reporte.id}`} style={s.tarjeta}>
        <View style={s.tarjetaHead}>
          <Text style={s.categoria}>{etiquetaCategoria(reporte.categoria)}</Text>
          <Text style={s.fecha}>{formatoFecha(reporte.created_at)}</Text>
        </View>
        <View style={s.chips}>
          <StatusChip variant={chipReporte.variant} label={`Reporte: ${chipReporte.label}`} size="sm" />
          <StatusChip variant={chipServicio.variant} label={`Servicio: ${chipServicio.label}`} size="sm" />
        </View>
        <Text style={s.descripcion} numberOfLines={2}>{reporte.descripcion}</Text>
        <Text style={s.muted}>{`Reportó: ${reporte.reportante?.name ?? '—'}`}</Text>
        <Text style={s.muted}>{n === 1 ? '1 evidencia' : n === 0 ? 'Sin evidencias' : `${n} evidencias`}</Text>
        <Button kind="secondary" size="sm" onPress={onVer} style={s.verDetalle}>Ver detalle</Button>
      </View>
    </Card>
  );
}

function DetalleReporte({ reporte, seleccion, onSeleccion, nota, onNota, errorForm, guardando, onGuardar, onDescargar }) {
  const chipReporte = chipDeReporte(reporte.estado);
  const chipServicio = chipDeServicio(reporte.servicio?.estado);
  const interrumpido = reporte.servicio?.estado === 'interrumpido_seguridad';
  const transiciones = reporte.transiciones_permitidas || [];

  return (
    <View style={s.detalle}>
      <Text style={s.seccion}>Estado del reporte</Text>
      <StatusChip variant={chipReporte.variant} label={chipReporte.label} />

      <Text style={s.seccion}>Estado del servicio</Text>
      <StatusChip variant={chipServicio.variant} label={chipServicio.label} />
      <Text style={s.nota}>
        {interrumpido
          ? 'El servicio terminó por seguridad: es un estado final. Cambiar el estado del reporte no reabre ni completa el servicio.'
          : 'Cambiar el estado del reporte no modifica el servicio.'}
      </Text>
      <Text style={s.muted}>
        {`Cliente: ${reporte.servicio?.cliente?.name ?? '—'} · Proveedor: ${reporte.servicio?.proveedor?.nombre ?? '—'}`}
      </Text>

      <Text style={s.seccion}>Descripción</Text>
      <Text style={s.categoria}>{etiquetaCategoria(reporte.categoria)}</Text>
      <Text style={s.descripcion}>{reporte.descripcion}</Text>
      <Text style={s.muted}>{`Reportó: ${reporte.reportante?.name ?? '—'} (${reporte.reportante?.role ?? '—'}) · ${formatoFecha(reporte.created_at)}`}</Text>

      <Text style={s.seccion}>Evidencias</Text>
      {(reporte.evidencias || []).length === 0 ? (
        <Text style={s.muted}>Sin evidencias adjuntas.</Text>
      ) : (
        reporte.evidencias.map((e) => (
          <View key={e.id} style={s.evidencia}>
            <View style={{ flex: 1 }}>
              <Text style={s.evidenciaNombre}>{e.nombre ?? `Evidencia ${e.orden}`}</Text>
              <Text style={s.muted}>{`${e.mime} · ${formatoTamano(e.tamano_bytes)}`}</Text>
            </View>
            <TouchableOpacity
              style={s.descargar}
              onPress={() => onDescargar(e)}
              accessibilityRole="button"
              accessibilityLabel={e.nombre ? `Descargar ${e.nombre}` : `Descargar evidencia ${e.orden}`}
            >
              <Text style={s.descargarTexto}>Descargar</Text>
            </TouchableOpacity>
          </View>
        ))
      )}

      <Text style={s.seccion}>Historial de auditoría</Text>
      {(reporte.historial || []).map((h) => (
        <View key={h.id} style={s.evento}>
          <Text style={s.eventoTitulo}>{`${h.actor?.name ?? 'Usuario eliminado'} · ${formatoFecha(h.created_at)}`}</Text>
          <Text style={s.eventoCambio}>
            {`${h.estado_anterior ? chipDeReporte(h.estado_anterior).label : 'Creación del reporte'} → ${chipDeReporte(h.estado_nuevo).label}`}
          </Text>
          {h.nota_interna ? <Text style={s.nota}>{h.nota_interna}</Text> : null}
          {h.correlation_id ? <Text style={s.faint}>{`Ref. ${h.correlation_id}`}</Text> : null}
        </View>
      ))}

      <Text style={s.seccion}>Cambiar estado</Text>
      {transiciones.length === 0 ? (
        <Text style={s.muted}>Este reporte está en un estado final y no admite más cambios.</Text>
      ) : (
        <View style={s.formulario}>
          <View style={s.chips}>
            {transiciones.map((estado) => (
              <Button
                key={estado}
                kind={seleccion === estado ? 'primary' : 'ghost'}
                size="sm"
                disabled={guardando}
                onPress={() => onSeleccion(estado)}
              >
                {ETIQUETA_TRANSICION[estado] ?? estado}
              </Button>
            ))}
          </View>
          <TextInput
            testID="nota-interna"
            style={s.input}
            placeholder="Nota interna (solo administradores)"
            placeholderTextColor={T.faint}
            value={nota}
            onChangeText={onNota}
            multiline
            maxLength={2000}
            editable={!guardando}
          />
          {errorForm ? <Text style={s.errorText}>{errorForm}</Text> : null}
          <Button kind="primary" loading={guardando} disabled={guardando} onPress={onGuardar}>Guardar cambio</Button>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.canvas },
  content: { padding: T.s4, paddingBottom: 44, width: '100%', maxWidth: 1000, alignSelf: 'center', gap: T.s4 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, padding: T.s6 },
  muted: { fontSize: 13, color: T.muted },
  faint: { fontSize: 11, color: T.faint },
  restrictedTitle: { fontSize: 20, fontWeight: '800', color: T.ink },

  cargandoLista: { alignItems: 'center', gap: T.s2, paddingVertical: T.s6 },
  filtros: { flexDirection: 'row', flexWrap: 'wrap', gap: T.s2 },

  errorCard: { padding: 20, alignItems: 'center' },
  errorText: { fontSize: 14, color: T.danger, textAlign: 'center' },
  emptyWrap: {
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 48, gap: 10,
    backgroundColor: T.white, borderRadius: T.rLg, borderWidth: 1, borderColor: T.border,
  },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: T.ink },
  emptyDesc: { fontSize: 14, color: T.muted, textAlign: 'center', lineHeight: 20, maxWidth: 420 },

  lista: { gap: T.s3 },
  verMas: { alignSelf: 'center' },
  tarjeta: { gap: T.s2 },
  tarjetaHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: T.s2, flexWrap: 'wrap' },
  categoria: { fontSize: 15, fontWeight: '800', color: T.ink },
  fecha: { fontSize: 12, color: T.muted },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: T.s2 },
  descripcion: { fontSize: 14, color: T.text, lineHeight: 20 },
  verDetalle: { alignSelf: 'flex-start', marginTop: T.s1 },

  modal: { flex: 1, backgroundColor: T.canvas },
  modalBody: { flex: 1, width: '100%', maxWidth: 720, alignSelf: 'center' },
  modalHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: T.s3, padding: T.s4, borderBottomWidth: 1, borderBottomColor: T.border },
  modalTitle: { flex: 1, fontSize: 17, fontWeight: '800', color: T.ink },
  modalContent: { padding: T.s4, paddingBottom: 44 },

  detalle: { gap: T.s2 },
  seccion: { fontSize: 12, fontWeight: '800', color: T.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: T.s4 },
  nota: { fontSize: 13, color: T.text, lineHeight: 18 },
  evidencia: { flexDirection: 'row', alignItems: 'center', gap: T.s3, padding: T.s3, borderRadius: T.rMd, backgroundColor: T.inputBg, borderWidth: 1, borderColor: T.border },
  descargar: { height: 36, paddingHorizontal: 14, borderRadius: T.rMd, borderWidth: 1, borderColor: T.soft, backgroundColor: T.paper, alignItems: 'center', justifyContent: 'center' },
  descargarTexto: { fontSize: 13, fontWeight: '700', color: T.deep },
  evidenciaNombre: { fontSize: 14, fontWeight: '700', color: T.ink },
  evento: { gap: 2, padding: T.s3, borderRadius: T.rMd, backgroundColor: T.white, borderWidth: 1, borderColor: T.border },
  eventoTitulo: { fontSize: 12, color: T.muted },
  eventoCambio: { fontSize: 14, fontWeight: '800', color: T.ink },

  formulario: { gap: T.s3 },
  input: {
    minHeight: 80, padding: T.s3, borderRadius: T.rMd, borderWidth: 1, borderColor: T.inputBorder,
    backgroundColor: T.inputBg, color: T.text, fontSize: 14, textAlignVertical: 'top',
  },
});
