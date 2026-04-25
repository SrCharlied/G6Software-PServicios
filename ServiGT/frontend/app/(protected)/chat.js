import { useLocalSearchParams, useRouter } from 'expo-router';
import ChatScreen from '../../src/screens/ChatScreen';
import { useSession } from '../../src/context/SessionContext';

export default function ChatRoute() {
  const router = useRouter();
  const { user } = useSession();
  // userId y name vienen de la URL: /chat?userId=5&name=Juan
  // Esto hace que la conversación persista en recargas de página.
  const { userId, name } = useLocalSearchParams();

  const navigation = {
    navigate: (screen) => {
      const map = { home: '/home', providerdashboard: '/dashboard' };
      router.push(map[screen.toLowerCase()] ?? '/home');
    },
    goBack: () => router.back(),
  };

  return (
    <ChatScreen
      navigation={navigation}
      user={user}
      chatWithUserId={userId ? Number(userId) : null}
      chatWithName={name ? decodeURIComponent(String(name)) : ''}
    />
  );
}
