import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { DrawerContentScrollView } from '@react-navigation/drawer';
import { Avatar, Text, Switch, useTheme, Divider, List } from 'react-native-paper';
import { useRouter, usePathname } from 'expo-router';
import { useAuth } from '../auth/AuthContext';
import { useThemeMode } from '../theme/ThemeProvider';
import { menuForRoles } from '../utils/roles';
import { logout as apiLogout, unregisterDevice } from '../api/iam';
import { useNotifications } from '../notifications/NotificationsContext';
import GepLogo from './GepLogo';

function initialsOf(user) {
  const src = user?.full_name || user?.email || '?';
  return src
    .split(/[\s.@]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join('');
}

export default function DrawerContent(props) {
  const theme = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const { effective, toggle } = useThemeMode();
  const { token: fcmToken, clear: clearNotifications } = useNotifications();

  const items = menuForRoles(user?.roles || []);

  const handleLogout = async () => {
    // Unregister the FCM token first so server-side pushes stop targeting this device
    // under the outgoing user. Best-effort — never block sign-out on it.
    if (fcmToken) {
      try { await unregisterDevice(fcmToken); } catch {}
    }
    try { await apiLogout(); } catch {}
    clearNotifications();
    await signOut();
    router.replace('/(auth)/login');
  };

  return (
    <DrawerContentScrollView {...props} contentContainerStyle={{ paddingTop: 0 }}>
      <View style={[styles.header, { backgroundColor: theme.colors.elevation.level2 }]}>
        <View style={styles.brandRow}>
          <GepLogo size={28} color={theme.colors.primary} accent={theme.colors.primaryContainer} />
          <Text variant="labelLarge" style={{ color: theme.colors.onSurfaceVariant }}>
            Nexus SCM
          </Text>
        </View>
        <View style={styles.headerRow}>
          <Avatar.Text size={48} label={initialsOf(user) || 'NX'} />
          <View style={styles.headerMeta}>
            <Text variant="titleSmall" numberOfLines={1}>
              {user?.full_name || user?.email || 'Signed out'}
            </Text>
            <Text variant="bodySmall" numberOfLines={1} style={{ color: theme.colors.onSurfaceVariant }}>
              {(user?.roles || []).join(' · ') || '—'}
            </Text>
          </View>
        </View>

        <View style={styles.themeRow}>
          <Text variant="bodySmall">Dark theme</Text>
          <Switch value={effective === 'dark'} onValueChange={toggle} />
        </View>
      </View>

      <Divider />

      <View style={{ paddingVertical: 8 }}>
        {items.map((m) => {
          const active = pathname?.startsWith(m.href);
          return (
            <List.Item
              key={m.key}
              title={m.label}
              left={(p) => <List.Icon {...p} icon={m.icon} color={active ? theme.colors.primary : theme.colors.onSurfaceVariant} />}
              titleStyle={{ color: active ? theme.colors.primary : theme.colors.onSurface, fontWeight: active ? '600' : '400' }}
              style={[
                styles.item,
                active && { backgroundColor: theme.colors.primaryContainer + '20', borderLeftColor: theme.colors.primary, borderLeftWidth: 3 },
              ]}
              onPress={() => router.push(m.href)}
            />
          );
        })}
      </View>

      <Divider />

      <List.Item
        title="Logout"
        titleStyle={{ color: theme.colors.error }}
        left={(p) => <List.Icon {...p} icon="logout" color={theme.colors.error} />}
        onPress={handleLogout}
      />
    </DrawerContentScrollView>
  );
}

const styles = StyleSheet.create({
  header: { padding: 16, gap: 12 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerMeta: { flex: 1, minWidth: 0 },
  themeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  item: { paddingVertical: 2 },
});
