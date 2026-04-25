import { Redirect, Stack } from 'expo-router';
import { useSession } from '../../src/context/SessionContext';

export default function ProtectedLayout() {
  const { user, sessionLoading } = useSession();
  if (sessionLoading) return null;
  if (!user) return <Redirect href="/landing" />;
  return <Stack screenOptions={{ headerShown: false }} />;
}
