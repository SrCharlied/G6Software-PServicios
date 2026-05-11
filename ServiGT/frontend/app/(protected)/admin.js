import { Redirect, useRouter } from 'expo-router';
import AdminDashboardScreen from '../../src/screens/AdminDashboardScreen';
import { useSession } from '../../src/context/SessionContext';

export default function AdminRoute() {
  const router = useRouter();
  const { user } = useSession();

  if (!user) return <Redirect href="/login" />;
  if (user.role !== 'admin') return <Redirect href="/home" />;

  const navigation = {
    navigate: (name) => {
      if (name?.toLowerCase() === 'home') { router.replace('/home'); return; }
      router.push('/home');
    },
  };

  return <AdminDashboardScreen navigation={navigation} user={user} />;
}
