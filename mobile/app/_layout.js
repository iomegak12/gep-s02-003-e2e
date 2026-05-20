import 'react-native-gesture-handler';
import React, { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Slot, useRouter, useSegments } from 'expo-router';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import * as SplashScreen from 'expo-splash-screen';
import Constants from 'expo-constants';
import {
  useFonts,
  Roboto_400Regular,
  Roboto_500Medium,
  Roboto_700Bold,
} from '@expo-google-fonts/roboto';
import messaging from '@react-native-firebase/messaging';
import { AuthProvider, useAuth } from '../src/auth/AuthContext';
import { registerDevice } from '../src/api/iam';
import {
  ensureDefaultChannel,
  displayForegroundNotification,
  onLocalNotificationTap,
} from '../src/notifications/notifee';
import { ThemeProvider, useThemeMode } from '../src/theme/ThemeProvider';
import {
  NotificationsProvider,
  useNotifications,
} from '../src/notifications/NotificationsContext';
import {
  getFcmToken,
  isSafeDeepLink,
  requestNotificationPermission,
  toNotificationItem,
} from '../src/notifications/fcm';

SplashScreen.preventAutoHideAsync().catch(() => {});

// Background handler MUST be registered at module top level (not inside a component)
// so it can wake the JS bridge when the app is killed or backgrounded.
// Persist nothing here — only stamp a source tag so the in-app inbox can label it.
messaging().setBackgroundMessageHandler(async (remoteMessage) => {
  if (__DEV__) console.log('[fcm] background message', remoteMessage?.messageId);
  // The notification itself is shown by the OS; we only need to mark the source.
  return Promise.resolve();
});

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

/**
 * FcmGate runs once the user is authenticated. It:
 *   - requests notification permission (Android 13+ / iOS)
 *   - retrieves the FCM token
 *   - registers foreground + open-from-background handlers
 *   - reads any initial notification that launched the app
 *   - routes deep links via Expo Router, deferring until auth is ready
 */
function FcmGate({ children }) {
  const { hydrated, accessToken } = useAuth();
  const { add, token, setToken, setPermissionGranted, pendingDeepLink, setPendingDeepLink } =
    useNotifications();
  const qc = useQueryClient();
  const router = useRouter();
  const wired = useRef(false);
  // Track which (user, token) pair we've already registered so we don't spam the IAM endpoint.
  const lastRegistered = useRef(null); // `${accessToken}:${token}` or null

  // Initial wiring — token + permission + handlers + onTokenRefresh. Runs once.
  useEffect(() => {
    if (wired.current) return;
    wired.current = true;

    let unsubOnMessage = () => {};
    let unsubOnOpen = () => {};
    let unsubOnTokenRefresh = () => {};

    (async () => {
      // Android requires a notification channel before any local display.
      await ensureDefaultChannel();

      const granted = await requestNotificationPermission();
      setPermissionGranted(granted);
      if (!granted) return;

      const t = await getFcmToken();
      if (t) setToken(t);

      // Foreground messages — FCM does NOT auto-display while the app is foregrounded,
      // so we show a local notification via notifee in addition to updating the in-app inbox.
      unsubOnMessage = messaging().onMessage(async (remoteMessage) => {
        const item = toNotificationItem({ ...remoteMessage, __source: 'foreground' });
        add(item);
        try { await displayForegroundNotification(remoteMessage); } catch {}
        qc.invalidateQueries({ queryKey: ['purchase-orders'] });
        qc.invalidateQueries({ queryKey: ['po-pending-approvals'] });
      });

      // User tapped the notification while app was in background
      unsubOnOpen = messaging().onNotificationOpenedApp((remoteMessage) => {
        const item = toNotificationItem({ ...remoteMessage, __source: 'background-open' });
        add(item);
        if (item.deepLink) setPendingDeepLink(item.deepLink);
      });

      // Notification that launched the app from a fully terminated state
      const initial = await messaging().getInitialNotification();
      if (initial) {
        const item = toNotificationItem({ ...initial, __source: 'quit-open' });
        add(item);
        if (item.deepLink) setPendingDeepLink(item.deepLink);
      }

      // Token rotation (reinstall, GMS update, data clear, etc.)
      unsubOnTokenRefresh = messaging().onTokenRefresh((newToken) => {
        if (__DEV__) console.log('[fcm] token refreshed');
        setToken(newToken);
        // Force re-registration; the registration effect below will pick this up.
        lastRegistered.current = null;
      });
    })();

    // User taps a notifee-displayed (foreground) notification → route the deep link.
    const unsubOnLocalTap = onLocalNotificationTap((deepLink) => {
      setPendingDeepLink(deepLink);
    });

    return () => {
      try { unsubOnMessage(); } catch {}
      try { unsubOnOpen(); } catch {}
      try { unsubOnTokenRefresh(); } catch {}
      try { unsubOnLocalTap(); } catch {}
    };
  }, [add, setToken, setPermissionGranted, setPendingDeepLink, qc]);

  // Register the device with IAM whenever we have BOTH an access token AND an FCM token,
  // and the (auth, fcm) pair hasn't been registered yet this session.
  useEffect(() => {
    if (!hydrated || !accessToken || !token) return;
    const sig = `${accessToken}:${token}`;
    if (lastRegistered.current === sig) return;
    lastRegistered.current = sig;

    const platform = Platform.OS === 'ios' ? 'ios' : 'android';
    const appVersion = Constants.expoConfig?.version || undefined;
    registerDevice(token, platform, appVersion).catch((err) => {
      // Don't break the app on registration failure — surface in dev console only.
      if (__DEV__) console.warn('[fcm] device registration failed', err?.response?.data || err?.message);
      lastRegistered.current = null;
    });
  }, [hydrated, accessToken, token]);

  // Reset the registration signature when the user logs out so a fresh login re-registers.
  useEffect(() => {
    if (!accessToken) lastRegistered.current = null;
  }, [accessToken]);

  // Route deep links once auth is ready. If unauthenticated, AuthGate redirects to login;
  // the link stays in pendingDeepLink and fires after sign-in.
  useEffect(() => {
    if (!hydrated || !accessToken || !pendingDeepLink) return;
    if (isSafeDeepLink(pendingDeepLink)) {
      router.push(pendingDeepLink);
    }
    setPendingDeepLink(null);
  }, [hydrated, accessToken, pendingDeepLink, router, setPendingDeepLink]);

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
            <NotificationsProvider>
              <ThemeProvider>
                <ThemedStatusBar />
                <AuthGate fontsLoaded={fontsLoaded}>
                  <FcmGate>
                    <Slot />
                  </FcmGate>
                </AuthGate>
              </ThemeProvider>
            </NotificationsProvider>
          </AuthProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
