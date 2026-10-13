import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import InternalLayout from '../../../src/components/InternalLayout';
import { useSession } from '../../../src/context/SessionContext';
import { materialNavigation } from '../../../src/utils/materialNavigation';
import MaterialFormScreen from '../../../src/screens/MaterialFormScreen';
export default function MaterialCreateRoute() {
  const router = useRouter();
  const { servicioId } = useLocalSearchParams();
  const { user } = useSession();
  if (user?.role !== 'proveedor') return <Redirect href="/home" />;
  return <InternalLayout><MaterialFormScreen user={user} servicioId={servicioId} navigation={materialNavigation(router)} /></InternalLayout>;
}
