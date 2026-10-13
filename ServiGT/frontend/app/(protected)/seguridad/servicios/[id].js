import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import InternalLayout from '../../../../src/components/InternalLayout';
import { useSession } from '../../../../src/context/SessionContext';
import ServiceSafetyScreen from '../../../../src/screens/ServiceSafetyScreen';
export default function ServiceSafetyRoute() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { user } = useSession();
  if (!['cliente', 'proveedor'].includes(user?.role)) return <Redirect href="/home" />;
  return <InternalLayout><ServiceSafetyScreen servicioId={id} user={user} navigation={{ goBack: () => router.back(), navigate: (screen, params) => router.push(screen === 'Chat' ? `/chat?tipo=servicio&contexto=${params.id}` : user.role === 'proveedor' ? '/dashboard' : '/solicitudes') }} /></InternalLayout>;
}
