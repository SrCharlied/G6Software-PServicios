import { Feather } from '@expo/vector-icons';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { T } from '../../theme';

/**
 * Encabezado compartido de las pantallas internas: regreso opcional, titulo,
 * subtitulo y una zona de acciones a la derecha. Antes cada pantalla dibujaba
 * su propia barra y la altura y el color variaban entre roles.
 */
export default function ScreenHeader({ title, subtitle, onBack, backLabel = 'Volver', right, style }) {
  return (
    <View style={[styles.header, style]}>
      <View style={styles.left}>
        {onBack ? (
          <TouchableOpacity
            onPress={onBack}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={styles.back}
            accessibilityRole="button"
            accessibilityLabel={backLabel}
          >
            <Feather name="arrow-left" size={16} color={T.blue} />
            <Text style={styles.backText}>{backLabel}</Text>
          </TouchableOpacity>
        ) : null}

        <View style={styles.titleBox}>
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle} numberOfLines={2}>{subtitle}</Text> : null}
        </View>
      </View>

      {right ? <View style={styles.right}>{right}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: T.s3,
    paddingHorizontal: T.s4,
    paddingVertical: T.s3,
    backgroundColor: T.paper,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
    ...T.sh1,
  },
  left:  { flex: 1, minWidth: 0, gap: 2 },
  right: { flexDirection: 'row', alignItems: 'center', gap: T.s2, flexShrink: 0 },
  back:  { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start' },
  backText: { color: T.blue, fontWeight: '600', fontSize: 13 },
  titleBox: { minWidth: 0 },
  title:    { fontSize: 17, fontWeight: '800', color: T.ink },
  subtitle: { fontSize: 12, color: T.muted, marginTop: 2 },
});
