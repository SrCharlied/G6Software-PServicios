import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import InternalLayout from '../../src/components/InternalLayout';
import { useSession } from '../../src/context/SessionContext';
import PagoExitosoScreen from '../../src/screens/PagoExitosoScreen';

// Destino del return_url de Stripe:
//   creditos: /pago-exitoso?compra_id=...&session_id=...
//   premium:  /pago-exitoso?tipo=premium&pago_id=...&session_id=...
export default function PagoExitosoRoute() {
  const { user } = useSession();
  const router = useRouter();
  const { compra_id: compraId, pago_id: pagoId, tipo } = useLocalSearchParams();

  if (user?.role !== 'proveedor') return <Redirect href="/home" />;

  const esPremium = tipo === 'premium';
  const id = Number(esPremium ? pagoId : compraId);

  return (
    <InternalLayout section="proveedor">
      <PagoExitosoScreen
        compraId={Number.isInteger(id) && id > 0 ? id : null}
        tipo={esPremium ? 'premium' : 'creditos'}
        onVerCreditos={() => router.replace('/creditos')}
        onContinuar={() => router.replace('/pedidos/abiertos')}
        onVerComprobante={(id) => router.replace(`/comprobante?compra_id=${id}`)}
      />
    </InternalLayout>
  );
}
