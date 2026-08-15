import { Redirect, useRouter } from 'expo-router';
import PaquetesCreditosScreen from '../../../src/screens/PaquetesCreditosScreen';
import InternalLayout from '../../../src/components/InternalLayout';
import { useSession } from '../../../src/context/SessionContext';

export default function PaquetesCreditosRoute() {
  const router = useRouter();
  const { user } = useSession();

  if (user?.role !== 'proveedor') return <Redirect href="/home" />;

  const navigation = {
    navigate: () => router.push('/creditos'),
    // `replace` y no `back`: al llegar desde el dashboard el historial puede
    // no tener la pantalla de creditos detras.
    goBack: () => router.replace('/creditos'),
  };

  return (
    <InternalLayout section="proveedor">
      <PaquetesCreditosScreen navigation={navigation} />
    </InternalLayout>
  );
}
