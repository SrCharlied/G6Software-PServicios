import { Redirect, useRouter } from 'expo-router';
import ProviderEditProfileScreen from '../../../src/screens/ProviderEditProfileScreen';
import { useSession } from '../../../src/context/SessionContext';
import { getProviders } from '../../../src/services/api';

export default function ProfileEditRoute() {
  const router = useRouter();
  const { user, providerProfile, setProviderProfile } = useSession();

  if (user?.role !== 'proveedor') return <Redirect href="/home" />;

  const navigation = {
    navigate: (name) => {
      const map = { providerdashboard: '/dashboard', home: '/home' };
      router.push(map[name.toLowerCase()] ?? '/home');
    },
  };

  return (
    <ProviderEditProfileScreen
      navigation={navigation}
      user={user}
      providerProfile={providerProfile}
      onProfileUpdated={(updated) => {
        setProviderProfile(updated);
        router.replace('/dashboard');
      }}
    />
  );
}
