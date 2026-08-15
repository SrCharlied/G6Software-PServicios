import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { calificarServicio, getServicio, storageUrl } from '../services/api';
import { useToast } from '../context/ToastContext';
import { T } from '../theme';
import {
  Avatar,
  Button,
  Card,
  EmptyState,
  Input,
  ScreenHeader,
  StatusChip,
} from '../components/ui';

const ETIQUETAS = {
  1: 'Muy malo',
  2: 'Malo',
  3: 'Regular',
  4: 'Bueno',
  5: 'Excelente',
};

function StarsInput({ value, onChange }) {
  return (
    <View>
      <View style={s.starsRow}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity
            key={star}
            style={[s.starBtn, star <= value && s.starBtnActive]}
            onPress={() => onChange(star)}
            accessibilityRole="button"
            accessibilityLabel={`${star} estrella${star === 1 ? '' : 's'}`}
            accessibilityState={{ selected: star === value }}
          >
            <Feather name="star" size={22} color={star <= value ? T.amber : '#d1d5db'} />
          </TouchableOpacity>
        ))}
      </View>
      <Text style={s.starsLabel}>{ETIQUETAS[value] ?? ''}</Text>
    </View>
  );
}

/**
 * Pantalla independiente en /calificar/{id}. Se mantiene como pantalla y no
 * como modal: la calificacion se abre desde notificaciones y desde el listado,
 * y un modal no sobreviviria a una recarga con URL directa.
 */
export default function CalificarProveedorScreen({ navigation, servicioId, user }) {
  const toast = useToast();
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

  const yaCalifico = useMemo(
    () => (servicio?.calificaciones || []).some((cal) => Number(cal.autor_id) === Number(user?.id)),
    [servicio?.calificaciones, user?.id],
  );

  const puedeCalificar = servicio
    && Number(servicio.cliente_id) === Number(user?.id)
    && servicio.estado === 'completado'
    && !yaCalifico;

  const handleSubmit = async () => {
    setError('');

    if (!puedeCalificar) {
      setError('Este servicio no está disponible para calificar.');
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
      toast('Calificación enviada. Gracias por tu reseña.', 'success');
      navigation.navigate('Solicitudes');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={s.center}>
        <ActivityIndicator size="large" color={T.blue} />
        <Text style={s.loadingText}>Cargando servicio…</Text>
      </SafeAreaView>
    );
  }

  if (!servicio) {
    return (
      <SafeAreaView style={s.center}>
        <EmptyState
          error
          title="Servicio no encontrado"
          description="Es posible que el servicio ya no exista o no tengas acceso a él."
          actionLabel="Volver a mis servicios"
          onAction={() => navigation.navigate('Solicitudes')}
        />
      </SafeAreaView>
    );
  }

  const proveedor = servicio.proveedor;

  return (
    <SafeAreaView style={s.container}>
      <ScreenHeader
        title="Calificar proveedor"
        subtitle="Tu reseña forma parte de la reputación pública"
        onBack={() => navigation.navigate('Solicitudes')}
        backLabel="Mis servicios"
      />

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* El formulario no se estira: a 1440px una columna centrada de 620px
            mantiene el texto legible. */}
        <View style={s.wrap}>
          <Card style={s.resumen}>
            <View style={s.resumenHead}>
              <Avatar uri={storageUrl(proveedor?.foto_perfil)} name={proveedor?.nombre} size={48} />
              <View style={s.resumenInfo}>
                <Text style={s.proveedorNombre} numberOfLines={1}>
                  {proveedor?.nombre || 'Proveedor'}
                </Text>
                <Text style={s.proveedorMeta} numberOfLines={1}>
                  {servicio.categoria?.nombre || proveedor?.categoria?.nombre || 'Servicio'}
                </Text>
              </View>
              <StatusChip variant="success" label="Completado" size="sm" />
            </View>

            <Text style={s.descripcion}>{servicio.descripcion}</Text>

            <View style={s.metaRow}>
              <Text style={s.metaPill}>
                Q{Number(servicio.monto_acordado || 0).toFixed(2)}
              </Text>
              {servicio.direccion ? (
                <Text style={s.metaPill} numberOfLines={1}>{servicio.direccion}</Text>
              ) : null}
            </View>
          </Card>

          {yaCalifico ? (
            <Card>
              <Text style={s.avisoTitulo}>Ya calificaste este servicio</Text>
              <Text style={s.avisoTexto}>
                Tu reseña ya forma parte de la reputación pública del proveedor.
              </Text>
            </Card>
          ) : servicio.estado !== 'completado' ? (
            <Card>
              <Text style={s.avisoTitulo}>Aún no se puede calificar</Text>
              <Text style={s.avisoTexto}>
                El servicio debe estar completado antes de enviar una reseña.
              </Text>
            </Card>
          ) : (
            <Card style={s.form}>
              <Text style={s.label}>Puntuación</Text>
              <StarsInput value={puntuacion} onChange={setPuntuacion} />

              <Text style={s.label}>Comentario opcional</Text>
              <Input
                value={comentario}
                onChangeText={(text) => { setComentario(text); setError(''); }}
                multiline
                maxLength={500}
                placeholder="Cuenta cómo fue tu experiencia con el proveedor…"
                helperText={`${comentario.length}/500`}
              />

              {error ? <Text style={s.error}>{error}</Text> : null}

              <Button kind="primary" size="lg" full loading={submitting} onPress={handleSubmit}>
                Enviar calificación
              </Button>
            </Card>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.canvas },
  scroll:    { padding: T.s4, paddingBottom: 40 },
  wrap:      { width: '100%', maxWidth: 620, alignSelf: 'center', gap: T.s4 },
  center:    { flex: 1, alignItems: 'center', justifyContent: 'center', padding: T.s6, gap: T.s3, backgroundColor: T.canvas },
  loadingText: { color: T.muted, fontSize: 14 },

  resumen:     { gap: T.s3 },
  resumenHead: { flexDirection: 'row', alignItems: 'center', gap: T.s3 },
  resumenInfo: { flex: 1, minWidth: 0 },
  proveedorNombre: { fontSize: 17, fontWeight: '800', color: T.ink },
  proveedorMeta:   { fontSize: 12, color: T.muted, marginTop: 2 },
  descripcion: { fontSize: 14, color: T.text, lineHeight: 21, opacity: 0.85 },
  metaRow:     { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  metaPill: {
    backgroundColor: T.inputBg, borderWidth: 1, borderColor: T.border,
    borderRadius: T.rSm, paddingHorizontal: 10, paddingVertical: 6,
    color: T.muted, fontSize: 12, fontWeight: '700', overflow: 'hidden',
  },

  form:  { gap: T.s3 },
  label: { fontSize: 13, fontWeight: '800', color: T.ink },

  starsRow: { flexDirection: 'row', gap: 8 },
  starBtn: {
    width: 46, height: 46, borderRadius: T.rSm,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: T.white, borderWidth: 1, borderColor: T.border,
  },
  starBtnActive: { borderColor: '#fcd34d', backgroundColor: '#fffbeb' },
  starsLabel:    { marginTop: 8, fontSize: 12, color: T.muted, fontWeight: '700' },

  error: { color: T.danger, fontSize: 13 },

  avisoTitulo: { fontSize: 16, fontWeight: '800', color: T.ink, marginBottom: 8 },
  avisoTexto:  { fontSize: 13, color: T.muted, lineHeight: 20 },
});
