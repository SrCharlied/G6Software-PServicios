import { Redirect, useRouter } from 'expo-router';
import MisPublicacionesScreen from '../../src/screens/MisPublicacionesScreen';
import { useSession } from '../../src/context/SessionContext';
import InternalLayout from '../../src/components/InternalLayout';

/**
 * Gestion de publicaciones del proveedor (task 5.5).
 *
 * El guardia de rol es de navegacion, no de seguridad: quien llegue aqui con el
 * rol manipulado en el dispositivo vera la pantalla vacia, porque
 * `/publicaciones/mias` responde 403 a cualquiera que no sea proveedor con
 * perfil. Ademas `SessionContext` revalida el rol contra `/me` en cada arranque
 * (task 3.3), asi que el rol local no basta para montar esta ruta.
 */
export default function PublicacionesRoute() {
  const router = useRouter();
  const { user } = useSession();

  if (user?.role !== 'proveedor') return <Redirect href="/home" />;

  const navigation = {
    navigate: (name) => {
      const map = {
        creditos: '/creditos',
        dashboard: '/dashboard',
        home: '/home',
      };
      router.push(map[name.toLowerCase()] ?? '/dashboard');
    },
  };

  return (
    <InternalLayout section="proveedor">
      <MisPublicacionesScreen navigation={navigation} />
    </InternalLayout>
  );
}
