import { useRouter } from 'expo-router';
import LegalDocumentScreen from '../src/screens/LegalDocumentScreen';
export default function TerminosRoute() {
  const router = useRouter();
  return <LegalDocumentScreen tipo="terminos" onBack={() => router.canGoBack() ? router.back() : router.replace('/register')} />;
}
