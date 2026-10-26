import { useRouter } from 'expo-router';
import LegalDocumentScreen from '../src/screens/LegalDocumentScreen';
export default function PrivacidadRoute() {
  const router = useRouter();
  return <LegalDocumentScreen tipo="privacidad" onBack={() => router.canGoBack() ? router.back() : router.replace('/register')} />;
}
