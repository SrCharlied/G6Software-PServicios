import { Redirect, useRouter } from 'expo-router';
import AdminSecurityReportsScreen from '../../../src/screens/AdminSecurityReportsScreen';
import { useSession } from '../../../src/context/SessionContext';
import InternalLayout from '../../../src/components/InternalLayout';

export default function ReportesSeguridadAdminRoute() {
  const router = useRouter();
  const { user } = useSession();

  // La cola de seguridad es exclusiva del administrador.
  if (!user) return <Redirect href="/login" />;
  if (user.role !== 'admin') return <Redirect href="/home" />;

  const navigation = {
    goBack: () => router.back(),
    navigate: (name) => {
      if (name?.toLowerCase() === 'admin') { router.replace('/admin'); return; }
      router.push('/home');
    },
  };

  return (
    <InternalLayout section="admin">
      <AdminSecurityReportsScreen navigation={navigation} user={user} />
    </InternalLayout>
  );
}
