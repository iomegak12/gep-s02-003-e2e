// Local-notification helpers backed by @notifee/react-native.
// Used to display a system-tray notification while the app is in the foreground —
// FCM doesn't auto-display in foreground; only data is delivered to onMessage.

import notifee, { AndroidImportance, EventType } from '@notifee/react-native';
import { Platform } from 'react-native';

const CHANNEL_ID = 'default';

// Idempotent — safe to call on every cold start.
export async function ensureDefaultChannel() {
  if (Platform.OS !== 'android') return;
  await notifee.createChannel({
    id: CHANNEL_ID,
    name: 'General notifications',
    importance: AndroidImportance.HIGH,
    sound: 'default',
    vibration: true,
  });
}

/**
 * Display a system-tray notification for an incoming FCM RemoteMessage while the
 * app is in the foreground. The data payload (incl. deep_link) is preserved so
 * the foreground-tap handler can route the user.
 */
export async function displayForegroundNotification(remoteMessage) {
  const title =
    remoteMessage?.notification?.title || remoteMessage?.data?.title || 'Nexus SCM';
  const body =
    remoteMessage?.notification?.body || remoteMessage?.data?.body || '';
  const data = { ...(remoteMessage?.data || {}) };
  // Stringify everything; notifee data must be Record<string, string>.
  for (const k of Object.keys(data)) data[k] = String(data[k]);

  await notifee.displayNotification({
    title,
    body,
    data,
    android: {
      channelId: CHANNEL_ID,
      smallIcon: 'ic_notification', // falls back to app icon if not present
      pressAction: { id: 'default' },
      importance: AndroidImportance.HIGH,
    },
    ios: { sound: 'default' },
  });
}

/**
 * Wire taps on locally-displayed notifications.
 * Returns an unsubscribe function.
 */
export function onLocalNotificationTap(onDeepLink) {
  return notifee.onForegroundEvent(({ type, detail }) => {
    if (type === EventType.PRESS) {
      const link = detail?.notification?.data?.deep_link;
      if (link) onDeepLink(String(link));
    }
  });
}

export { EventType, notifee };
