import { Redirect, useRouter } from 'expo-router';
import ProviderDashboardScreen from '../../src/screens/ProviderDashboardScreen';
import { useSession } from '../../src/context/SessionContext';

export default function DashboardRoute() {
  const router = useRouter();
  const { user, providerProfile, setProviderProfile, signOut } = useSession();

  if (user?.role !== 'proveedor') return <Redirect href="/home" />;

  const navigation = {
    navigate: (name, params = {}) => {
      const key = name.toLowerCase();
      if (key === 'chat') {
        router.push(`/chat?userId=${params.chatWithUserId}&name=${encodeURIComponent(params.chatWithName ?? '')}`);
        return;
      }
      if (key === 'pedidodetail') {
        router.push(`/pedidos/${params.pedidoId}`);
        return;
      }
      const map = {
        home: '/home',
        providereditprofile: '/profile/edit',
        login: '/login',
      };
      router.push(map[key] ?? '/home');
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
