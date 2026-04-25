import { useRouter } from 'expo-router';
import RegisterScreen from '../../src/screens/RegisterScreen';
import { useSession } from '../../src/context/SessionContext';

export default function RegisterRoute() {
  const router = useRouter();
  const { signIn } = useSession();

  const navigation = {
    navigate: (name) => {
      const map = { login: '/login', home: '/home' };
      router.push(map[name.toLowerCase()] ?? '/home');
    },
  };

  const handleRegisterSuccess = (user, profile) => {
    signIn(user, profile);
    router.replace('/home');
  };

  return <RegisterScreen navigation={navigation} onRegisterSuccess={handleRegisterSuccess} />;
}
