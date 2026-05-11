import { useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { createSolicitud } from '../services/api';
import { useToast } from '../context/ToastContext';
import { validateRequired, validateNumeric, validateDate } from '../utils/validation';

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
        <TouchableOpacity style={styles.backHomeBtn} onPress={() => navigation.navigate('Home')}>
          <Text style={styles.backHomeBtnText}>Volver al listado</Text>
        </TouchableOpacity>
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
      await createSolicitud({
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
        <Text style={styles.backText}>← Volver al perfil</Text>
      </TouchableOpacity>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Solicitar servicio</Text>
        <Text style={styles.cardSubtitle}>
          Enviando solicitud a:{' '}
          <Text style={styles.provName}>{selectedProvider?.nombre}</Text>
        </Text>

        <Text style={styles.label}>Descripcion del servicio *</Text>
        <TextInput
          style={[styles.input, styles.textArea, errors.descripcion && styles.inputError]}
          placeholder="Describe detalladamente lo que necesitas..."
          value={descripcion}
          onChangeText={(v) => { setDescripcion(v); clearError('descripcion'); }}
          multiline
          numberOfLines={5}
        />
        {errors.descripcion ? <Text style={styles.fieldError}>{errors.descripcion}</Text> : null}

        <Text style={styles.label}>Direccion (donde se realizara)</Text>
        <TextInput
          style={styles.input}
          placeholder="Ej: Zona 10, Guatemala Ciudad"
          value={direccion}
          onChangeText={setDireccion}
        />

        <Text style={styles.label}>Fecha y hora deseada (YYYY-MM-DD HH:MM)</Text>
        <TextInput
          style={[styles.input, errors.fecha && styles.inputError]}
          placeholder="Ej: 2026-05-10 09:00"
          value={fecha}
          onChangeText={(v) => { setFecha(v); clearError('fecha'); }}
        />
        {errors.fecha ? <Text style={styles.fieldError}>{errors.fecha}</Text> : null}

        <Text style={styles.label}>Monto acordado (Q)</Text>
        <TextInput
          style={[styles.input, errors.monto && styles.inputError]}
          placeholder="Opcional - monto en quetzales"
          value={monto}
          onChangeText={(v) => { setMonto(v); clearError('monto'); }}
          keyboardType="decimal-pad"
        />
        {errors.monto ? <Text style={styles.fieldError}>{errors.monto}</Text> : null}

        <TouchableOpacity
          style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitBtnText}>Enviar solicitud</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.cancelBtn}
          onPress={() => navigation.navigate('ProviderDetail', { provider: selectedProvider })}
        >
          <Text style={styles.cancelBtnText}>Cancelar</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0eee9' },
  content: { padding: 16, paddingBottom: 40 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  emptyText: { fontSize: 15, color: '#667085', textAlign: 'center', marginBottom: 16 },
  backHomeBtn: {
    backgroundColor: '#4589d4',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  backHomeBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  backRow: { marginBottom: 14 },
  backText: { color: '#4589d4', fontSize: 15, fontWeight: '600' },

  card: {
    backgroundColor: '#f6f4ee',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  cardTitle: { fontSize: 20, fontWeight: '800', color: '#333', marginBottom: 6 },
  cardSubtitle: { fontSize: 14, color: '#666', marginBottom: 20 },
  provName: { fontWeight: '700', color: '#4589d4' },

  label: {
    fontSize: 13, fontWeight: '600', color: '#444',
    marginBottom: 6, marginTop: 4,
  },
  input: {
    backgroundColor: '#f7f9fc',
    borderWidth: 1,
    borderColor: '#d9e2ef',
    borderRadius: 8,
    padding: 13,
    fontSize: 15,
    marginBottom: 4,
    color: '#333',
  },
  inputError: {
    borderColor: '#c0392b',
    backgroundColor: '#fff5f5',
  },
  fieldError: {
    fontSize: 12,
    color: '#c0392b',
    marginBottom: 10,
    marginLeft: 2,
  },
  textArea: { height: 120, textAlignVertical: 'top' },

  submitBtn: {
    backgroundColor: '#4589d4',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  cancelBtn: { padding: 14, alignItems: 'center', marginTop: 4 },
  cancelBtnText: { color: '#999', fontSize: 15 },
});
