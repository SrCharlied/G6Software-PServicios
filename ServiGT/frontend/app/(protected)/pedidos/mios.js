import { useRouter } from 'expo-router';
import MisPedidosScreen from '../../../src/screens/MisPedidosScreen';
import InternalLayout from '../../../src/components/InternalLayout';

export default function MisPedidosRoute() {
  const router = useRouter();
  const navigation = {
    navigate: (name, params = {}) => {
      if (name === 'PublicarPedido') { router.push('/pedidos/publicar'); return; }
      if (name === 'PedidoDetail') { router.push(`/pedidos/${params.pedidoId}`); return; }
      if (name === 'Solicitudes') { router.push('/solicitudes'); return; }
      router.push('/home');
    },
    goBack: () => router.back(),
  };
  return (
    <InternalLayout>
      <MisPedidosScreen navigation={navigation} />
    </InternalLayout>
  );
}
