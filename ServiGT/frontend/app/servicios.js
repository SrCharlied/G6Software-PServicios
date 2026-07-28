import ServiciosScreen from '../src/screens/ServiciosScreen';
import { usePublicNavigation } from '../src/utils/publicNavigation';

// Pagina publica: se muestra con o sin sesion iniciada.
export default function ServiciosRoute() {
  const navigation = usePublicNavigation();
  return <ServiciosScreen navigation={navigation} />;
}
