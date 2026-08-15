import { Feather } from '@expo/vector-icons';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { T } from '../../theme';
import { Avatar, Card, EmptyState } from '../../components/ui';

/**
 * Clientes con los que el proveedor tiene servicios, como atajo al chat.
 * Se derivan de las solicitudes para no pedir otra vez las conversaciones.
 */
export default function MensajesPanel({ solicitudes, loading, columnas = 1, onAbrirChat }) {
  const vistos = {};
  solicitudes.forEach((s) => {
    if (s.cliente_id && s.cliente && !vistos[s.cliente_id]) {
      vistos[s.cliente_id] = { userId: s.cliente_id, name: s.cliente.name || 'Cliente' };
    }
  });
  const clientes = Object.values(vistos);

  return (
    <View style={st.wrap}>
      <Text style={st.title}>Conversaciones con clientes</Text>

      {loading && clientes.length === 0 ? (
        <ActivityIndicator color={T.blue} style={st.loader} />
      ) : clientes.length === 0 ? (
        <EmptyState
          icon="message-circle"
          title="Aún no tienes conversaciones"
          description="Aparecerán aquí cuando recibas solicitudes de clientes."
        />
      ) : (
        <View style={st.grid}>
          {clientes.map((c) => (
            <View
              key={c.userId}
              style={[st.gridItem, { flexBasis: `${100 / columnas}%`, maxWidth: `${100 / columnas}%` }]}
            >
              <TouchableOpacity activeOpacity={0.85} onPress={() => onAbrirChat(c)}>
                <Card style={st.fila}>
                  <Avatar name={c.name} size={40} />
                  <Text style={st.nombre} numberOfLines={1}>{c.name}</Text>
                  <Feather name="chevron-right" size={18} color={T.blue} />
                </Card>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const st = StyleSheet.create({
  wrap:     { gap: T.s3 },
  title:    { fontSize: 16, fontWeight: '800', color: T.ink },
  loader:   { marginVertical: 16 },
  grid:     { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -T.s2 },
  gridItem: { paddingHorizontal: T.s2, paddingBottom: T.s3 },
  fila:     { flexDirection: 'row', alignItems: 'center', gap: T.s3 },
  nombre:   { flex: 1, fontSize: 15, fontWeight: '600', color: T.ink },
});
