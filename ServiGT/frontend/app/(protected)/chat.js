import { useRouter } from 'expo-router';
import ChatScreen from '../../src/screens/ChatScreen';
import { useSession } from '../../src/context/SessionContext';

export default function ChatRoute() {
  const router = useRouter();
  const { user, chatParams } = useSession();

  const navigation = {
    navigate: (name) => {
      const map = { home: '/home', providerdashboard: '/dashboard' };
      router.push(map[name.toLowerCase()] ?? '/home');
    },
    goBack: () => router.back(),
  };

  return (
    <ChatScreen
      navigation={navigation}
      user={user}
      chatWithUserId={chatParams.userId}
      chatWithName={chatParams.name}
    />
  );
}
