import { Stack } from 'expo-router';
import { AuthProvider } from '../contexts/AuthContext';
import { AlertProvider } from '../contexts/AlertContext';
import '../global.css';

export default function RootLayout() {
  return (
    <AuthProvider>
    <AlertProvider>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#cff5e1' } }}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
      </Stack>
    </AlertProvider>
    </AuthProvider>
  );
}
