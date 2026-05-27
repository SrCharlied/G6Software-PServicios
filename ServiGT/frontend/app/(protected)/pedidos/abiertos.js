import { useRouter } from 'expo-router';
import PedidosAbiertosScreen from '../../../src/screens/PedidosAbiertosScreen';

export default function PedidosAbiertosRoute() {
  const router = useRouter();
  const navigation = {
    navigate: (name, params = {}) => {
      if (name === 'PedidoDetail') { router.push(`/pedidos/${params.pedidoId}`); return; }
      router.push(`/${name.toLowerCase()}`);
    },
    goBack: () => router.back(),
  };
  return <PedidosAbiertosScreen navigation={navigation} />;
}
