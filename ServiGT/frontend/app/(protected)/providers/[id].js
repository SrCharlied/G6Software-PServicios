import { useLocalSearchParams, useRouter } from 'expo-router';
import ProviderDetailScreen from '../../../src/screens/ProviderDetailScreen';
import { useSession } from '../../../src/context/SessionContext';

export default function ProviderDetailRoute() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { user, providerProfile, selectedProvider, setSelectedProvider } = useSession();

  const navigation = {
    navigate: (name, params = {}) => {
      const key = name.toLowerCase();

      if (key === 'solicitudform') {
        if (params.provider || params.selectedProvider) {
          setSelectedProvider(params.provider || params.selectedProvider);
        }
        router.push('/solicitud');
        return;
      }
      if (key === 'chat') {
        router.push(`/chat?userId=${params.chatWithUserId}&name=${encodeURIComponent(params.chatWithName ?? '')}`);
        return;
      }
      if (key === 'providereditprofile') { router.push('/profile/edit'); return; }
      if (key === 'providerdashboard')   { router.push('/dashboard');    return; }
      if (key === 'home')                { router.push('/home');         return; }
      router.back();
    },
    goBack: () => router.back(),
  };

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
