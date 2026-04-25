import { ActivityIndicator, View } from 'react-native';
import { Redirect } from 'expo-router';
import { useSession } from '../src/context/SessionContext';

export default function Index() {
  const { sessionLoading } = useSession();

  if (sessionLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator size="large" color="#1a73e8" />
      </View>
    );
  }

  return <Redirect href="/home" />;
}
