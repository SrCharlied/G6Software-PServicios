import { useRouter } from 'expo-router';
import SolicitudesScreen from '../../src/screens/SolicitudesScreen';
import { useSession } from '../../src/context/SessionContext';

export default function SolicitudesRoute() {
  const router = useRouter();
  const { user } = useSession();

  const navigation = {
    navigate: (name) => {
      const map = {
        home: '/home',
        providerdashboard: '/dashboard',
      };
      router.push(map[name.toLowerCase()] ?? '/home');
    },
    goBack: () => router.back(),
  };

  return <SolicitudesScreen navigation={navigation} user={user} />;
}
