import { Redirect } from 'expo-router';
import LandingScreen from '../src/screens/LandingScreen';
import { useSession } from '../src/context/SessionContext';
import { usePublicNavigation } from '../src/utils/publicNavigation';

export default function LandingRoute() {
  const { user, sessionLoading } = useSession();
  const navigation = usePublicNavigation();

  if (sessionLoading) return null;
  if (user) return <Redirect href="/home" />;

  return <LandingScreen navigation={navigation} />;
}
