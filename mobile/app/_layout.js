import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Slot, useRouter, useSegments } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as SplashScreen from 'expo-splash-screen';
import {
  useFonts,
  Roboto_400Regular,
  Roboto_500Medium,
  Roboto_700Bold,
} from '@expo-google-fonts/roboto';
import { AuthProvider, useAuth } from '../src/auth/AuthContext';
import { ThemeProvider, useThemeMode } from '../src/theme/ThemeProvider';

SplashScreen.preventAutoHideAsync().catch(() => {});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false, staleTime: 30_000 },
  },
});

function AuthGate({ children, fontsLoaded }) {
  const { hydrated, accessToken } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (!hydrated || !fontsLoaded) return;
    SplashScreen.hideAsync().catch(() => {});

    const top = segments?.[0];
    const inAuthGroup = top === '(auth)';
    const inAppGroup = top === '(app)';

    if (!accessToken && inAppGroup) {
      router.replace('/(auth)/login');
    } else if (accessToken && (inAuthGroup || top === 'onboarding')) {
      router.replace('/(app)/dashboard');
    }
  }, [hydrated, accessToken, segments, router, fontsLoaded]);

  if (!fontsLoaded) return null;
  return children;
}

function ThemedStatusBar() {
  const { effective } = useThemeMode();
  return <StatusBar style={effective === 'dark' ? 'light' : 'dark'} />;
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Roboto_400Regular,
    Roboto_500Medium,
    Roboto_700Bold,
  });

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <ThemeProvider>
              <ThemedStatusBar />
              <AuthGate fontsLoaded={fontsLoaded}>
                <Slot />
              </AuthGate>
            </ThemeProvider>
          </AuthProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
