import { Feather } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { T } from '../../theme';
import Button from './Button';

/**
 * Estado vacio compartido. `error` cambia el tono a rojo y convierte la
 * accion en un reintento: un fallo de API no debe verse como "no hay datos".
 */
export default function EmptyState({
  icon = 'inbox',
  title,
  description,
  actionLabel,
  onAction,
  error,
  style,
}) {
  const color = error ? T.danger : T.blue;

  return (
    <View style={[styles.wrap, style]}>
      <View style={[styles.iconBox, { backgroundColor: error ? '#fff1f2' : '#eff6ff' }]}>
        <Feather name={error ? 'alert-triangle' : icon} size={30} color={color} />
      </View>
      <Text style={styles.title}>{title}</Text>
      {description ? <Text style={styles.desc}>{description}</Text> : null}
      {actionLabel && onAction ? (
        <Button kind={error ? 'secondary' : 'primary'} onPress={onAction} style={styles.action}>
          {actionLabel}
        </Button>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: T.s6,
    paddingVertical: 48,
    gap: 6,
  },
  iconBox: {
    width: 64, height: 64, borderRadius: 32,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: T.s2,
  },
  title: { fontSize: 17, fontWeight: '800', color: T.ink, textAlign: 'center' },
  desc:  { fontSize: 13, color: T.muted, textAlign: 'center', lineHeight: 20, maxWidth: 420 },
  action: { marginTop: T.s3 },
});
