import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Linking, Modal, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { getServicio, getReporteSeguridad, registrarReporteSeguridad, subirEvidenciasSeguridad, descargarEvidenciaSeguridad } from '../services/api';
import { sessionStorage } from '../services/sessionStorage';
import { guardarArchivo } from '../utils/descargas';
import { Button, Input, ScreenHeader, StatusChip } from '../components/ui';
import MaterialConfirmModal from '../components/material/MaterialConfirmModal';
import { CATEGORIAS, chipDeReporte, chipDeServicio } from '../utils/seguridadEstados';
import { canOpenSafety, EMERGENCY_RESOURCES } from '../utils/serviceSafety';
import { T } from '../theme';

export default function ServiceSafetyScreen({ servicioId, user, navigation }) {
  return <SafetyContent key={`${user?.id}:${servicioId}`} servicioId={servicioId} user={user} navigation={navigation} />;
}
function SafetyContent({ servicioId, user, navigation }) {
  const participant = ['cliente', 'proveedor'].includes(user?.role);
  const [servicio, setServicio] = useState(null);
  const [reporte, setReporte] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [categoria, setCategoria] = useState('otro');
  const [descripcion, setDescripcion] = useState('');
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [confirmation, setConfirmation] = useState(false);
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState(null);
  const [uploadPending, setUploadPending] = useState(false);
  const lock = useRef(false);
  const active = useRef(true);
  const key = `chat_safety_${user?.id}_${servicioId}`;
  const load = async () => {
    setLoading(true); setError('');
    try {
      const data = await getServicio(servicioId);
      if (!active.current) return;
      setServicio(data.servicio);
      const saved = await sessionStorage.getItem(key);
      if (saved) {
        const state = JSON.parse(saved);
        if (state.reporteId) setReporte((await getReporteSeguridad(state.reporteId)).reporte);
        else if (state.payload) { setPending(state); setDescripcion(state.payload.descripcion); setCategoria(state.payload.categoria); }
      }
    } catch (err) { if (active.current) setError(err.message); }
    finally { if (active.current) setLoading(false); }
  };
  useEffect(() => { active.current = true; if (participant) load(); return () => { active.current = false; }; }, [servicioId, user?.id]);
  const submit = async (interrumpir = false) => {
    if (lock.current) return;
    if (!pending && descripcion.trim().length < 5) { setError('Describe el incidente con al menos 5 caracteres.'); return; }
    lock.current = true; setBusy(true); setError('');
    try {
      const attempt = pending || { interrumpir, payload: { categoria, descripcion: descripcion.trim(), idempotency_key: `safety-${user.id}-${servicioId}-${Date.now()}-${Math.random().toString(36).slice(2)}` } };
      setPending(attempt);
      await sessionStorage.setItem(key, JSON.stringify(attempt));
      const response = await registrarReporteSeguridad(servicioId, attempt.payload, attempt.interrumpir);
      if (!response.reporte?.id || !response.servicio) throw new Error('El servidor no confirmo el reporte.');
      await sessionStorage.setItem(key, JSON.stringify({ reporteId: response.reporte.id }));
      if (!active.current) return;
      setReporte(response.reporte); setServicio(response.servicio); setPending(null); setConfirmation(false); setSuccess('Reporte registrado.');
    } catch (err) {
      if (active.current) { setError(err.message); setConfirmation(false); }
      if (err.status && err.status < 500) { await sessionStorage.removeItem(key); if (active.current) setPending(null); }
    } finally { lock.current = false; if (active.current) setBusy(false); }
  };
  const upload = async () => {
    if (lock.current || !reporte?.puede_adjuntar_evidencia) return;
    lock.current = true; setBusy(true); setError('');
    try {
      // Recuperar el estado antes de otra subida evita repetir archivos tras perder la respuesta.
      if (uploadPending) {
        const data = await getReporteSeguridad(reporte.id);
        if (active.current) { setReporte(data.reporte); setUploadPending(false); }
        return;
      }
      const result = await DocumentPicker.getDocumentAsync({ type: ['image/jpeg', 'image/png', 'application/pdf'], multiple: true, copyToCacheDirectory: true });
      if (result.canceled || !active.current) return;
      const files = result.assets || [];
      if (!files.length || files.length + (reporte.evidencias || []).length > 3) throw new Error('El reporte admite como maximo 3 evidencias.');
      for (const file of files) {
        if (!['image/jpeg', 'image/png', 'application/pdf'].includes(file.mimeType)) throw new Error('Usa archivos JPG, PNG o PDF.');
        const size = file.size ?? file.file?.size ?? (Platform.OS === 'web' ? (await (await fetch(file.uri)).blob()).size : (await FileSystem.getInfoAsync(file.uri)).size);
        if (!size || size > 5 * 1024 * 1024) throw new Error('Cada evidencia debe pesar como maximo 5 MB.');
      }
      setUploadPending(true);
      const data = await subirEvidenciasSeguridad(reporte.id, files);
      if (active.current) { setReporte(data.reporte); setUploadPending(false); setSuccess('Evidencia adjuntada.'); }
    } catch (err) { if (active.current) setError(err.message); }
    finally { lock.current = false; if (active.current) setBusy(false); }
  };
  const download = async (evidencia) => {
    try {
      const { blob } = await descargarEvidenciaSeguridad(reporte.id, evidencia.id);
      if (!guardarArchivo(blob, evidencia.nombre || `evidencia-${evidencia.id}`)) throw new Error('La descarga esta disponible en la version web.');
    } catch (err) { setError(err.message); }
  };
  return <ScrollView style={s.container} contentContainerStyle={s.content}>
    <ScreenHeader title="Centro de seguridad" onBack={() => navigation.goBack()} />
    <View style={s.help}>
      <Text style={s.title}>Ayuda inmediata</Text>
      <Text style={s.text}>Si estas en peligro, busca un lugar seguro y contacta a los servicios de emergencia. ServiGT registra incidentes; no despacha ayuda ni ofrece monitoreo o respuesta en tiempo real.</Text>
      {EMERGENCY_RESOURCES.map((resource) => <Button key={resource.phone} icon="phone" kind="secondary" onPress={() => Linking.openURL(`tel:${resource.phone}`).catch(() => setError('No se pudo abrir la llamada.'))}>{resource.label}</Button>)}
    </View>
    {!participant ? <Text style={s.error}>Solo los participantes del servicio pueden reportar.</Text> : loading ? <View style={s.center}><ActivityIndicator color={T.blue} /><Text>Cargando servicio...</Text></View> : null}
    {error ? <Text style={s.error}>{error}</Text> : null}
    {success ? <Text style={s.success}>{success}</Text> : null}
    {participant && !loading && !servicio ? <Button onPress={load}>Reintentar</Button> : null}
    {servicio && !loading ? <View style={s.section}>
      <Text style={s.title}>{`Servicio #${servicio.id}`}</Text><StatusChip {...chipDeServicio(servicio.estado)} />
      {reporte ? <View style={s.section}>
        <Text style={s.title}>{`Reporte #${reporte.id}`}</Text><StatusChip {...chipDeReporte(reporte.estado)} />
        <Text style={s.text}>El reporte y sus archivos son privados para ti y administracion.</Text>
        {(reporte.evidencias || []).map((e) => <View key={e.id} style={s.file}><Text style={s.text}>{e.nombre}</Text><Button kind="ghost" size="sm" icon="download" onPress={() => download(e)}>Descargar</Button></View>)}
        {reporte.puede_adjuntar_evidencia ? <Button kind="secondary" icon="paperclip" onPress={upload} disabled={busy} loading={busy}>{uploadPending ? 'Actualizar evidencias' : 'Adjuntar evidencia'}</Button> : null}
        <Button kind="ghost" onPress={() => navigation.navigate('Chat', { id: servicio.id })}>Abrir chat del servicio</Button>
        {canOpenSafety(servicio.estado) ? <Button kind="secondary" onPress={() => { setReporte(null); setDescripcion(''); setSuccess(''); sessionStorage.removeItem(key); }}>Registrar otro incidente</Button> : null}
      </View> : canOpenSafety(servicio.estado) || pending ? <View style={s.section}>
        <Text style={s.label}>Categoria</Text>
        <Button kind="secondary" disabled={busy || !!pending} onPress={() => setCategoryOpen(true)}>{CATEGORIAS[categoria]}</Button>
        <Text style={s.label}>Descripcion</Text>
        <Input accessibilityLabel="Descripcion del incidente" multiline maxLength={2000} value={descripcion} onChangeText={setDescripcion} editable={!busy && !pending} />
        {pending ? <Button onPress={() => submit(pending.interrumpir)} loading={busy}>Reintentar envio</Button> : <>
          <Button icon="shield" onPress={() => submit(false)} disabled={busy} loading={busy}>Enviar reporte</Button>
          <Button icon="alert-triangle" kind="danger" disabled={busy} onPress={() => descripcion.trim().length < 5 ? setError('Describe el incidente con al menos 5 caracteres.') : setConfirmation(true)}>Interrumpir servicio</Button>
        </>}
      </View> : <Text style={s.text}>No puedes registrar otro incidente en el estado actual del servicio.</Text>}
    </View> : null}
    <MaterialConfirmModal visible={confirmation} texto={{ titulo: 'Interrumpir por seguridad', mensaje: 'El servicio terminara por seguridad y su chat quedara en solo lectura. Esta accion no se puede deshacer.', confirmar: 'Confirmar interrupcion', kind: 'danger' }} procesando={busy} onCancel={() => setConfirmation(false)} onConfirm={() => submit(true)} />
    <Modal visible={categoryOpen} transparent onRequestClose={() => setCategoryOpen(false)}><View style={s.overlay}><View style={s.menu}>{Object.entries(CATEGORIAS).map(([value, label]) => <TouchableOpacity accessibilityRole="button" key={value} onPress={() => { setCategoria(value); setCategoryOpen(false); }} style={s.option}><Text style={s.text}>{label}</Text></TouchableOpacity>)}<Button kind="ghost" onPress={() => setCategoryOpen(false)}>Cerrar</Button></View></View></Modal>
  </ScrollView>;
}
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.canvas }, content: { width: '100%', maxWidth: 780, alignSelf: 'center', padding: T.s4, paddingBottom: 40, gap: T.s3 },
  help: { gap: T.s3, paddingBottom: T.s4, borderBottomWidth: 1, borderBottomColor: T.border }, section: { gap: T.s3 }, title: { fontSize: 18, fontWeight: '800', color: T.ink },
  text: { fontSize: 14, color: T.text, lineHeight: 21, flexShrink: 1 }, label: { color: T.ink, fontWeight: '700' }, error: { color: T.danger }, success: { color: T.success }, center: { alignItems: 'center', gap: T.s2 },
  file: { flexDirection: 'row', flexWrap: 'wrap', gap: T.s2, alignItems: 'center' }, overlay: { flex: 1, padding: T.s4, backgroundColor: T.elev, justifyContent: 'center', alignItems: 'center' }, menu: { maxWidth: 440, width: '100%', padding: T.s3, backgroundColor: T.paper, borderRadius: T.rSm }, option: { padding: T.s3 },
});
