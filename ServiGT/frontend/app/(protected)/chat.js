import { useLocalSearchParams, useRouter } from 'expo-router';
import ChatScreen from '../../src/screens/ChatScreen';
import ChatListScreen from '../../src/screens/ChatListScreen';
import InternalLayout from '../../src/components/InternalLayout';
import { useSession } from '../../src/context/SessionContext';

export default function ChatRoute() {
  const router = useRouter();
  const { user } = useSession();
  const { userId, name } = useLocalSearchParams();

  const navigation = {
    navigate: (screen, params = {}) => {
      if (screen === 'ChatDetail') {
        router.push(`/chat?userId=${params.userId}&name=${encodeURIComponent(params.name || '')}`);
      } else if (screen === 'ChatList') {
        // replace y no back: al llegar desde una notificacion el historial no
        // tiene la bandeja detras.
        router.replace('/chat');
      } else {
        const map = { home: '/home', providerdashboard: '/dashboard' };
        router.push(map[screen.toLowerCase()] ?? '/home');
      }
    },
    goBack: () => router.back(),
  };

  if (!userId) {
    return (
      <InternalLayout>
        <ChatListScreen navigation={navigation} user={user} />
      </InternalLayout>
    );
  }

  return (
    <InternalLayout>
      <ChatScreen
        navigation={navigation}
        user={user}
        chatWithUserId={Number(userId)}
        chatWithName={name ? decodeURIComponent(String(name)) : ''}
      />
    </InternalLayout>
  );
}
