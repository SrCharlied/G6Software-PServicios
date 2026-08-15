import { Redirect, useRouter } from 'expo-router';
import AdminCreditosPremiumScreen from '../../../src/screens/AdminCreditosPremiumScreen';
import InternalLayout from '../../../src/components/InternalLayout';
import { useSession } from '../../../src/context/SessionContext';

export default function AdminCreditosRoute() {
  const router = useRouter();
  const { user } = useSession();

  if (!user) return <Redirect href="/login" />;
  if (user.role !== 'admin') return <Redirect href="/home" />;

  const navigation = {
    navigate: (name) => {
      if (name === 'Admin') { router.replace('/admin'); return; }
      router.push('/admin');
    },
    goBack: () => router.back(),
  };

  return (
    <InternalLayout section="admin">
      <AdminCreditosPremiumScreen navigation={navigation} />
    </InternalLayout>
  );
}
