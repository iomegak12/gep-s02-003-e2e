import React, { useEffect } from 'react';
import { FlatList, View, StyleSheet, Pressable } from 'react-native';
import { Card, Text, useTheme, Button, IconButton } from 'react-native-paper';
import { useRouter } from 'expo-router';
import EmptyState from '../../src/components/EmptyState';
import { useNotifications } from '../../src/notifications/NotificationsContext';
import { isSafeDeepLink } from '../../src/notifications/fcm';
import { formatDateTime } from '../../src/utils/format';

function NotificationCard({ item, onPress }) {
  const theme = useTheme();
  return (
    <Pressable onPress={onPress} disabled={!item.deepLink}>
      <Card mode="outlined" style={styles.card}>
        <Card.Content style={{ gap: 4 }}>
          <View style={styles.row}>
            <Text variant="titleSmall" numberOfLines={1} style={{ flex: 1 }}>
              {item.title}
            </Text>
            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
              {item.source}
            </Text>
          </View>
          {item.body ? (
            <Text variant="bodyMedium" numberOfLines={3}>
              {item.body}
            </Text>
          ) : null}
          <View style={styles.row}>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              {formatDateTime(item.receivedAt)}
            </Text>
            {item.deepLink ? (
              <Text variant="bodySmall" style={{ color: theme.colors.primary }}>
                Tap to open →
              </Text>
            ) : null}
          </View>
        </Card.Content>
      </Card>
    </Pressable>
  );
}

export default function Notifications() {
  const router = useRouter();
  const theme = useTheme();
  const { items, markAllRead, clear, permissionGranted } = useNotifications();

  useEffect(() => {
    markAllRead();
  }, [markAllRead]);

  if (items.length === 0) {
    return (
      <EmptyState
        title="No notifications yet"
        message={
          permissionGranted
            ? 'Push notifications will appear here as they arrive.'
            : 'Notification permission was not granted. Re-enable in your device settings to receive pushes.'
        }
      />
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <View style={[styles.toolbar, { borderBottomColor: theme.colors.outlineVariant }]}>
        <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant }}>
          {items.length} message{items.length === 1 ? '' : 's'} (this session)
        </Text>
        <Button compact onPress={clear}>Clear</Button>
      </View>
      <FlatList
        data={items}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ paddingBottom: 24 }}
        renderItem={({ item }) => (
          <NotificationCard
            item={item}
            onPress={() => {
              if (item.deepLink && isSafeDeepLink(item.deepLink)) {
                router.push(item.deepLink);
              }
            }}
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginHorizontal: 16, marginTop: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
