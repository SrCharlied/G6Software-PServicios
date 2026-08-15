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
import { Button } from '../../components/ui';
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
      <Pressable style={s.backdrop} onPress={onClose}>
        <Pressable style={s.tpCard} onPress={(e) => e.stopPropagation?.()}>
          <View style={s.tpDisplay}>
            <Text style={s.tpDisplayText}>{fmt(hh)}</Text>
            <Text style={s.tpDisplaySep}>:</Text>
            <Text style={s.tpDisplayText}>{fmt(mm)}</Text>
          </View>

          <Text style={s.tpLabel}>Hora</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.tpStrip}>
            {hours.map((h) => (
              <TouchableOpacity
                key={h}
                style={[s.tpChip, h === hh && s.tpChipSel]}
                onPress={() => setHh(h)}
              >
                <Text style={[s.tpChipText, h === hh && s.tpChipTextSel]}>{fmt(h)}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={s.tpLabel}>Minutos (cada 15)</Text>
          <View style={[s.tpStrip, { paddingHorizontal: 0 }]}>
            {mins.map((m) => (
              <TouchableOpacity
                key={m}
                style={[s.tpChip, m === mm && s.tpChipSel]}
                onPress={() => setMm(m)}
              >
                <Text style={[s.tpChipText, m === mm && s.tpChipTextSel]}>{fmt(m)}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={s.tpActions}>
            <Button kind="ghost" full style={{ flex: 1 }} onPress={onClose}>Cancelar</Button>
            <Button
              kind="primary"
              full
              style={{ flex: 1 }}
              onPress={() => onSelect(`${fmt(hh)}:${fmt(mm)}`)}
            >
              Confirmar
            </Button>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ── Filtro por departamento ────────────────────────────────────────────────

export function DeptPickerModal({ visible, value, onSelect, onClose }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={s.backdrop} onPress={onClose}>
        <Pressable style={s.deptSheet} onPress={() => {}}>
          <Text style={s.deptTitle}>Filtrar por departamento</Text>
          <ScrollView showsVerticalScrollIndicator={false}>
            <TouchableOpacity
              style={[s.deptOption, value === '' && s.deptOptionActive]}
              onPress={() => onSelect('')}
            >
              <Text style={[s.deptOptionText, value === '' && s.deptOptionTextActive]}>
                Todos los departamentos
              </Text>
            </TouchableOpacity>
            {DEPARTAMENTOS_GT.map((dept) => (
              <TouchableOpacity
                key={dept}
                style={[s.deptOption, value === dept && s.deptOptionActive]}
                onPress={() => onSelect(dept)}
              >
                <Text style={[s.deptOptionText, value === dept && s.deptOptionTextActive]}>
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
      <Pressable style={s.backdrop} onPress={onClose}>
        <Pressable style={s.codigoSheet} onPress={() => {}}>
          <Text style={s.codigoTitle}>Iniciar servicio</Text>
          <Text style={s.codigoSubtitle}>
            Pide al cliente el código de 6 dígitos para confirmar el inicio del servicio.
          </Text>
          <TextInput
            style={[s.codigoInput, error && s.codigoInputError]}
            value={codigo}
            onChangeText={onChange}
            placeholder="000000"
            placeholderTextColor="#b9c2cc"
            keyboardType="number-pad"
            maxLength={6}
            autoFocus
          />
          {error ? <Text style={s.codigoError}>{error}</Text> : null}
          <View style={s.codigoActions}>
            <Button kind="ghost" onPress={onClose} disabled={procesando}>Cancelar</Button>
            <Button kind="primary" loading={procesando} onPress={onConfirm}>Confirmar</Button>
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
      <Pressable style={s.backdrop} onPress={onClose}>
        <Pressable style={s.codigoSheet} onPress={() => {}}>
          <Text style={s.codigoTitle}>Trabajo finalizado</Text>
          <Text style={s.codigoSubtitle}>
            Dale este código al cliente para que confirme la finalización del servicio.
          </Text>

          {procesando ? (
            <View style={s.codigoLoader}>
              <ActivityIndicator size="large" color={T.blue} />
            </View>
          ) : codigo ? (
            <View style={s.codigoFinBox}>
              <Text style={s.codigoFinValue}>{codigo}</Text>
            </View>
          ) : null}

          <Text style={s.codigoFinHint}>
            El servicio se marcará como completado cuando el cliente ingrese este código.
          </Text>

          <View style={s.codigoActions}>
            <Button kind="primary" loading={procesando} onPress={onClose}>Entendido</Button>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(14,20,36,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: T.s5,
  },

  tpCard: { width: '100%', maxWidth: 340, backgroundColor: T.white, borderRadius: T.rMd, padding: T.s5, ...T.sh3 },
  tpDisplay: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, marginBottom: 16 },
  tpDisplayText: { fontSize: 32, fontWeight: '800', color: T.ink, letterSpacing: -1 },
  tpDisplaySep:  { fontSize: 32, fontWeight: '700', color: T.muted },
  tpLabel: { fontSize: 10, fontWeight: '800', color: T.muted, textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 8, marginBottom: 6 },
  tpStrip: { flexDirection: 'row', gap: 4, paddingVertical: 4 },
  tpChip:  { minWidth: 44, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: T.inputBorder, backgroundColor: T.white, alignItems: 'center' },
  tpChipSel: { backgroundColor: T.blue, borderColor: T.blue },
  tpChipText: { fontSize: 13, fontWeight: '600', color: T.text },
  tpChipTextSel: { color: T.white },
  tpActions: { flexDirection: 'row', gap: 8, marginTop: 16 },

  deptSheet: { width: '100%', maxWidth: 380, backgroundColor: T.white, borderRadius: T.rLg, padding: T.s5, maxHeight: '75%', ...T.sh3 },
  deptTitle: { fontSize: 16, fontWeight: '800', color: T.ink, marginBottom: 14 },
  deptOption: { paddingVertical: 13, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: T.paper },
  deptOptionActive: { backgroundColor: '#eef4ff', borderRadius: T.rSm, paddingHorizontal: 10 },
  deptOptionText: { fontSize: 14, color: T.text },
  deptOptionTextActive: { color: T.blue, fontWeight: '700' },

  codigoSheet: { width: '100%', maxWidth: 360, backgroundColor: T.white, borderRadius: T.rLg, padding: T.s5, ...T.sh3 },
  codigoTitle: { fontSize: 18, fontWeight: '800', color: T.ink, marginBottom: 6 },
  codigoSubtitle: { fontSize: 13, color: T.muted, marginBottom: 18, lineHeight: 18 },
  codigoInput: {
    backgroundColor: T.inputBg,
    borderWidth: 1,
    borderColor: T.inputBorder,
    borderRadius: T.rSm,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: 8,
    textAlign: 'center',
    color: T.ink,
  },
  codigoInputError: { borderColor: T.danger, backgroundColor: '#fff5f5' },
  codigoError: { color: T.danger, fontSize: 12, marginTop: 6 },
  codigoActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 18 },
  codigoLoader: { paddingVertical: 30, alignItems: 'center' },
  codigoFinBox: { marginTop: 6, backgroundColor: '#e3f0ff', borderRadius: T.rSm, paddingVertical: 22, paddingHorizontal: 16, alignItems: 'center' },
  codigoFinValue: { fontSize: 40, fontWeight: '800', color: T.ink, letterSpacing: 10 },
  codigoFinHint: { marginTop: 14, fontSize: 12, color: T.muted, textAlign: 'center', lineHeight: 17 },
});
