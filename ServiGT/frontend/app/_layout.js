import { Stack } from 'expo-router';
import { SessionProvider } from '../src/context/SessionContext';
import { ToastProvider } from '../src/context/ToastContext';

export default function RootLayout() {
  return (
    <SessionProvider>
      <ToastProvider>
        <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right', animationDuration: 280 }} />
      </ToastProvider>
    </SessionProvider>
  );
}
