import { useLocalSearchParams, useRouter } from 'expo-router';
import ProviderDetailScreen from '../../src/screens/ProviderDetailScreen';
import { useSession } from '../../src/context/SessionContext';

export default function ProviderDetailRoute() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { user, providerProfile, selectedProvider, setSelectedProvider, setChatParams } = useSession();

  const navigation = {
    navigate: (name, params = {}) => {
      const key = name.toLowerCase();

      if (key === 'solicitudform') {
        if (params.selectedProvider) setSelectedProvider(params.selectedProvider);
        router.push('/solicitud');
        return;
      }
      if (key === 'chat') {
        setChatParams({ userId: params.chatWithUserId ?? null, name: params.chatWithName ?? '' });
        router.push('/chat');
        return;
      }
      if (key === 'providereditprofile') { router.push('/profile/edit'); return; }
      if (key === 'providerdashboard')   { router.push('/dashboard');    return; }
      if (key === 'home')                { router.push('/home');         return; }
      router.back();
    },
    goBack: () => router.back(),
  };

  // Usa el provider del contexto si el ID coincide; si no, ProviderDetailScreen fetcha por id
  const preloaded = selectedProvider && String(selectedProvider.id) === String(id)
    ? selectedProvider
    : null;

  return (
    <ProviderDetailScreen
      navigation={navigation}
      user={user}
      providerProfile={providerProfile}
      selectedProvider={preloaded}
      providerId={id}
    />
  );
}
