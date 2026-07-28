import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { crearPedido, getCategorias } from '../services/api';
import { useToast } from '../context/ToastContext';
import { T } from '../theme';

const URGENCIAS = [
  { value: 'baja',  label: 'Baja',  color: T.success },
  { value: 'media', label: 'Media', color: T.warn },
  { value: 'alta',  label: 'Alta',  color: T.danger },
];

function FieldError({ message }) {
  if (!message) return null;
  return <Text style={styles.fieldError}>{message}</Text>;
}

export default function PublicarPedidoScreen({ navigation }) {
  const toast = useToast();

  const [descripcion, setDescripcion]   = useState('');
  const [direccion, setDireccion]       = useState('');
  const [urgencia, setUrgencia]         = useState('');
  const [categoriaId, setCategoriaId]   = useState(null);
  const [categorias, setCategorias]     = useState([]);
  const [loadingCats, setLoadingCats]   = useState(true);
  const [submitting, setSubmitting]     = useState(false);
  const [errors, setErrors]             = useState({});

  useEffect(() => {
    getCategorias()
      .then((data) => setCategorias(data.categorias || data || []))
      .catch(() => setCategorias([]))
      .finally(() => setLoadingCats(false));
  }, []);

  const clearError = (field) => setErrors((e) => ({ ...e, [field]: null }));

  const validate = () => {
    const errs = {};
    if (!descripcion.trim() || descripcion.trim().length < 10) {
      errs.descripcion = 'La descripcion debe tener al menos 10 caracteres.';
    }
    if (!categoriaId) {
      errs.categoriaId = 'Selecciona una categoria.';
    }
    if (!direccion.trim()) {
      errs.direccion = 'La direccion es obligatoria.';
    }
    if (!urgencia) {
      errs.urgencia = 'Selecciona la urgencia.';
    }
    return errs;
  };

  const handleSubmit = async () => {
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setSubmitting(true);
    try {
      await crearPedido({
        descripcion:  descripcion.trim(),
        categoria_id: categoriaId,
        direccion:    direccion.trim(),
        urgencia,
      });
      toast('Pedido publicado correctamente', 'success');
      navigation.navigate('MisPedidos');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <TouchableOpacity style={styles.backRow} onPress={() => navigation.goBack()}>
        <Text style={styles.backText}>← Volver</Text>
      </TouchableOpacity>
      <Text style={styles.title}>Publicar pedido</Text>
      <Text style={styles.subtitle}>Describe tu problema y recibe propuestas de proveedores.</Text>

      {/* Descripcion */}
      <Text style={styles.label}>Descripcion <Text style={styles.required}>*</Text></Text>
      <TextInput
        style={[styles.input, styles.textArea, errors.descripcion && styles.inputError]}
        placeholder="Describe detalladamente el problema o servicio que necesitas..."
        placeholderTextColor={T.faint}
        value={descripcion}
        onChangeText={(v) => { setDescripcion(v); clearError('descripcion'); }}
        multiline
        numberOfLines={4}
        maxLength={2000}
      />
      <FieldError message={errors.descripcion} />

      {/* Categoria */}
      <Text style={styles.label}>Categoria <Text style={styles.required}>*</Text></Text>
      {loadingCats ? (
        <ActivityIndicator size="small" color={T.blue} style={{ marginBottom: 16 }} />
      ) : (
        <View style={styles.chipRow}>
          {categorias.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={[styles.chip, categoriaId === cat.id && styles.chipSelected]}
              onPress={() => { setCategoriaId(cat.id); clearError('categoriaId'); }}
            >
              <Text style={[styles.chipText, categoriaId === cat.id && styles.chipTextSelected]}>
                {cat.nombre}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
      <FieldError message={errors.categoriaId} />

      {/* Direccion */}
      <Text style={styles.label}>Direccion <Text style={styles.required}>*</Text></Text>
      <TextInput
        style={[styles.input, errors.direccion && styles.inputError]}
        placeholder="Zona 10, Ciudad de Guatemala..."
        placeholderTextColor={T.faint}
        value={direccion}
        onChangeText={(v) => { setDireccion(v); clearError('direccion'); }}
        maxLength={255}
      />
      <FieldError message={errors.direccion} />

      {/* Urgencia */}
      <Text style={styles.label}>Urgencia <Text style={styles.required}>*</Text></Text>
      <View style={styles.urgenciaRow}>
        {URGENCIAS.map((u) => (
          <TouchableOpacity
            key={u.value}
            style={[
              styles.urgenciaBtn,
              urgencia === u.value && { borderColor: u.color, backgroundColor: u.color + '18' },
            ]}
            onPress={() => { setUrgencia(u.value); clearError('urgencia'); }}
          >
            <Text style={[styles.urgenciaBtnText, urgencia === u.value && { color: u.color, fontWeight: '700' }]}>
              {u.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <FieldError message={errors.urgencia} />

      {/* Submit */}
      <TouchableOpacity
        style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
        onPress={handleSubmit}
        disabled={submitting}
        activeOpacity={0.85}
      >
        {submitting
          ? <ActivityIndicator color="#fff" />
          : <Text style={styles.submitText}>Publicar pedido</Text>}
      </TouchableOpacity>

      <Text style={styles.hint}>Tu pedido estara visible para proveedores durante 7 dias.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: T.canvas },
  content:     { padding: 20, paddingBottom: 48 },
  title:       { fontSize: 22, fontWeight: '800', color: T.ink, marginBottom: 4 },
  subtitle:    { fontSize: 14, color: T.muted, marginBottom: 24, lineHeight: 20 },
  label:       { fontSize: 14, fontWeight: '600', color: T.ink, marginBottom: 6 },
  required:    { color: T.danger },
  input:       {
    ...T.input,
    marginBottom: 4,
  },
  textArea:    { height: 100, textAlignVertical: 'top' },
  inputError:  { borderColor: T.danger },
  fieldError:  { fontSize: 12, color: T.danger, marginBottom: 12 },
  chipRow:     { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  chip:        {
    ...T.chip,
  },
  chipSelected:     { borderColor: T.blue, backgroundColor: '#eef4ff' },
  chipText:         { fontSize: 13, color: T.muted },
  chipTextSelected: { color: T.blue, fontWeight: '700' },
  urgenciaRow: { flexDirection: 'row', gap: 10, marginBottom: 4 },
  urgenciaBtn: {
    flex: 1, paddingVertical: 12, borderRadius: T.rMd,
    borderWidth: 1.5, borderColor: T.border, alignItems: 'center',
  },
  urgenciaBtnText: { fontSize: 14, color: T.muted },
  submitBtn:   {
    ...T.primaryButton,
    paddingVertical: 16,
    marginTop: 24,
    ...T.sh2,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitText:  { ...T.primaryButtonText, fontSize: 16 },
  hint:        { marginTop: 14, fontSize: 12, color: T.faint, textAlign: 'center' },
  backRow:     { marginBottom: 16 },
  backText:    { fontSize: 15, color: T.blue, fontWeight: '600' },
});
