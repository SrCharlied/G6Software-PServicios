import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { T } from '../../theme';
import styles from './providerStyles';
import { DEPARTAMENTOS_GT } from './providerUtils';

// ── Selector de hora en pasos de 15 minutos ────────────────────────────────

export function TimePickerModal({ visible, value, onSelect, onClose }) {
  const [hh, setHh] = useState(0);
  const [mm, setMm] = useState(0);

  useEffect(() => {
    if (!visible) return;
    const [h, m] = String(value || '08:00').split(':').map((n) => Number(n));
    setHh(Number.isFinite(h) ? h : 0);
    setMm([0, 15, 30, 45].includes(m) ? m : 0);
  }, [visible, value]);

  const fmt = (n) => String(n).padStart(2, '0');
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const mins = [0, 15, 30, 45];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={tp.backdrop} onPress={onClose}>
        <Pressable style={tp.card} onPress={(e) => e.stopPropagation?.()}>
          <View style={tp.display}>
            <Text style={tp.displayText}>{fmt(hh)}</Text>
            <Text style={tp.displaySep}>:</Text>
            <Text style={tp.displayText}>{fmt(mm)}</Text>
          </View>

          <Text style={tp.label}>Hora</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={tp.strip}>
            {hours.map((h) => (
              <TouchableOpacity
                key={h}
                style={[tp.chip, h === hh && tp.chipSel]}
                onPress={() => setHh(h)}
              >
                <Text style={[tp.chipText, h === hh && tp.chipTextSel]}>{fmt(h)}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={tp.label}>Minutos (cada 15)</Text>
          <View style={[tp.strip, { paddingHorizontal: 0 }]}>
            {mins.map((m) => (
              <TouchableOpacity
                key={m}
                style={[tp.chip, m === mm && tp.chipSel]}
                onPress={() => setMm(m)}
              >
                <Text style={[tp.chipText, m === mm && tp.chipTextSel]}>{fmt(m)}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={tp.actions}>
            <TouchableOpacity style={tp.cancel} onPress={onClose}>
              <Text style={tp.cancelText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={tp.ok} onPress={() => onSelect(`${fmt(hh)}:${fmt(mm)}`)}>
              <Text style={tp.okText}>Confirmar</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ── Filtro por departamento (oportunidades) ────────────────────────────────

export function DeptPickerModal({ visible, value, onSelect, onClose }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.codigoBackdrop} onPress={onClose}>
        <Pressable style={dp.sheet} onPress={() => {}}>
          <Text style={dp.title}>Filtrar por departamento</Text>
          <ScrollView showsVerticalScrollIndicator={false}>
            <TouchableOpacity
              style={[dp.option, value === '' && dp.optionActive]}
              onPress={() => onSelect('')}
            >
              <Text style={[dp.optionText, value === '' && dp.optionTextActive]}>
                Todos los departamentos
              </Text>
            </TouchableOpacity>
            {DEPARTAMENTOS_GT.map((dept) => (
              <TouchableOpacity
                key={dept}
                style={[dp.option, value === dept && dp.optionActive]}
                onPress={() => onSelect(dept)}
              >
                <Text style={[dp.optionText, value === dept && dp.optionTextActive]}>
                  {dept}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ── Codigo de inicio que entrega el cliente ────────────────────────────────

export function IniciarServicioModal({ visible, codigo, error, procesando, onChange, onConfirm, onClose }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.codigoBackdrop} onPress={onClose}>
        <Pressable style={styles.codigoSheet} onPress={() => {}}>
          <Text style={styles.codigoTitle}>Iniciar servicio</Text>
          <Text style={styles.codigoSubtitle}>
            Pide al cliente el codigo de 6 digitos para confirmar el inicio del servicio.
          </Text>
          <TextInput
            style={[styles.codigoTextInput, error && styles.codigoInputError]}
            value={codigo}
            onChangeText={onChange}
            placeholder="000000"
            placeholderTextColor="#b9c2cc"
            keyboardType="number-pad"
            maxLength={6}
            autoFocus
          />
          {error ? <Text style={styles.codigoErrorText}>{error}</Text> : null}
          <View style={styles.codigoActions}>
            <TouchableOpacity style={styles.codigoCancelBtn} onPress={onClose} disabled={procesando}>
              <Text style={styles.codigoCancelText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.codigoConfirmBtn, procesando && styles.codigoConfirmBtnDisabled]}
              onPress={onConfirm}
              disabled={procesando}
            >
              {procesando
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.codigoConfirmText}>Confirmar</Text>}
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ── Codigo de fin que el proveedor entrega al cliente ──────────────────────

export function FinalizarServicioModal({ visible, codigo, procesando, onClose }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.codigoBackdrop} onPress={onClose}>
        <Pressable style={styles.codigoSheet} onPress={() => {}}>
          <Text style={styles.codigoTitle}>Trabajo finalizado</Text>
          <Text style={styles.codigoSubtitle}>
            Dale este codigo al cliente para que confirme la finalizacion del servicio.
          </Text>

          {procesando ? (
            <View style={styles.codigoFinModalLoader}>
              <ActivityIndicator size="large" color={T.blue} />
            </View>
          ) : codigo ? (
            <View style={styles.codigoFinModalBox}>
              <Text style={styles.codigoFinModalValue}>{codigo}</Text>
            </View>
          ) : null}

          <Text style={styles.codigoFinModalHint}>
            El servicio se marcara como completado cuando el cliente ingrese este codigo.
          </Text>

          <View style={styles.codigoActions}>
            <TouchableOpacity
              style={[styles.codigoConfirmBtn, procesando && styles.codigoConfirmBtnDisabled]}
              onPress={onClose}
              disabled={procesando}
            >
              <Text style={styles.codigoConfirmText}>Entendido</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const tp = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(14,20,36,0.45)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  card: { width: '100%', maxWidth: 340, backgroundColor: T.white, borderRadius: T.rMd, padding: 20, ...T.sh3 },
  display: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, marginBottom: 16 },
  displayText: { fontSize: 32, fontWeight: '800', color: T.ink, letterSpacing: -1 },
  displaySep: { fontSize: 32, fontWeight: '700', color: T.muted },
  label: { fontSize: 10, fontWeight: '700', color: T.muted, textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 8, marginBottom: 6 },
  strip: { flexDirection: 'row', gap: 4, paddingVertical: 4 },
  chip: { minWidth: 44, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: T.inputBorder, backgroundColor: T.white, alignItems: 'center' },
  chipSel: { backgroundColor: T.blue, borderColor: T.blue },
  chipText: { fontSize: 13, fontWeight: '600', color: T.text },
  chipTextSel: { color: '#fff' },
  actions: { flexDirection: 'row', gap: 8, marginTop: 16 },
  cancel: { flex: 1, paddingVertical: 12, borderRadius: T.rSm, borderWidth: 1, borderColor: T.border, alignItems: 'center', backgroundColor: T.white },
  cancelText: { color: T.text, fontWeight: '600', fontSize: 14 },
  ok: { flex: 1, paddingVertical: 12, borderRadius: T.rSm, alignItems: 'center', backgroundColor: T.blue },
  okText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});

const dp = StyleSheet.create({
  sheet: {
    width: '100%', maxWidth: 380,
    backgroundColor: T.white, borderRadius: 16,
    padding: 20, maxHeight: '75%',
    ...T.sh3,
  },
  title:            { fontSize: 16, fontWeight: '700', color: T.ink, marginBottom: 14 },
  option:           { paddingVertical: 13, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: T.paper },
  optionActive:     { backgroundColor: '#eef4ff', borderRadius: T.rSm, paddingHorizontal: 10 },
  optionText:       { fontSize: 14, color: T.text },
  optionTextActive: { color: T.blue, fontWeight: '700' },
});
