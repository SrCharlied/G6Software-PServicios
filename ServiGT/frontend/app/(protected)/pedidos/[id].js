import { useLocalSearchParams, useRouter } from 'expo-router';
import PedidoDetailScreen from '../../../src/screens/PedidoDetailScreen';
import InternalLayout from '../../../src/components/InternalLayout';

export default function PedidoDetailRoute() {
  const router = useRouter();
  const { id } = useLocalSearchParams();

  const navigation = {
    navigate: (name) => {
      if (name.toLowerCase() === 'solicitudes') { router.push('/solicitudes'); return; }
      router.back();
    },
    goBack: () => router.back(),
  };

  return (
    <InternalLayout>
      <PedidoDetailScreen pedidoId={Number(id)} navigation={navigation} />
    </InternalLayout>
  );
}
