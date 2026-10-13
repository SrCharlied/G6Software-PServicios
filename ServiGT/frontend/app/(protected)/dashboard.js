import { Redirect, useRouter } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import ProviderDashboardScreen from '../../src/screens/ProviderDashboardScreen';
import { useSession } from '../../src/context/SessionContext';
import InternalLayout from '../../src/components/InternalLayout';
import { rutaDeMaterial } from '../../src/utils/materialNavigation';

export default function DashboardRoute() {
  const router = useRouter();
  const isFocused = useIsFocused();
  const { user, providerProfile, setProviderProfile, signOut } = useSession();

  if (user?.role !== 'proveedor') return <Redirect href="/home" />;

  const navigation = {
    navigate: (name, params = {}) => {
      const key = name.toLowerCase();
      if (name === 'MaterialDetail' || name === 'MaterialCreate') {
        router.push(rutaDeMaterial(name, params));
        return;
      }
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
        creditos: '/creditos',
        publicaciones: '/publicaciones',
        login: '/login',
      };
      router.push(map[key] ?? '/home');
    },
  };

  return (
    <InternalLayout section="proveedor">
      <ProviderDashboardScreen
        navigation={navigation}
        isFocused={isFocused}
        user={user}
        providerProfile={providerProfile}
        setProviderProfile={setProviderProfile}
        onLogout={async () => { await signOut(); router.replace('/home'); }}
      />
    </InternalLayout>
  );
}
