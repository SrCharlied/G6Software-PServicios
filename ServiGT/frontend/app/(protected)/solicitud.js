import { Redirect, useRouter } from 'expo-router';
import SolicitudFormScreen from '../../src/screens/SolicitudFormScreen';
import InternalLayout from '../../src/components/InternalLayout';
import { useSession } from '../../src/context/SessionContext';

export default function SolicitudRoute() {
  const router = useRouter();
  const { user, selectedProvider, selectedPublicacion } = useSession();

  if (user?.role === 'proveedor') return <Redirect href="/dashboard" />;

  const navigation = {
    navigate: (name, params = {}) => {
      if (name.toLowerCase() === 'home') { router.replace('/home'); return; }
      if (name.toLowerCase() === 'providerdetail' && selectedProvider) {
        router.back();
        return;
      }
      router.push('/home');
    },
  };

  return (
    <InternalLayout>
      <SolicitudFormScreen
        navigation={navigation}
        user={user}
        selectedProvider={selectedProvider}
        publicacion={selectedPublicacion}
      />
    </InternalLayout>
  );
}
