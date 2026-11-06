import { Redirect, useRouter } from 'expo-router';
import InternalLayout from '../../src/components/InternalLayout';
import { useSession } from '../../src/context/SessionContext';
import { useToast } from '../../src/context/ToastContext';
import CuentaScreen from '../../src/screens/CuentaScreen';

export default function CuentaRoute() {
  const { user, endSession } = useSession();
  const router = useRouter();
  const toast = useToast();

  // El backend responde 403 a un admin: no tiene sentido mostrarle el flujo.
  if (user?.role === 'admin') return <Redirect href="/admin" />;

  // Solo tras un 200: el token ya fue revocado en el servidor, asi que se
  // limpia token/usuario/chat locales sin llamar a /logout.
  const handleAccountDeleted = async () => {
    await endSession();
    toast('Tu cuenta fue eliminada y se cerraron todas tus sesiones.', 'success');
    router.replace('/landing');
  };

  return (
    <InternalLayout>
      <CuentaScreen user={user} onAccountDeleted={handleAccountDeleted} />
    </InternalLayout>
  );
}
