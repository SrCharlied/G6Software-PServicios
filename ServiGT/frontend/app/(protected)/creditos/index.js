import { Redirect, useRouter } from 'expo-router';
import CreditosScreen from '../../../src/screens/CreditosScreen';
import InternalLayout from '../../../src/components/InternalLayout';
import { useSession } from '../../../src/context/SessionContext';

export default function CreditosRoute() {
  const router = useRouter();
  const { user } = useSession();

  if (user?.role !== 'proveedor') return <Redirect href="/home" />;

  const navigation = {
    navigate: (name) => {
      if (name === 'PaquetesCreditos') { router.push('/creditos/paquetes'); return; }
      router.push('/dashboard');
    },
    goBack: () => router.back(),
  };

  return (
    <InternalLayout section="proveedor">
      <CreditosScreen navigation={navigation} />
    </InternalLayout>
  );
}
