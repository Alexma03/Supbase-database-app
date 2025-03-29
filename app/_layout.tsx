import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { useEffect } from 'react';
import { useRouter, useSegments } from 'expo-router';
import { ThemeProvider, useTheme } from '@/contexts/ThemeContext';

const queryClient = new QueryClient();

// Protección de rutas
function AuthProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useSupabaseAuth();
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

// Componente con acceso al tema
function ThemedApp() {
  const { actualTheme, colors } = useTheme();
  const statusBarStyle = actualTheme === 'dark' ? 'light' : 'dark';

  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <AuthProvider>
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: colors.background }
            }}
          >
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="auth/login" options={{ headerShown: false }} />
          </Stack>
          <StatusBar 
            style={statusBarStyle} 
            backgroundColor={colors.background}
            translucent={false}
          />
        </AuthProvider>
      </ErrorBoundary>
    </QueryClientProvider>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <ThemedApp />
    </ThemeProvider>
  );
}