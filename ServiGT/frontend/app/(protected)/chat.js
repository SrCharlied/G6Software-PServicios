import { useLocalSearchParams, useRouter } from 'expo-router';
import ChatScreen from '../../src/screens/ChatScreen';
import ChatListScreen from '../../src/screens/ChatListScreen';
import InternalLayout from '../../src/components/InternalLayout';
import { useSession } from '../../src/context/SessionContext';
import { chatContextFromParams, chatPath } from '../../src/utils/chatContext';

export default function ChatRoute() {
  const router = useRouter();
  const { user } = useSession();
  const params = useLocalSearchParams();
  const context = chatContextFromParams(params);

  const navigation = {
    navigate: (screen, params = {}) => {
      if (screen === 'ChatDetail') {
        router.push(chatPath(params));
      } else if (screen === 'ChatList') {
        // replace y no back: al llegar desde una notificacion el historial
        // no tiene la bandeja detras.
        router.replace('/chat');
      } else if (screen === 'MaterialDetail') {
        router.push(`/bolsa-materiales/${params.id}`);
      } else if (screen === 'Servicios') {
        router.push('/solicitudes');
      } else {
        const map = { home: '/home', providerdashboard: '/dashboard' };
        router.push(map[screen.toLowerCase()] ?? '/home');
      }
    },
    goBack: () => router.back(),
  };

  if (!context) {
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
        context={context}
      />
    </InternalLayout>
  );
}
