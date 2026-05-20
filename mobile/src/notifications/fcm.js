// Thin wrapper around @react-native-firebase/messaging.
// Single source of truth for permission requests, token retrieval, and message handlers.
//
// Deep-link contract: notifications should set `data.deep_link` (one of):
//   /(app)/approvals
//   /(app)/purchase-orders/<id>
//   /(app)/suppliers/<id>
//   /(app)/users/<id>
// The link is consumed by handleRemoteMessage's onOpen callback.

import messaging from '@react-native-firebase/messaging';
import { Platform, PermissionsAndroid } from 'react-native';

const VALID_DEEP_LINK_PREFIXES = [
  '/(app)/approvals',
  '/(app)/purchase-orders/',
  '/(app)/suppliers/',
  '/(app)/users/',
  '/(app)/dashboard',
];

export function isSafeDeepLink(href) {
  if (!href || typeof href !== 'string') return false;
  return VALID_DEEP_LINK_PREFIXES.some((p) => href === p || href.startsWith(p));
}

export async function requestNotificationPermission() {
  if (Platform.OS === 'android' && Platform.Version >= 33) {
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (e) {
      return false;
    }
  }
  if (Platform.OS === 'ios') {
    const status = await messaging().requestPermission();
    return (
      status === messaging.AuthorizationStatus.AUTHORIZED ||
      status === messaging.AuthorizationStatus.PROVISIONAL
    );
  }
  return true;
}

export async function getFcmToken() {
  try {
    return await messaging().getToken();
  } catch (e) {
    if (__DEV__) console.warn('[fcm] getToken failed', e);
    return null;
  }
}

// Convert an FCM RemoteMessage into our in-app NotificationItem shape.
export function toNotificationItem(remoteMessage) {
  const id =
    remoteMessage?.messageId ||
    `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return {
    id,
    title: remoteMessage?.notification?.title || remoteMessage?.data?.title || 'Notification',
    body: remoteMessage?.notification?.body || remoteMessage?.data?.body || '',
    data: remoteMessage?.data || {},
    deepLink: remoteMessage?.data?.deep_link || null,
    receivedAt: new Date().toISOString(),
    source: remoteMessage?.__source || 'foreground',
  };
}
