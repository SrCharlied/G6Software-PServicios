import NosotrosScreen from '../src/screens/NosotrosScreen';
import { usePublicNavigation } from '../src/utils/publicNavigation';

// Pagina publica: se muestra con o sin sesion iniciada.
export default function NosotrosRoute() {
  const navigation = usePublicNavigation();
  return <NosotrosScreen navigation={navigation} />;
}
