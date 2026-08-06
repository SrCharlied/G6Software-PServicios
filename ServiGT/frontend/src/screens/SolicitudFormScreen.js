import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { createServicio } from '../services/api';
import { useToast } from '../context/ToastContext';
import { validateRequired, validateNumeric, validateDate } from '../utils/validation';
import { T } from '../theme';
import { Button, Card, Input } from '../components/ui';

export default function SolicitudFormScreen({
  navigation,
  user,
  selectedProvider,
}) {
  const toast = useToast();
  const [descripcion, setDescripcion] = useState('');
  const [direccion, setDireccion] = useState('');
  const [fecha, setFecha] = useState('');
  const [monto, setMonto] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  const clearError = (field) => setErrors((e) => ({ ...e, [field]: null }));

  if (!selectedProvider) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No se encontro el proveedor para esta solicitud.</Text>
        <Button kind="primary" onPress={() => navigation.navigate('Home')}>
          Volver al listado
        </Button>
      </View>
    );
  }

  const handleSubmit = async () => {
    const errs = {};
    if (!validateRequired(descripcion)) {
      errs.descripcion = 'Describe el servicio que necesitas.';
    } else if (descripcion.trim().length < 10) {
      errs.descripcion = 'La descripcion debe tener al menos 10 caracteres.';
    }
    if (monto && !validateNumeric(monto)) {
      errs.monto = 'Ingresa un monto valido (numero positivo).';
    }
    if (fecha && !validateDate(fecha)) {
      errs.fecha = 'La fecha debe ser posterior a hoy (formato: YYYY-MM-DD HH:MM).';
    }
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});

    setSubmitting(true);
    try {
      await createServicio({
        proveedor_id: selectedProvider.id,
        categoria_id: selectedProvider.categoria_id || null,
        descripcion: descripcion.trim(),
        direccion: direccion.trim() || null,
        fecha_agendada: fecha.trim() || null,
        monto_acordado: monto ? parseFloat(monto) : null,
      });

      toast(`Solicitud enviada a ${selectedProvider.nombre}. Te notificaremos cuando responda.`, 'success');
      navigation.navigate('Home');
    } catch (error) {
      toast(error.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.formWrap}>
        <TouchableOpacity
          style={styles.backRow}
          onPress={() => navigation.navigate('ProviderDetail', { provider: selectedProvider })}
        >
          <Feather name="arrow-left" size={15} color={T.blue} />
          <Text style={styles.backText}>Volver al perfil</Text>
        </TouchableOpacity>

        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Solicitar servicio</Text>
          <Text style={styles.cardSubtitle}>
            Enviando solicitud a:{' '}
            <Text style={styles.provName}>{selectedProvider?.nombre}</Text>
          </Text>

          <Text style={styles.label}>Descripcion del servicio *</Text>
          <Input
            placeholder="Describe detalladamente lo que necesitas..."
            value={descripcion}
            onChangeText={(v) => { setDescripcion(v); clearError('descripcion'); }}
            multiline
            numberOfLines={5}
            error={errors.descripcion}
            style={styles.field}
          />

          <Text style={styles.label}>Direccion (donde se realizara)</Text>
          <Input
            icon="map-pin"
            placeholder="Ej: Zona 10, Guatemala Ciudad"
            value={direccion}
            onChangeText={setDireccion}
            style={styles.field}
          />

          <Text style={styles.label}>Fecha y hora deseada (YYYY-MM-DD HH:MM)</Text>
          <Input
            icon="calendar"
            placeholder="Ej: 2026-05-10 09:00"
            value={fecha}
            onChangeText={(v) => { setFecha(v); clearError('fecha'); }}
            error={errors.fecha}
            style={styles.field}
          />

          <Text style={styles.label}>Monto acordado (Q)</Text>
          <Input
            icon="dollar-sign"
            placeholder="Opcional - monto en quetzales"
            value={monto}
            onChangeText={(v) => { setMonto(v); clearError('monto'); }}
            keyboardType="decimal-pad"
            error={errors.monto}
            style={styles.field}
          />

          <Button kind="primary" full loading={submitting} onPress={handleSubmit} style={{ marginTop: 8 }}>
            Enviar solicitud
          </Button>

          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={() => navigation.navigate('ProviderDetail', { provider: selectedProvider })}
          >
            <Text style={styles.cancelBtnText}>Cancelar</Text>
          </TouchableOpacity>
        </Card>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.canvas },
  content: { padding: 16, paddingBottom: 40 },
  // Formulario centrado y con ancho maximo propio: InternalLayout ya limita
  // el area de contenido a 1120px, pero un formulario de una columna se ve
  // mejor angosto en vez de estirado a ese ancho completo.
  formWrap: { width: '100%', maxWidth: 560, alignSelf: 'center' },

  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, gap: 14 },
  emptyText: { fontSize: 15, color: T.muted, textAlign: 'center' },

  backRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 14 },
  backText: { color: T.blue, fontSize: 15, fontWeight: '600' },

  card: { padding: 20 },
  cardTitle: { fontSize: 20, fontWeight: '800', color: T.text, marginBottom: 6 },
  cardSubtitle: { fontSize: 14, color: T.muted, marginBottom: 20 },
  provName: { fontWeight: '700', color: T.blue },

  label: { fontSize: 13, fontWeight: '600', color: T.text, marginBottom: 6, marginTop: 4 },
  field: { marginBottom: 10 },

  cancelBtn: { padding: 14, alignItems: 'center', marginTop: 4 },
  cancelBtnText: { color: T.faint, fontSize: 15 },
});
