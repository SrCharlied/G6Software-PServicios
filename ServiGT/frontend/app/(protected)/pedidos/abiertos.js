import { useRouter } from 'expo-router';
import PedidosAbiertosScreen from '../../../src/screens/PedidosAbiertosScreen';
import InternalLayout from '../../../src/components/InternalLayout';

export default function PedidosAbiertosRoute() {
  const router = useRouter();
  const navigation = {
    navigate: (name, params = {}) => {
      if (name === 'PedidoDetail') { router.push(`/pedidos/${params.pedidoId}`); return; }
      router.push(`/${name.toLowerCase()}`);
    },
    goBack: () => router.back(),
  };
  return (
    <InternalLayout>
      <PedidosAbiertosScreen navigation={navigation} />
    </InternalLayout>
  );
}
