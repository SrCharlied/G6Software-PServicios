import { Redirect, useRouter } from 'expo-router';
import MisPublicacionesScreen from '../../src/screens/MisPublicacionesScreen';
import { useSession } from '../../src/context/SessionContext';
import InternalLayout from '../../src/components/InternalLayout';

export default function PublicacionesRoute() {
  const router = useRouter();
  const { user } = useSession();

  if (user?.role !== 'proveedor') return <Redirect href="/home" />;

  const navigation = {
    goBack: () => router.back(),
  };

  return (
    <InternalLayout section="proveedor">
      <MisPublicacionesScreen navigation={navigation} />
    </InternalLayout>
  );
}