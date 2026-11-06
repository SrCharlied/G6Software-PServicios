import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import InternalLayout from '../../src/components/InternalLayout';
import { useSession } from '../../src/context/SessionContext';
import ComprobanteCompraScreen from '../../src/screens/ComprobanteCompraScreen';

// Comprobante informativo de una compra de créditos: /comprobante?compra_id=...
export default function ComprobanteRoute() {
  const { user } = useSession();
  const router = useRouter();
  const { compra_id: compraId } = useLocalSearchParams();

  if (user?.role !== 'proveedor') return <Redirect href="/home" />;

  const id = Number(compraId);

  return (
    <InternalLayout section="proveedor">
      <ComprobanteCompraScreen
        compraId={Number.isInteger(id) && id > 0 ? id : null}
        onVolver={() => router.replace('/creditos')}
      />
    </InternalLayout>
  );
}
