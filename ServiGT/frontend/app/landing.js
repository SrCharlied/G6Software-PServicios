import { Redirect, useRouter } from 'expo-router';
import LandingScreen from '../src/screens/LandingScreen';
import { useSession } from '../src/context/SessionContext';

export default function LandingRoute() {
  const router = useRouter();
  const { user, sessionLoading } = useSession();

  if (sessionLoading) return null;
  if (user) return <Redirect href="/home" />;

  const navigation = {
    navigate: (name) => {
      const map = { Login: '/login', Register: '/register' };
      router.push(map[name] ?? '/landing');
    },
  };

  return <LandingScreen navigation={navigation} />;
}
