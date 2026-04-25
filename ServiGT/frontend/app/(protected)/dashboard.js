import { Redirect, useRouter } from 'expo-router';
import ProviderDashboardScreen from '../../src/screens/ProviderDashboardScreen';
import { useSession } from '../../src/context/SessionContext';

export default function DashboardRoute() {
  const router = useRouter();
  const { user, providerProfile, setProviderProfile, signOut } = useSession();

  if (user?.role !== 'proveedor') return <Redirect href="/home" />;

  const navigation = {
    navigate: (name, params = {}) => {
      const map = {
        home: '/home',
        providereditprofile: '/profile/edit',
        login: '/login',
      };
      router.push(map[name.toLowerCase()] ?? '/home');
    },
  };

  return (
    <ProviderDashboardScreen
      navigation={navigation}
      user={user}
      providerProfile={providerProfile}
      setProviderProfile={setProviderProfile}
      onLogout={async () => { await signOut(); router.replace('/home'); }}
    />
  );
}
