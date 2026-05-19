import { useRouter } from 'expo-router';
import SolicitudesScreen from '../../src/screens/SolicitudesScreen';
import { useSession } from '../../src/context/SessionContext';

export default function SolicitudesRoute() {
  const router = useRouter();
  const { user } = useSession();

  const navigation = {
    navigate: (name, params = {}) => {
      const map = {
        home: '/home',
        providerdashboard: '/dashboard',
      };
      if (name.toLowerCase() === 'calificarproveedor' && params.servicioId) {
        router.push(`/calificar/${params.servicioId}`);
        return;
      }
      router.push(map[name.toLowerCase()] ?? '/home');
    },
    goBack: () => router.back(),
  };

  return <SolicitudesScreen navigation={navigation} user={user} />;
}
