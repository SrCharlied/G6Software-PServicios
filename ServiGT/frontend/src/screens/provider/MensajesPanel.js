import { useRouter } from 'expo-router';
import { useSession } from '../../context/SessionContext';
import ChatListScreen from '../ChatListScreen';
import { chatPath } from '../../utils/chatContext';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from '../../components/ui';
import { T } from '../../theme';
export default function MensajesPanel({ solicitudes = [] }) {
  const router = useRouter();
  const { user } = useSession();
  return <View style={s.panel}>
    {solicitudes.length > 0 ? <View style={s.services}>
      {solicitudes.map((servicio) => <View key={servicio.id} style={s.service}>
        <Text style={s.label}>{`Servicio #${servicio.id} · ${servicio.cliente?.name || 'Cliente'}`}</Text>
        <Button kind="ghost" size="sm" icon="message-circle" onPress={() => router.push(chatPath({ tipo: 'servicio', contexto: servicio.id }))}>Abrir chat</Button>
      </View>)}
    </View> : null}
    <View style={s.inbox}><ChatListScreen user={user} navigation={{ navigate: (screen, params) => router.push(screen === 'ChatDetail' ? chatPath(params) : screen === 'MaterialDetail' ? `/bolsa-materiales/${params.id}` : screen === 'Servicios' ? '/solicitudes' : '/chat') }} /></View>
  </View>;
}
const s = StyleSheet.create({ panel: { gap: T.s3 }, services: { gap: T.s2 }, service: { flexDirection: 'row', flexWrap: 'wrap', gap: T.s2, alignItems: 'center' }, label: { color: T.text, flex: 1, minWidth: 160 }, inbox: { height: 560 } });
