import { useRouter } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import SolicitudesScreen from '../../src/screens/SolicitudesScreen';
import InternalLayout from '../../src/components/InternalLayout';
import { useSession } from '../../src/context/SessionContext';

export default function SolicitudesRoute() {
  const router = useRouter();
  const isFocused = useIsFocused();
  const { user } = useSession();

  const navigation = {
    navigate: (name, params = {}) => {
      if (name === 'ServiceSafety') { router.push(`/seguridad/servicios/${params.id}`); return; }
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

  return (
    <InternalLayout>
      <SolicitudesScreen navigation={navigation} user={user} isFocused={isFocused} />
    </InternalLayout>
  );
}
