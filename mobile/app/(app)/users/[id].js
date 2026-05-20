import React from 'react';
import { View, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { Card, Text, Chip, useTheme, Avatar } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import EmptyState from '../../../src/components/EmptyState';
import { getUser } from '../../../src/api/iam';
import { extractApiError } from '../../../src/api/client';
import { formatCurrency, formatDate } from '../../../src/utils/format';

function Field({ label, value }) {
  const theme = useTheme();
  return (
    <View style={styles.field}>
      <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant }}>
        {label}
      </Text>
      <Text variant="bodyMedium">{value ?? '—'}</Text>
    </View>
  );
}

function initials(name, email) {
  const src = name || email || '?';
  return src
    .split(/[\s.@]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join('');
}

export default function UserDetail() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const theme = useTheme();

  const { data: u, isLoading, isError, error } = useQuery({
    queryKey: ['user', id],
    queryFn: () => getUser(id),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  if (isError || !u) {
    const apiErr = extractApiError(error);
    return (
      <EmptyState
        title="User not found"
        message={apiErr.message}
        actionLabel="Back to users"
        onAction={() => router.replace('/(app)/users')}
      />
    );
  }

  const isApprover = (u.roles || []).includes('APPROVER');

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <Card mode="outlined">
        <Card.Content style={styles.header}>
          <Avatar.Text size={56} label={initials(u.full_name, u.email)} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text variant="titleLarge" numberOfLines={1}>
              {u.full_name || '—'}
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }} numberOfLines={1}>
              {u.email}
            </Text>
            <View style={styles.chipRow}>
              {(u.roles || []).map((r) => (
                <Chip key={r} compact>{r}</Chip>
              ))}
              {u.is_active === false ? (
                <Chip
                  compact
                  style={{ backgroundColor: theme.colors.errorContainer }}
                  textStyle={{ color: theme.colors.onErrorContainer }}
                >
                  INACTIVE
                </Chip>
              ) : null}
            </View>
          </View>
        </Card.Content>
      </Card>

      <Card mode="outlined">
        <Card.Title title="Account" />
        <Card.Content style={styles.grid}>
          <Field label="Email" value={u.email} />
          <Field label="Full name" value={u.full_name} />
          <Field label="Active" value={u.is_active === false ? 'No' : 'Yes'} />
          {isApprover ? (
            <Field
              label="Approval limit"
              value={u.approval_limit != null ? formatCurrency(u.approval_limit, 'INR') : '—'}
            />
          ) : null}
          <Field label="Created" value={formatDate(u.created_at)} />
        </Card.Content>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 16, gap: 12 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  grid: { gap: 8 },
  field: { gap: 2 },
});
