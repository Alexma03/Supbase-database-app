import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { useEffect } from 'react';
import { useRouter, useSegments } from 'expo-router';

const queryClient = new QueryClient();

// Protección de rutas
function AuthProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useSupabaseAuth();
  // Cast de segments a string[] para evitar el error de tipo
  const segments = useSegments() as unknown as string[];
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments.includes('auth');

    // Si no está autenticado y no está en el grupo auth, redirigir a login
    if (!isAuthenticated && !inAuthGroup) {
      router.replace({ pathname: '/auth/login' });
    }
    // Si está autenticado y está en el grupo auth, redirigir al inicio
    else if (isAuthenticated && inAuthGroup) {
      router.replace({ pathname: '/' });
    }
  }, [isAuthenticated, loading, segments, router]);

  return <>{children}</>;
}

export default function RootLayout() {
  // Obtén el esquema de color actual para ajustar la barra de estado
  const colorScheme = useColorScheme();
  const statusBarStyle = colorScheme === 'dark' ? 'light' : 'dark';
  const statusBarBackground = colorScheme === 'dark' ? '#000000' : '#FFFFFF';

  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <AuthProvider>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="/auth/login" options={{ headerShown: false }} />
          </Stack>
          <StatusBar 
            style={statusBarStyle} 
            backgroundColor={statusBarBackground} 
            translucent={false}
          />
        </AuthProvider>
      </ErrorBoundary>
    </QueryClientProvider>
  );
}