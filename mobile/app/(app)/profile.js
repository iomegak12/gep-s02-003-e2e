import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Card, Chip, useTheme, Avatar } from 'react-native-paper';
import { useAuth } from '../../src/auth/AuthContext';

function Row({ label, value }) {
  const theme = useTheme();
  return (
    <View style={styles.row}>
      <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant }}>{label}</Text>
      <Text variant="bodyMedium">{value || '—'}</Text>
    </View>
  );
}

export default function Profile() {
  const { user } = useAuth();
  const roles = user?.roles || [];
  const isApprover = roles.includes('APPROVER');

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <Card mode="outlined">
        <Card.Content style={styles.header}>
          <Avatar.Text size={56} label={(user?.full_name || user?.email || '?').slice(0, 2).toUpperCase()} />
          <View>
            <Text variant="titleMedium">{user?.full_name || '—'}</Text>
            <Text variant="bodySmall">{user?.email || '—'}</Text>
          </View>
        </Card.Content>
      </Card>

      <Card mode="outlined">
        <Card.Title title="Roles" />
        <Card.Content>
          <View style={styles.chipRow}>
            {roles.length === 0 ? (
              <Text>—</Text>
            ) : (
              roles.map((r) => <Chip key={r} compact>{r}</Chip>)
            )}
          </View>
        </Card.Content>
      </Card>

      <Card mode="outlined">
        <Card.Title title="Account" />
        <Card.Content style={{ gap: 8 }}>
          <Row label="Email" value={user?.email} />
          <Row label="Full name" value={user?.full_name} />
          {isApprover ? (
            <Row
              label="Approval limit"
              value={user?.approval_limit != null ? `${user.approval_limit}` : '—'}
            />
          ) : null}
        </Card.Content>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 16, gap: 12 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
});
