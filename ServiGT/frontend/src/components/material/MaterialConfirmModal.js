import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { T } from '../../theme';
import { Button } from '../ui';

/**
 * Confirmacion de una accion sobre un lote o una reserva. No cierra por si
 * sola al confirmar: quien la usa decide cuando cerrarla segun la respuesta
 * del backend.
 */
export default function MaterialConfirmModal({ visible, texto, procesando, onCancel, onConfirm }) {
  if (!texto) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={procesando ? undefined : onCancel}>
      <Pressable style={styles.backdrop} onPress={procesando ? undefined : onCancel}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <Text style={styles.title}>{texto.titulo}</Text>
          <Text style={styles.message}>{texto.mensaje}</Text>
          <View style={styles.actions}>
            <Button kind="ghost" onPress={onCancel} disabled={procesando}>No, volver</Button>
            <Button kind={texto.kind} loading={procesando} disabled={procesando} onPress={onConfirm}>
              {texto.confirmar}
            </Button>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: T.elev, alignItems: 'center', justifyContent: 'center', padding: T.s4 },
  sheet: { width: '100%', maxWidth: 440, backgroundColor: T.white, borderRadius: T.rLg, padding: T.s6, gap: T.s3, ...T.sh1 },
  title: { fontSize: 18, fontWeight: '800', color: T.ink },
  message: { fontSize: 14, color: T.muted, lineHeight: 20 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: T.s3, marginTop: T.s2, flexWrap: 'wrap' },
});
