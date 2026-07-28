import { ActivityIndicator, View } from 'react-native';
import { Redirect } from 'expo-router';
import { useSession } from '../src/context/SessionContext';

export default function Index() {
  const { user, sessionLoading } = useSession();

  if (sessionLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator size="large" color="#1a73e8" />
      </View>
    );
  }

  if (!user) return <Redirect href="/landing" />;
  if (user.role === 'admin') return <Redirect href="/admin" />;
  if (user.role === 'proveedor') return <Redirect href="/dashboard" />;

  return <Redirect href="/home" />;
}
