import { Redirect, Stack } from 'expo-router';
import { useSession } from '../../src/context/SessionContext';

export default function AuthLayout() {
  const { user, sessionLoading } = useSession();
  if (sessionLoading) return null;
  if (user) return <Redirect href="/home" />;
  return <Stack screenOptions={{ headerShown: false, animation: 'slide_from_bottom', animationDuration: 320 }} />;
}
