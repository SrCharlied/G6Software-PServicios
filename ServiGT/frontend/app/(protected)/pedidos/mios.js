import { useRouter } from 'expo-router';
import MisPedidosScreen from '../../../src/screens/MisPedidosScreen';

export default function MisPedidosRoute() {
  const router = useRouter();
  const navigation = {
    navigate: (name, params = {}) => {
      if (name === 'PublicarPedido') { router.push('/pedidos/publicar'); return; }
      if (name === 'PedidoDetail') { router.push(`/pedidos/${params.pedidoId}`); return; }
      router.push('/home');
    },
    goBack: () => router.back(),
  };
  return <MisPedidosScreen navigation={navigation} />;
}
