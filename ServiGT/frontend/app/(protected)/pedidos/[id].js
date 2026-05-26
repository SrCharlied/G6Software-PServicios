import { useLocalSearchParams, useRouter } from 'expo-router';
import PedidoDetailScreen from '../../../src/screens/PedidoDetailScreen';

export default function PedidoDetailRoute() {
  const router = useRouter();
  const { id } = useLocalSearchParams();

  const navigation = { goBack: () => router.back() };

  return <PedidoDetailScreen pedidoId={Number(id)} navigation={navigation} />;
}
