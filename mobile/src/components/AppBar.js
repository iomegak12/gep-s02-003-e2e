import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Appbar, Badge, useTheme } from 'react-native-paper';
import { useNavigation, useRouter } from 'expo-router';
import HealthDots from './HealthDots';
import { useHealth } from '../hooks/useHealth';
import { useNotifications } from '../notifications/NotificationsContext';

export default function AppBar({ title }) {
  const theme = useTheme();
  const router = useRouter();
  const navigation = useNavigation();
  const { services, anyDown, anySlow } = useHealth();
  const { unreadCount } = useNotifications();

  const openDrawer = () => {
    if (navigation && typeof navigation.openDrawer === 'function') {
      navigation.openDrawer();
    }
  };

  return (
    <Appbar.Header elevated mode="small" style={{ backgroundColor: theme.colors.surface }}>
      <Appbar.Action icon="menu" onPress={openDrawer} accessibilityLabel="Open navigation drawer" />
      <Appbar.Content title={title || 'Nexus SCM'} />

      <View style={styles.healthWrap}>
        <HealthDots services={services} onPress={() => router.push('/(app)/health')} />
      </View>

      <View>
        <Appbar.Action
          icon="bell-outline"
          onPress={() => router.push('/(app)/notifications')}
          accessibilityLabel="Notifications"
        />
        {unreadCount > 0 ? (
          <Badge size={16} style={styles.countBadge}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </Badge>
        ) : (anyDown || anySlow) ? (
          <Badge size={8} style={[styles.badge, { backgroundColor: anyDown ? theme.colors.error : '#F59E0B' }]} />
        ) : null}
      </View>

      <Appbar.Action
        icon="cog-outline"
        onPress={() => router.push('/(app)/settings')}
        accessibilityLabel="Settings"
      />
      <Appbar.Action
        icon="account-circle-outline"
        onPress={() => router.push('/(app)/profile')}
        accessibilityLabel="Profile"
      />
    </Appbar.Header>
  );
}

const styles = StyleSheet.create({
  healthWrap: { marginRight: 4 },
  badge: { position: 'absolute', top: 10, right: 8 },
  countBadge: { position: 'absolute', top: 6, right: 2 },
});
