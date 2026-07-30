import { useRouter } from 'expo-router';
import PublicarPedidoScreen from '../../../src/screens/PublicarPedidoScreen';
import InternalLayout from '../../../src/components/InternalLayout';

export default function PublicarPedidoRoute() {
  const router = useRouter();

  const navigation = {
    navigate: (name) => {
      if (name === 'MisPedidos') { router.replace('/pedidos/mios'); return; }
      router.push('/home');
    },
    goBack: () => router.back(),
  };

  return (
    <InternalLayout>
      <PublicarPedidoScreen navigation={navigation} />
    </InternalLayout>
  );
}
