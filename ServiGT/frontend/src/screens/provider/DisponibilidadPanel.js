import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { T } from '../../theme';
import { Button, Card } from '../../components/ui';
import { TimePickerModal } from './ProviderModals';
import { DIAS } from './providerUtils';

export default function DisponibilidadPanel({
  disponibilidad,
  loading,
  guardando,
  columnas = 1,
  onUpdateDay,
  onGuardar,
}) {
  const [picker, setPicker] = useState(null); // { day, which, value } | null

  return (
    <View style={s.wrap}>
      <View style={s.headRow}>
        <Text style={s.title}>Disponibilidad semanal</Text>
        {loading ? <ActivityIndicator color={T.blue} size="small" /> : null}
      </View>

      <View style={s.grid}>
        {disponibilidad.map((item) => {
          const day = DIAS.find((d) => d.id === item.dia_semana);
          return (
            <View
              key={item.dia_semana}
              style={[s.gridItem, { flexBasis: `${100 / columnas}%`, maxWidth: `${100 / columnas}%` }]}
            >
              <Card style={s.dayCard}>
                <TouchableOpacity
                  style={[s.dayToggle, item.disponible && s.dayToggleActive]}
                  onPress={() => onUpdateDay(item.dia_semana, { disponible: !item.disponible })}
                  accessibilityRole="switch"
                  accessibilityState={{ checked: item.disponible }}
                >
                  <Text style={[s.dayText, item.disponible && s.dayTextActive]}>
                    {day?.label || `Día ${item.dia_semana}`}
                  </Text>
                </TouchableOpacity>

                <View style={s.horas}>
                  <TouchableOpacity
                    style={[s.hora, !item.disponible && s.horaOff]}
                    disabled={!item.disponible}
                    onPress={() => setPicker({ day: item.dia_semana, which: 'inicio', value: item.hora_inicio })}
                  >
                    <Text style={[s.horaValor, !item.disponible && s.horaValorOff]}>{item.hora_inicio}</Text>
                    <Text style={s.horaFlecha}>▾</Text>
                  </TouchableOpacity>

                  <Text style={s.horaSep}>a</Text>

                  <TouchableOpacity
                    style={[s.hora, !item.disponible && s.horaOff]}
                    disabled={!item.disponible}
                    onPress={() => setPicker({ day: item.dia_semana, which: 'fin', value: item.hora_fin })}
                  >
                    <Text style={[s.horaValor, !item.disponible && s.horaValorOff]}>{item.hora_fin}</Text>
                    <Text style={s.horaFlecha}>▾</Text>
                  </TouchableOpacity>
                </View>
              </Card>
            </View>
          );
        })}
      </View>

      <Button kind="primary" icon="save" loading={guardando} onPress={onGuardar}>
        Guardar disponibilidad
      </Button>

      <TimePickerModal
        visible={!!picker}
        value={picker?.value}
        onClose={() => setPicker(null)}
        onSelect={(valor) => {
          if (picker) {
            onUpdateDay(picker.day, picker.which === 'inicio' ? { hora_inicio: valor } : { hora_fin: valor });
          }
          setPicker(null);
        }}
      />
    </View>
  );
}

const s = StyleSheet.create({
  wrap:    { gap: T.s3 },
  headRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: T.s2 },
  title:   { fontSize: 16, fontWeight: '800', color: T.ink },

  grid:     { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -T.s2 },
  gridItem: { paddingHorizontal: T.s2, paddingBottom: T.s3 },
  dayCard:  { gap: 10 },

  dayToggle: {
    borderWidth: 1, borderColor: T.inputBorder, borderRadius: T.rSm,
    paddingVertical: 10, paddingHorizontal: 14, backgroundColor: T.white,
  },
  dayToggleActive: { backgroundColor: '#ecfdf5', borderColor: '#86efac' },
  dayText:         { fontSize: 14, fontWeight: '600', color: T.muted },
  dayTextActive:   { color: '#065f46' },

  horas: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  hora: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: T.white, borderWidth: 1, borderColor: T.inputBorder,
    borderRadius: T.rSm, paddingHorizontal: 12, paddingVertical: 10,
  },
  horaOff:      { backgroundColor: T.inputBg },
  horaValor:    { fontSize: 14, fontWeight: '600', color: T.text },
  horaValorOff: { color: T.faint },
  horaFlecha:   { fontSize: 11, color: T.faint },
  horaSep:      { color: T.muted, fontSize: 13, fontWeight: '600' },
});
