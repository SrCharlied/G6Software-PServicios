import { Redirect, useRouter } from 'expo-router';
import InternalLayout from '../../src/components/InternalLayout';
import { useSession } from '../../src/context/SessionContext';
import CreditosScreen from '../../src/screens/CreditosScreen';

export default function CreditosRoute() {
  const { user } = useSession();
  const router = useRouter();

  if (user?.role !== 'proveedor') return <Redirect href="/home" />;

  return (
    <InternalLayout section="proveedor">
      <CreditosScreen onVerComprobante={(compraId) => router.push(`/comprobante?compra_id=${compraId}`)} />
    </InternalLayout>
  );
}
