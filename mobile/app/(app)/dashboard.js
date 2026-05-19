import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { Text, Card, useTheme, Chip } from 'react-native-paper';
import { useAuth } from '../../src/auth/AuthContext';

function KpiCard({ label, value, hint, accent }) {
  const theme = useTheme();
  return (
    <Card style={[styles.kpi, { borderColor: theme.colors.outlineVariant }]} mode="outlined">
      <Card.Content style={{ gap: 4 }}>
        <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, letterSpacing: 1 }}>
          {label.toUpperCase()}
        </Text>
        <Text variant="headlineSmall" style={{ fontWeight: '700', color: accent || theme.colors.onSurface }}>
          {value}
        </Text>
        {hint ? (
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
            {hint}
          </Text>
        ) : null}
      </Card.Content>
    </Card>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const theme = useTheme();
  const roles = user?.roles || [];

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <View>
        <Text variant="titleLarge" style={{ fontWeight: '700' }}>
          Welcome{user?.full_name ? `, ${user.full_name.split(' ')[0]}` : ''}
        </Text>
        <View style={styles.chipRow}>
          {roles.map((r) => (
            <Chip key={r} compact style={styles.chip}>
              {r}
            </Chip>
          ))}
        </View>
      </View>

      <View style={styles.grid}>
        <KpiCard label="Suppliers (active)" value="—" hint="Phase 2" />
        <KpiCard label="POs awaiting me" value="—" hint="Phase 3" />
        <KpiCard label="Monthly spend" value="—" hint="Phase 2" />
        <KpiCard label="Cycle time (avg)" value="—" hint="Phase 2" />
      </View>

      <Card mode="outlined">
        <Card.Title title="Coming next" />
        <Card.Content>
          <Text variant="bodyMedium">
            Phase 2 will populate these KPIs from the supplier + PO aggregation endpoints. Phase 3 wires the approvals
            inbox. Phase 4 adds FCM push notifications and deep-link routing.
          </Text>
        </Card.Content>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 16, gap: 16 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  chip: { backgroundColor: 'transparent' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  kpi: { flexBasis: '47%', flexGrow: 1, minWidth: 140 },
});
