import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import InternalLayout from '../../../src/components/InternalLayout';
import { useSession } from '../../../src/context/SessionContext';
import { materialNavigation } from '../../../src/utils/materialNavigation';
import MaterialDetailScreen from '../../../src/screens/MaterialDetailScreen';

export default function MaterialDetailRoute() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { user } = useSession();
  if (user?.role !== 'proveedor') return <Redirect href="/home" />;
  return <InternalLayout><MaterialDetailScreen user={user} materialId={id} navigation={materialNavigation(router)} /></InternalLayout>;
}
