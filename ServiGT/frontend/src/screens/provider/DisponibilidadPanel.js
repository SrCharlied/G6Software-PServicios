import { useState } from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import { T } from '../../theme';
import styles from './providerStyles';
import { TimePickerModal } from './ProviderModals';
import { DIAS } from './providerUtils';

export default function DisponibilidadPanel({
  disponibilidad,
  loading,
  guardando,
  onUpdateDay,
  onGuardar,
}) {
  // El selector de hora abierto es estado de este panel: la pantalla no lo usa.
  const [pickerOpen, setPickerOpen] = useState(null); // { day, which, value } | null

  return (
    <View style={styles.sectionStack}>
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>Disponibilidad semanal</Text>
        {loading ? <ActivityIndicator color={T.blue} size="small" /> : null}
      </View>

      {disponibilidad.map((item) => {
        const day = DIAS.find((d) => d.id === item.dia_semana);
        return (
          <View key={item.dia_semana} style={[styles.scheduleRow, item.disponible && styles.scheduleRowOn]}>
            <TouchableOpacity
              style={[styles.dayToggle, item.disponible && styles.dayToggleActive]}
              onPress={() => onUpdateDay(item.dia_semana, { disponible: !item.disponible })}
            >
              <Text style={[styles.dayToggleText, item.disponible && styles.dayToggleTextActive]}>
                {day?.label || `Dia ${item.dia_semana}`}
              </Text>
            </TouchableOpacity>

            <View style={styles.timeInputsRow}>
              <TouchableOpacity
                style={[styles.timePicker, !item.disponible && styles.timePickerDisabled]}
                disabled={!item.disponible}
                onPress={() => setPickerOpen({ day: item.dia_semana, which: 'inicio', value: item.hora_inicio })}
              >
                <Text style={[styles.timePickerValue, !item.disponible && styles.timePickerValueDisabled]}>
                  {item.hora_inicio}
                </Text>
                <Text style={styles.timePickerArrow}>▾</Text>
              </TouchableOpacity>

              <Text style={styles.timeDivider}>a</Text>

              <TouchableOpacity
                style={[styles.timePicker, !item.disponible && styles.timePickerDisabled]}
                disabled={!item.disponible}
                onPress={() => setPickerOpen({ day: item.dia_semana, which: 'fin', value: item.hora_fin })}
              >
                <Text style={[styles.timePickerValue, !item.disponible && styles.timePickerValueDisabled]}>
                  {item.hora_fin}
                </Text>
                <Text style={styles.timePickerArrow}>▾</Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      })}

      <TouchableOpacity
        style={[styles.primaryBtn, guardando && styles.primaryBtnDisabled]}
        onPress={onGuardar}
        disabled={guardando}
      >
        {guardando
          ? <ActivityIndicator color="#fff" />
          : <Text style={styles.primaryBtnText}>Guardar disponibilidad</Text>}
      </TouchableOpacity>

      <TimePickerModal
        visible={!!pickerOpen}
        value={pickerOpen?.value}
        onClose={() => setPickerOpen(null)}
        onSelect={(v) => {
          if (pickerOpen) {
            onUpdateDay(pickerOpen.day, pickerOpen.which === 'inicio' ? { hora_inicio: v } : { hora_fin: v });
          }
          setPickerOpen(null);
        }}
      />
    </View>
  );
}
