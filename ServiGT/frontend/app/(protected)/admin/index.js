import { Redirect, useRouter } from 'expo-router';
import AdminDashboardScreen from '../../../src/screens/AdminDashboardScreen';
import { useSession } from '../../../src/context/SessionContext';
import InternalLayout from '../../../src/components/InternalLayout';

export default function AdminRoute() {
  const router = useRouter();
  const { user } = useSession();

  if (!user) return <Redirect href="/login" />;
  if (user.role !== 'admin') return <Redirect href="/home" />;

  const navigation = {
    navigate: (name) => {
      const key = name?.toLowerCase();
      if (key === 'admincreditos') { router.push('/admin/creditos'); return; }
      if (key === 'home') { router.replace('/home'); return; }
      router.push('/home');
    },
  };

  return (
    <InternalLayout section="admin">
      <AdminDashboardScreen navigation={navigation} user={user} />
    </InternalLayout>
  );
}
