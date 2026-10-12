import { Redirect, useRouter } from 'expo-router';
import InternalLayout from '../../../src/components/InternalLayout';
import { useSession } from '../../../src/context/SessionContext';
import { materialNavigation } from '../../../src/utils/materialNavigation';
import MaterialMarketplaceScreen from '../../../src/screens/MaterialMarketplaceScreen';

export default function MaterialMarketplaceRoute() {
  const router = useRouter();
  const { user } = useSession();
  if (user?.role !== 'proveedor') return <Redirect href="/home" />;
  return <InternalLayout><MaterialMarketplaceScreen user={user} navigation={materialNavigation(router)} /></InternalLayout>;
}
