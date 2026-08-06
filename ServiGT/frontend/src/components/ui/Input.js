import { Feather } from '@expo/vector-icons';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { T } from '../../theme';

export default function Input({
  icon,
  rightSlot,
  error,
  helperText,
  style,
  inputStyle,
  multiline,
  ...textInputProps
}) {
  return (
    <View style={style}>
      <View
        style={[
          styles.wrap,
          multiline && styles.wrapMultiline,
          error && styles.wrapError,
        ]}
      >
        {icon ? <Feather name={icon} size={16} color={T.muted} style={styles.icon} /> : null}
        <TextInput
          placeholderTextColor={T.faint}
          multiline={multiline}
          style={[styles.input, multiline && styles.inputMultiline, inputStyle]}
          {...textInputProps}
        />
        {rightSlot}
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : helperText ? (
        <Text style={styles.helperText}>{helperText}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 44,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: T.inputBg,
    borderWidth: 1,
    borderColor: T.inputBorder,
    borderRadius: T.rMd,
  },
  wrapMultiline: { alignItems: 'flex-start', minHeight: 120 },
  wrapError: { borderColor: T.danger, backgroundColor: '#fff5f5' },
  icon: { marginTop: 2 },
  input: { flex: 1, fontSize: 15, color: T.text, padding: 0 },
  inputMultiline: { textAlignVertical: 'top' },
  errorText: { fontSize: 12, color: T.danger, marginTop: 4, marginLeft: 2 },
  helperText: { fontSize: 12, color: T.muted, marginTop: 4, marginLeft: 2 },
});
