import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import { T } from '../../theme';
import styles from './providerStyles';

/**
 * Clientes con los que el proveedor tiene servicios, como atajo al chat. Se
 * derivan de las solicitudes ya cargadas para no pedir las conversaciones.
 */
export default function MensajesPanel({ solicitudes, loading, onAbrirChat }) {
  const seen = {};
  solicitudes.forEach((s) => {
    if (s.cliente_id && s.cliente && !seen[s.cliente_id]) {
      seen[s.cliente_id] = { userId: s.cliente_id, name: s.cliente.name || 'Cliente' };
    }
  });
  const clientes = Object.values(seen);

  return (
    <View style={styles.sectionStack}>
      <Text style={styles.sectionTitle}>Conversaciones con clientes</Text>

      {loading && clientes.length === 0 ? (
        <ActivityIndicator color={T.blue} style={styles.sectionLoader} />
      ) : clientes.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>
            Aún no tienes conversaciones. Aparecerán aquí cuando tengas solicitudes de clientes.
          </Text>
        </View>
      ) : (
        clientes.map((c) => (
          <TouchableOpacity
            key={c.userId}
            style={styles.chatClientRow}
            activeOpacity={0.82}
            onPress={() => onAbrirChat(c)}
          >
            <View style={styles.chatClientAvatar}>
              <Text style={styles.chatClientAvatarText}>{c.name.charAt(0).toUpperCase()}</Text>
            </View>
            <Text style={styles.chatClientName}>{c.name}</Text>
            <Text style={styles.chatArrow}>→</Text>
          </TouchableOpacity>
        ))
      )}
    </View>
  );
}
