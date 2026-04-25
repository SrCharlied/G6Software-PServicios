import { useRouter } from 'expo-router';
import LoginScreen from '../../src/screens/LoginScreen';
import { useSession } from '../../src/context/SessionContext';

export default function LoginRoute() {
  const router = useRouter();
  const { signIn } = useSession();

  const navigation = {
    navigate: (name) => {
      const map = { register: '/register', home: '/home' };
      router.push(map[name.toLowerCase()] ?? '/home');
    },
  };

  const handleLogin = (user, profile) => {
    signIn(user, profile);
    router.replace('/home');
  };

  return <LoginScreen navigation={navigation} onLogin={handleLogin} />;
}
