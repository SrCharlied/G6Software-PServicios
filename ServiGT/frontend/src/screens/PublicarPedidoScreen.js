import { useEffect, useState } from 'react';
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
import { crearPedido, getCategorias } from '../services/api';
import { useToast } from '../context/ToastContext';
import { T } from '../theme';
import { Button, Card, Input, ScreenHeader, SlotMeter } from '../components/ui';

const URGENCIAS = [
  { value: 'baja',  label: 'Baja',  color: T.success },
  { value: 'media', label: 'Media', color: T.warn },
  { value: 'alta',  label: 'Alta',  color: T.danger },
];

function Campo({ label, requerido, error, children }) {
  return (
    <View style={s.campo}>
      <Text style={s.label}>
        {label} {requerido ? <Text style={s.required}>*</Text> : null}
      </Text>
      {children}
      {error ? <Text style={s.fieldError}>{error}</Text> : null}
    </View>
  );
}

export default function PublicarPedidoScreen({ navigation }) {
  const toast = useToast();

  const [descripcion, setDescripcion] = useState('');
  const [direccion, setDireccion]     = useState('');
  const [urgencia, setUrgencia]       = useState('');
  const [categoriaId, setCategoriaId] = useState(null);
  const [categorias, setCategorias]   = useState([]);
  const [loadingCats, setLoadingCats] = useState(true);
  const [submitting, setSubmitting]   = useState(false);
  const [errors, setErrors]           = useState({});

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
      errs.descripcion = 'La descripción debe tener al menos 10 caracteres.';
    }
    if (!categoriaId) errs.categoriaId = 'Selecciona una categoría.';
    if (!direccion.trim()) errs.direccion = 'La dirección es obligatoria.';
    if (!urgencia) errs.urgencia = 'Selecciona la urgencia.';
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
    <SafeAreaView style={s.container}>
      <ScreenHeader
        title="Publicar pedido"
        subtitle="Describe tu problema y recibe propuestas de proveedores"
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        contentContainerStyle={s.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* El formulario se limita a 640px: estirado a 1440px las lineas
            quedaban inmanejables de leer. */}
        <View style={s.formWrap}>
          <Card style={s.card}>
            <Campo label="Descripción" requerido error={errors.descripcion}>
              <Input
                placeholder="Describe detalladamente el problema o servicio que necesitas…"
                value={descripcion}
                onChangeText={(v) => { setDescripcion(v); clearError('descripcion'); }}
                multiline
                maxLength={2000}
                error={errors.descripcion ? ' ' : null}
                helperText={`${descripcion.length}/2000`}
              />
            </Campo>

            <Campo label="Categoría" requerido error={errors.categoriaId}>
              {loadingCats ? (
                <ActivityIndicator size="small" color={T.blue} style={s.catLoader} />
              ) : (
                <View style={s.chipRow}>
                  {categorias.map((cat) => {
                    const activa = categoriaId === cat.id;
                    return (
                      <TouchableOpacity
                        key={cat.id}
                        style={[s.chip, activa && s.chipSel]}
                        onPress={() => { setCategoriaId(cat.id); clearError('categoriaId'); }}
                        accessibilityRole="button"
                        accessibilityState={{ selected: activa }}
                      >
                        <Text style={[s.chipText, activa && s.chipTextSel]}>{cat.nombre}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </Campo>

            <Campo label="Dirección" requerido error={errors.direccion}>
              <Input
                icon="map-pin"
                placeholder="Zona 10, Ciudad de Guatemala…"
                value={direccion}
                onChangeText={(v) => { setDireccion(v); clearError('direccion'); }}
                maxLength={255}
                error={errors.direccion ? ' ' : null}
              />
            </Campo>

            <Campo label="Urgencia" requerido error={errors.urgencia}>
              <View style={s.urgenciaRow}>
                {URGENCIAS.map((u) => {
                  const activa = urgencia === u.value;
                  return (
                    <TouchableOpacity
                      key={u.value}
                      style={[s.urgencia, activa && { borderColor: u.color, backgroundColor: `${u.color}18` }]}
                      onPress={() => { setUrgencia(u.value); clearError('urgencia'); }}
                      accessibilityRole="button"
                      accessibilityState={{ selected: activa }}
                    >
                      <Text style={[s.urgenciaText, activa && { color: u.color, fontWeight: '700' }]}>
                        {u.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </Campo>

            <Button kind="primary" size="lg" full loading={submitting} onPress={handleSubmit}>
              Publicar pedido
            </Button>
          </Card>

          <Card style={s.infoCard}>
            <View style={s.infoHead}>
              <Feather name="info" size={14} color={T.blue} />
              <Text style={s.infoTitle}>Qué pasa después</Text>
            </View>
            <Text style={s.infoText}>
              Tu pedido queda visible 7 días. Recibirás hasta 6 cotizaciones: las 3 primeras son
              gratuitas para los proveedores y las siguientes les cuestan 1 crédito.
            </Text>
            <SlotMeter usados={0} title="Cotizaciones disponibles" />
          </Card>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.canvas },
  scroll:    { padding: T.s4, paddingBottom: 48 },
  formWrap:  { width: '100%', maxWidth: 640, alignSelf: 'center', gap: T.s4 },

  card:  { gap: T.s4 },
  campo: { gap: 6 },
  label: { fontSize: 13, fontWeight: '700', color: T.ink },
  required:   { color: T.danger },
  fieldError: { fontSize: 12, color: T.danger },

  catLoader: { alignSelf: 'flex-start', marginVertical: 6 },
  chipRow:   { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 13, paddingVertical: 7,
    borderRadius: 999, borderWidth: 1,
    borderColor: T.inputBorder, backgroundColor: T.white,
  },
  chipSel:     { borderColor: T.blue, backgroundColor: '#eef4ff' },
  chipText:    { fontSize: 13, color: T.muted },
  chipTextSel: { color: T.blue, fontWeight: '700' },

  urgenciaRow: { flexDirection: 'row', gap: 10 },
  urgencia: {
    flex: 1, paddingVertical: 12, borderRadius: T.rMd,
    borderWidth: 1.5, borderColor: T.border, alignItems: 'center',
    backgroundColor: T.white,
  },
  urgenciaText: { fontSize: 14, color: T.muted },

  infoCard:  { gap: T.s3 },
  infoHead:  { flexDirection: 'row', alignItems: 'center', gap: 6 },
  infoTitle: { fontSize: 14, fontWeight: '800', color: T.ink },
  infoText:  { fontSize: 13, color: T.muted, lineHeight: 20 },
});
