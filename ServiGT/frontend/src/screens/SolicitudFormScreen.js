import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
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
  const { width } = useWindowDimensions();
  const wide = width >= 900;
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
      <TouchableOpacity
        style={styles.backRow}
        onPress={() => navigation.navigate('ProviderDetail', { provider: selectedProvider })}
      >
        <Feather name="arrow-left" size={15} color={T.blue} />
        <Text style={styles.backText}>Volver al perfil</Text>
      </TouchableOpacity>

      <View style={styles.hero}>
        <Text style={styles.eyebrow}>Nueva solicitud</Text>
        <Text style={styles.title}>Solicitar servicio</Text>
        <Text style={styles.subtitle}>
          Describe tu necesidad y envia la solicitud al proveedor seleccionado.
        </Text>
        <View style={styles.stepRow}>
          {['Proveedor', 'Detalle', 'Enviar'].map((label, index) => (
            <View key={label} style={styles.stepItem}>
              <View style={[styles.stepCircle, index === 1 && styles.stepCircleActive]}>
                <Text style={[styles.stepNum, index === 1 && styles.stepNumActive]}>{index + 1}</Text>
              </View>
              <Text style={[styles.stepLabel, index === 1 && styles.stepLabelActive]}>{label}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={[styles.layout, wide && styles.layoutWide]}>
        <Card padding={18} style={styles.summaryCard}>
          <View style={styles.providerAvatar}>
            <Text style={styles.providerAvatarText}>{selectedProvider.nombre?.charAt(0)?.toUpperCase() || 'P'}</Text>
          </View>
          <Text style={styles.summaryKicker}>Proveedor</Text>
          <Text style={styles.summaryName}>{selectedProvider.nombre}</Text>
          <Text style={styles.summaryMeta}>
            {selectedProvider.categoria?.nombre || 'Servicio'} - {[selectedProvider.municipio, selectedProvider.departamento].filter(Boolean).join(', ') || 'Guatemala'}
          </Text>
          {selectedProvider.telefono ? <Text style={styles.summaryPhone}>{selectedProvider.telefono}</Text> : null}
        </Card>

        <Card padding={24} style={styles.card}>
          <Text style={styles.cardTitle}>Datos de la solicitud</Text>
          <Text style={styles.cardSubtitle}>
            Enviando solicitud a <Text style={styles.provName}>{selectedProvider?.nombre}</Text>
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
  content: { padding: 24, paddingBottom: 44, width: '100%', maxWidth: 1040, alignSelf: 'center' },

  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, gap: 14 },
  emptyText: { fontSize: 15, color: T.muted, textAlign: 'center' },

  backRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 14 },
  backText: { color: T.blue, fontSize: 14, fontWeight: '800' },
  hero: {
    backgroundColor: T.paper,
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
    ...T.sh2,
  },
  eyebrow: { color: T.blue, fontSize: 12, fontWeight: '900', textTransform: 'uppercase' },
  title: { color: T.ink, fontSize: 30, fontWeight: '900', marginTop: 4 },
  subtitle: { color: T.muted, fontSize: 14, lineHeight: 21, marginTop: 6 },
  stepRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap', marginTop: 18 },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: T.white,
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  stepCircle: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: T.canvas },
  stepCircleActive: { backgroundColor: T.blue },
  stepNum: { color: T.muted, fontSize: 12, fontWeight: '900' },
  stepNumActive: { color: T.white },
  stepLabel: { color: T.muted, fontSize: 12, fontWeight: '800' },
  stepLabelActive: { color: T.deep },
  layout: { gap: 16 },
  layoutWide: { flexDirection: 'row', alignItems: 'flex-start' },
  summaryCard: { width: '100%', maxWidth: 280 },
  providerAvatar: { width: 58, height: 58, borderRadius: 18, backgroundColor: '#e6effa', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: T.soft },
  providerAvatarText: { color: T.deep, fontSize: 24, fontWeight: '900' },
  summaryKicker: { color: T.faint, fontSize: 11, fontWeight: '900', textTransform: 'uppercase', marginTop: 14 },
  summaryName: { color: T.ink, fontSize: 19, fontWeight: '900', marginTop: 4 },
  summaryMeta: { color: T.muted, fontSize: 13, lineHeight: 19, marginTop: 6 },
  summaryPhone: { color: T.deep, fontSize: 13, fontWeight: '800', marginTop: 10 },

  card: { flex: 1, minWidth: 0 },
  cardTitle: { fontSize: 22, fontWeight: '900', color: T.text, marginBottom: 6 },
  cardSubtitle: { fontSize: 14, color: T.muted, marginBottom: 20 },
  provName: { fontWeight: '700', color: T.blue },

  label: { fontSize: 13, fontWeight: '800', color: T.text, marginBottom: 6, marginTop: 4 },
  field: { marginBottom: 12 },

  cancelBtn: { padding: 14, alignItems: 'center', marginTop: 4 },
  cancelBtnText: { color: T.faint, fontSize: 15 },
});
