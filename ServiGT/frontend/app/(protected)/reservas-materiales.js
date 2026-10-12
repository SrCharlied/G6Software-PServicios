import { Redirect, useRouter } from 'expo-router';
import MyMaterialReservationsScreen from '../../src/screens/MyMaterialReservationsScreen';
import { useSession } from '../../src/context/SessionContext';
import InternalLayout from '../../src/components/InternalLayout';
import { materialNavigation } from '../../src/utils/materialNavigation';

export default function ReservasMaterialesRoute() {
  const router = useRouter();
  const { user } = useSession();

  // La bolsa de materiales es exclusiva de proveedores.
  if (user?.role !== 'proveedor') return <Redirect href="/home" />;

  return (
    <InternalLayout section="proveedor">
      <MyMaterialReservationsScreen navigation={materialNavigation(router)} />
    </InternalLayout>
  );
}
