import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { createServicio, getProvider } from '../services/api';

export default function SolicitudFormScreen({
  navigation,
  user,
  selectedProvider,
  providerId,
}) {
  const matchedSelectedProvider = selectedProvider
    && (!providerId || Number(selectedProvider.id) === Number(providerId))
    ? selectedProvider
    : null;
  const [descripcion, setDescripcion] = useState('');
  const [direccion, setDireccion] = useState('');
  const [fecha, setFecha] = useState('');
  const [monto, setMonto] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [provider, setProvider] = useState(matchedSelectedProvider || null);
  const [loadingProvider, setLoadingProvider] = useState(Boolean(providerId && !matchedSelectedProvider));

  useEffect(() => {
    if (matchedSelectedProvider) {
      setProvider(matchedSelectedProvider);
    }
  }, [matchedSelectedProvider]);

  useEffect(() => {
    if (!providerId || matchedSelectedProvider) {
      setLoadingProvider(false);
      return;
    }

    const loadProvider = async () => {
      setLoadingProvider(true);
      try {
        const data = await getProvider(providerId);
        setProvider(data.proveedor || null);
      } catch (error) {
        Alert.alert('Error', error.message);
      } finally {
        setLoadingProvider(false);
      }
    };

    loadProvider();
  }, [providerId, matchedSelectedProvider]);

  if (loadingProvider && !provider) {
    return (
      <View style={styles.emptyContainer}>
        <ActivityIndicator size="large" color="#1a73e8" />
        <Text style={styles.emptyText}>Cargando proveedor...</Text>
      </View>
    );
  }

  if (!provider) {
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
    if (!descripcion.trim()) {
      Alert.alert('Requerido', 'Describe el servicio que necesitas.');
      return;
    }

    setSubmitting(true);
    try {
      await createServicio({
        proveedor_id: provider.id,
        categoria_id: provider.categoria_id || null,
        descripcion: descripcion.trim(),
        direccion: direccion.trim() || null,
        fecha_agendada: fecha.trim() || null,
        monto_acordado: monto ? parseFloat(monto) : null,
      });

      Alert.alert(
        'Solicitud enviada',
        `Tu solicitud fue enviada a ${provider.nombre}. Te notificaremos cuando responda.`,
        [{ text: 'Aceptar', onPress: () => navigation.navigate('Home') }]
      );
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <TouchableOpacity
        style={styles.backRow}
        onPress={() => navigation.navigate('ProviderDetail', { provider })}
      >
        <Text style={styles.backText}>← Volver al perfil</Text>
      </TouchableOpacity>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Solicitar servicio</Text>
        <Text style={styles.cardSubtitle}>
          Enviando solicitud a:{' '}
          <Text style={styles.provName}>{provider.nombre}</Text>
        </Text>

        <Text style={styles.label}>Descripcion del servicio *</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Describe detalladamente lo que necesitas..."
          value={descripcion}
          onChangeText={setDescripcion}
          multiline
          numberOfLines={5}
        />

        <Text style={styles.label}>Direccion (donde se realizara)</Text>
        <TextInput
          style={styles.input}
          placeholder="Ej: Zona 10, Guatemala Ciudad"
          value={direccion}
          onChangeText={setDireccion}
        />

        <Text style={styles.label}>Fecha y hora deseada (YYYY-MM-DD HH:MM)</Text>
        <TextInput
          style={styles.input}
          placeholder="Ej: 2026-05-10 09:00"
          value={fecha}
          onChangeText={setFecha}
        />

        <Text style={styles.label}>Monto acordado (Q)</Text>
        <TextInput
          style={styles.input}
          placeholder="Opcional - monto en quetzales"
          value={monto}
          onChangeText={setMonto}
          keyboardType="decimal-pad"
        />

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
          onPress={() => navigation.navigate('ProviderDetail', { provider })}
        >
          <Text style={styles.cancelBtnText}>Cancelar</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  content: { padding: 16, paddingBottom: 40 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  emptyText: { fontSize: 15, color: '#667085', textAlign: 'center', marginBottom: 16 },
  backHomeBtn: {
    backgroundColor: '#1a73e8',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  backHomeBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  backRow: { marginBottom: 14 },
  backText: { color: '#1a73e8', fontSize: 15, fontWeight: '600' },

  card: {
    backgroundColor: '#fff',
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
  provName: { fontWeight: '700', color: '#1a73e8' },

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
    marginBottom: 12,
    color: '#333',
  },
  textArea: { height: 120, textAlignVertical: 'top' },

  submitBtn: {
    backgroundColor: '#1a73e8',
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
