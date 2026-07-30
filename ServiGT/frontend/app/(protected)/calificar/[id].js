import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import CalificarProveedorScreen from '../../../src/screens/CalificarProveedorScreen';
import InternalLayout from '../../../src/components/InternalLayout';
import { useSession } from '../../../src/context/SessionContext';

export default function CalificarRoute() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { user } = useSession();

  if (user?.role === 'proveedor') return <Redirect href="/dashboard" />;

  const navigation = {
    navigate: (name) => {
      const key = name.toLowerCase();
      if (key === 'solicitudes') { router.replace('/solicitudes'); return; }
      if (key === 'home') { router.replace('/home'); return; }
      router.replace('/solicitudes');
    },
    goBack: () => router.back(),
  };

  return (
    <InternalLayout>
      <CalificarProveedorScreen
        navigation={navigation}
        servicioId={id}
        user={user}
      />
    </InternalLayout>
  );
}
