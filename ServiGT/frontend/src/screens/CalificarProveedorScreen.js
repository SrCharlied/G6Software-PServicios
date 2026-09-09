import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { calificarServicio, getServicio } from '../services/api';
import { useToast } from '../context/ToastContext';
import { T } from '../theme';
import { ScreenHeader } from '../components/ui';

const StarsInput = ({ value, onChange }) => (
  <View style={styles.starsRow}>
    {[1, 2, 3, 4, 5].map((star) => (
      <TouchableOpacity
        key={star}
        style={styles.starBtn}
        onPress={() => onChange(star)}
        accessibilityRole="button"
        accessibilityLabel={`${star} estrella${star === 1 ? '' : 's'}`}
      >
        <Text style={[styles.starText, star <= value && styles.starTextActive]}>
          ★
        </Text>
      </TouchableOpacity>
    ))}
  </View>
);

export default function CalificarProveedorScreen({ navigation, servicioId, user }) {
  const toast = useToast();
  const { width } = useWindowDimensions();
  const wide = width >= 900;
  const [servicio, setServicio] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [puntuacion, setPuntuacion] = useState(5);
  const [comentario, setComentario] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoading(true);
      try {
        const data = await getServicio(servicioId);
        if (mounted) setServicio(data.servicio);
      } catch (err) {
        toast(err.message, 'error');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => { mounted = false; };
  }, [servicioId, toast]);

  const yaCalifico = useMemo(() => {
    return (servicio?.calificaciones || []).some((cal) => Number(cal.autor_id) === Number(user?.id));
  }, [servicio?.calificaciones, user?.id]);

  const puedeCalificar = servicio
    && Number(servicio.cliente_id) === Number(user?.id)
    && servicio.estado === 'completado'
    && !yaCalifico;

  const handleSubmit = async () => {
    setError('');

    if (!puedeCalificar) {
      setError('Este servicio no esta disponible para calificar.');
      return;
    }

    if (comentario.trim().length > 500) {
      setError('El comentario no puede superar 500 caracteres.');
      return;
    }

    setSubmitting(true);
    try {
      await calificarServicio(servicio.id, {
        puntuacion,
        comentario: comentario.trim() || null,
      });
      toast('Calificacion enviada. Gracias por tu resena.', 'success');
      navigation.navigate('Solicitudes');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={T.blue} />
        <Text style={styles.loadingText}>Cargando servicio...</Text>
      </View>
    );
  }

  if (!servicio) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyTitle}>Servicio no encontrado</Text>
        <TouchableOpacity style={styles.primaryBtn} onPress={() => navigation.navigate('Solicitudes')}>
          <Text style={styles.primaryBtnText}>Volver al historial</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const proveedor = servicio.proveedor;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <ScreenHeader style={styles.backBtn} onBack={() => navigation.navigate('Solicitudes')} variant="inline" />

      <View style={[styles.headerCard, wide && styles.headerCardWide]}>
        <Text style={styles.eyebrow}>Calificar al proveedor</Text>
        <View style={styles.providerRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{(proveedor?.nombre || 'P').charAt(0).toUpperCase()}</Text>
          </View>
          <View style={styles.providerCopy}>
            <Text style={styles.title}>{proveedor?.nombre || 'Proveedor'}</Text>
            <Text style={styles.description}>{servicio.descripcion}</Text>
          </View>
        </View>
        <View style={styles.metaRow}>
          <Text style={styles.metaPill}>{servicio.categoria?.nombre || proveedor?.categoria?.nombre || 'Servicio'}</Text>
          <Text style={styles.metaPill}>Q{Number(servicio.monto_acordado || 0).toFixed(2)}</Text>
        </View>
      </View>

      {yaCalifico ? (
        <View style={styles.noticeCard}>
          <Text style={styles.noticeTitle}>Ya calificaste este servicio</Text>
          <Text style={styles.noticeText}>Tu resena ya forma parte de la reputacion publica del proveedor.</Text>
        </View>
      ) : servicio.estado !== 'completado' ? (
        <View style={styles.noticeCard}>
          <Text style={styles.noticeTitle}>Aun no se puede calificar</Text>
          <Text style={styles.noticeText}>El servicio debe estar completado antes de enviar una resena.</Text>
        </View>
      ) : (
        <View style={[styles.formCard, wide && styles.formCardWide]}>
          <View style={styles.formHeader}>
            <Text style={styles.formTitle}>Como fue tu experiencia?</Text>
            <Text style={styles.formSubtitle}>Tu resena ayuda a otros clientes a elegir mejor.</Text>
          </View>

          <Text style={styles.label}>Puntuacion</Text>
          <StarsInput value={puntuacion} onChange={setPuntuacion} />

          <Text style={styles.label}>Comentario opcional</Text>
          <TextInput
            style={styles.textarea}
            value={comentario}
            onChangeText={(text) => {
              setComentario(text);
              setError('');
            }}
            multiline
            maxLength={500}
            placeholder="Conta como fue tu experiencia con el proveedor..."
            placeholderTextColor={T.faint}
            textAlignVertical="top"
          />
          <Text style={styles.counter}>{comentario.length}/500</Text>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <TouchableOpacity
            style={[styles.primaryBtn, submitting && styles.primaryBtnDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color={T.white} />
            ) : (
              <Text style={styles.primaryBtnText}>Enviar calificacion</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.canvas },
  content: { padding: 24, paddingBottom: 48, width: '100%', maxWidth: 760, alignSelf: 'center' },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: T.canvas,
  },
  loadingText: { marginTop: 12, color: T.muted, fontSize: 14 },
  backBtn: { alignSelf: 'flex-start', marginBottom: 14 },
  headerCard: {
    backgroundColor: T.paper,
    borderRadius: 14,
    padding: 22,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: T.border,
    ...T.sh2,
  },
  headerCardWide: { padding: 24 },
  eyebrow: { color: T.blue, fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  providerRow: { flexDirection: 'row', gap: 14, alignItems: 'flex-start', marginTop: 14 },
  avatar: { width: 54, height: 54, borderRadius: 16, backgroundColor: '#eef4ff', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: T.soft },
  avatarText: { color: T.deep, fontSize: 22, fontWeight: '900' },
  providerCopy: { flex: 1, minWidth: 0 },
  title: { color: T.ink, fontSize: 24, fontWeight: '900' },
  description: { color: T.text, fontSize: 14, lineHeight: 21, marginTop: 8, opacity: 0.82 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  metaPill: {
    backgroundColor: T.white,
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: T.rSm,
    paddingHorizontal: 10,
    paddingVertical: 6,
    color: T.muted,
    fontSize: 12,
    fontWeight: '700',
  },
  formCard: {
    backgroundColor: T.paper,
    borderRadius: 14,
    padding: 22,
    borderWidth: 1,
    borderColor: T.border,
    ...T.sh2,
  },
  formCardWide: { padding: 24 },
  formHeader: { marginBottom: 18, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: T.border },
  formTitle: { color: T.ink, fontSize: 20, fontWeight: '900', marginBottom: 5 },
  formSubtitle: { color: T.muted, fontSize: 14, lineHeight: 20 },
  label: { fontSize: 14, fontWeight: '800', color: T.ink, marginBottom: 10, marginTop: 4 },
  starsRow: { flexDirection: 'row', gap: 8, marginBottom: 20, flexWrap: 'wrap' },
  starBtn: {
    width: 54,
    height: 54,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: T.white,
    borderWidth: 1,
    borderColor: T.border,
  },
  starText: { fontSize: 32, color: '#d1d5db', lineHeight: 36 },
  starTextActive: { color: T.amber },
  textarea: {
    minHeight: 150,
    borderWidth: 1,
    borderColor: T.inputBorder,
    backgroundColor: T.inputBg,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: T.text,
    lineHeight: 20,
  },
  counter: { alignSelf: 'flex-end', color: T.faint, fontSize: 12, marginTop: 6 },
  errorText: { color: T.danger, fontSize: 13, marginTop: 8, marginBottom: 10 },
  primaryBtn: {
    backgroundColor: T.blue,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    marginTop: 14,
    ...T.sh1,
  },
  primaryBtnDisabled: { opacity: 0.65 },
  primaryBtnText: { color: T.white, fontSize: 15, fontWeight: '800' },
  noticeCard: {
    backgroundColor: T.paper,
    borderRadius: 14,
    padding: 20,
    borderWidth: 1,
    borderColor: T.border,
    ...T.sh1,
  },
  noticeTitle: { color: T.ink, fontSize: 17, fontWeight: '900', marginBottom: 8 },
  noticeText: { color: T.muted, fontSize: 14, lineHeight: 20 },
  emptyTitle: { color: T.ink, fontSize: 18, fontWeight: '900', marginBottom: 12 },
});
