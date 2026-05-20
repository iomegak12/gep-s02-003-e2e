import React, { useCallback } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Card, Text, Chip, useTheme, Avatar } from 'react-native-paper';
import { useRouter } from 'expo-router';
import PaginatedList from '../../../src/components/PaginatedList';
import EmptyState from '../../../src/components/EmptyState';
import { listUsers } from '../../../src/api/iam';
import { useAuth } from '../../../src/auth/AuthContext';

function initials(name, email) {
  const src = name || email || '?';
  return src
    .split(/[\s.@]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join('');
}

function UserRow({ item, onPress }) {
  const theme = useTheme();
  const inactive = item.is_active === false;
  return (
    <Pressable onPress={onPress}>
      <Card mode="outlined" style={styles.card}>
        <Card.Content style={styles.cardContent}>
          <Avatar.Text size={40} label={initials(item.full_name, item.email)} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text variant="titleLarge" numberOfLines={1}>
              {item.full_name || item.email}
            </Text>
            <Text variant="bodySmall" numberOfLines={1} style={{ color: theme.colors.onSurfaceVariant }}>
              {item.email}
            </Text>
            <View style={styles.chipRow}>
              {(item.roles || []).map((r) => (
                <Chip key={r} compact style={styles.chip}>{r}</Chip>
              ))}
              {inactive ? (
                <Chip
                  compact
                  style={[styles.chip, { backgroundColor: theme.colors.errorContainer }]}
                  textStyle={{ color: theme.colors.onErrorContainer }}
                >
                  INACTIVE
                </Chip>
              ) : null}
            </View>
          </View>
        </Card.Content>
      </Card>
    </Pressable>
  );
}

export default function UsersDirectory() {
  const router = useRouter();
  const { user } = useAuth();
  const isAdmin = (user?.roles || []).includes('ADMIN');

  const queryFn = useCallback(({ page, page_size }) => listUsers(page, page_size), []);

  if (!isAdmin) {
    return (
      <EmptyState
        title="Admins only"
        message="The Users directory is available to administrators only."
      />
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <PaginatedList
        queryKey={['users']}
        queryFn={queryFn}
        renderItem={({ item }) => (
          <UserRow item={item} onPress={() => router.push(`/(app)/users/${item.id}`)} />
        )}
        keyExtractor={(item) => item.id}
        emptyTitle="No users"
        emptyMessage="There are no users to display."
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginHorizontal: 16, marginTop: 8 },
  cardContent: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 },
  chip: { backgroundColor: 'transparent' },
});
