import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { T } from '../theme';
import { Button } from './ui';

/** Confirmacion reutilizable para acciones que no deben ejecutarse por error. */
export default function ConfirmActionModal({
  visible,
  title,
  message,
  confirmLabel = 'Confirmar',
  confirmKind = 'primary',
  processing = false,
  error = '',
  onCancel,
  onConfirm,
  children,
}) {
  const cancel = () => {
    if (!processing) onCancel?.();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={cancel}>
      <View style={styles.overlay} accessibilityViewIsModal>
        <Pressable style={StyleSheet.absoluteFill} onPress={cancel} testID="confirm-action-backdrop" />
        <View style={styles.card}>
          <Text style={styles.title}>{title}</Text>
          {message ? <Text style={styles.message}>{message}</Text> : null}
          {children}
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <View style={styles.actions}>
            <Button kind="ghost" disabled={processing} onPress={cancel}>Cancelar</Button>
            <Button
              kind={confirmKind}
              loading={processing}
              disabled={processing}
              onPress={onConfirm}
            >
              {confirmLabel}
            </Button>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(14,20,36,0.52)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: T.s5,
  },
  card: {
    width: '100%',
    maxWidth: 430,
    backgroundColor: T.paper,
    borderRadius: T.rLg,
    borderWidth: 1,
    borderColor: T.border,
    padding: T.s6,
    ...T.sh3,
  },
  title: { color: T.ink, fontSize: 20, fontWeight: '800', marginBottom: T.s2 },
  message: { color: T.muted, fontSize: 14, lineHeight: 21 },
  error: { color: T.danger, fontSize: 13, lineHeight: 19, marginTop: T.s3 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: T.s2, marginTop: T.s5 },
});
