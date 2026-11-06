import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { getDocumentosLegales } from '../services/api';
import { Button } from '../components/ui';
import ServiGTLogo from '../components/ServiGTLogo';
import { T } from '../theme';

export default function LegalDocumentScreen({ tipo, onBack }) {
  const [documento, setDocumento] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const request = useRef(0);
  const load = useCallback(async () => {
    const id = ++request.current;
    setLoading(true); setError(''); setDocumento(null);
    try {
      const data = await getDocumentosLegales();
      const current = data.documentos?.find((item) => item.tipo === tipo);
      if (!current?.id || !current.version || typeof current.contenido !== 'string' || !current.contenido.trim()) throw new Error('El documento legal no esta disponible.');
      if (id === request.current) setDocumento(current);
    } catch (err) { if (id === request.current) setError(err.message); }
    finally { if (id === request.current) setLoading(false); }
  }, [tipo]);
  useEffect(() => { load(); return () => { request.current += 1; }; }, [load]);
  return <ScrollView style={s.page} contentContainerStyle={s.content}>
    <View style={s.header}><ServiGTLogo size={26} mode="dark" /><Button kind="ghost" icon="arrow-left" onPress={onBack}>Volver</Button></View>
    <Text style={s.title}>{documento?.titulo || (tipo === 'terminos' ? 'Terminos y condiciones' : 'Privacidad')}</Text>
    {loading ? <View style={s.status}><ActivityIndicator color={T.blue} /><Text style={s.meta}>Cargando documento...</Text></View> : null}
    {error ? <View style={s.status}><Text style={s.error}>{error}</Text><Button icon="refresh-cw" onPress={load}>Reintentar</Button></View> : null}
    {documento ? <View style={s.body}>
      <Text style={s.meta}>{`Version ${documento.version}`}</Text>
      <Text style={s.meta}>{`Vigente desde: ${documento.vigente_desde}`}</Text>
      <Text style={s.text} selectable>{documento.contenido}</Text>
      <Text style={s.hash} selectable>{`SHA-256: ${documento.hash}`}</Text>
    </View> : null}
  </ScrollView>;
}
const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: T.canvas }, content: { width: '100%', maxWidth: 860, alignSelf: 'center', padding: T.s4, paddingBottom: 48, gap: T.s4 },
  header: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: T.s3 },
  title: { fontSize: 26, fontWeight: '800', color: T.ink }, body: { gap: T.s3 }, meta: { color: T.muted, fontSize: 13 }, text: { color: T.text, fontSize: 15, lineHeight: 25 },
  hash: { color: T.muted, fontSize: 11, flexShrink: 1 }, status: { gap: T.s3, alignItems: 'flex-start' }, error: { color: T.danger },
});
