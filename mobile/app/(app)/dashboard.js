import React, { useMemo } from 'react';
import { View, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { Text, Card, useTheme, Chip } from 'react-native-paper';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/auth/AuthContext';
import { aggByStatus as supplierAggByStatus } from '../../src/api/suppliers';
import {
  pendingApprovals,
  monthlySpend,
  cycleTime,
  aggByStatus as poAggByStatus,
} from '../../src/api/purchaseOrders';
import { formatCurrency } from '../../src/utils/format';

function KpiCard({ label, value, hint, accent, loading, onPress }) {
  const theme = useTheme();
  return (
    <Card
      mode="outlined"
      style={[styles.kpi, { borderColor: theme.colors.outlineVariant }]}
      onPress={onPress}
    >
      <Card.Content style={{ gap: 4 }}>
        <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, letterSpacing: 1 }}>
          {label.toUpperCase()}
        </Text>
        {loading ? (
          <ActivityIndicator />
        ) : (
          <Text
            variant="displayMedium"
            style={{ fontWeight: '700', color: accent || theme.colors.onSurface }}
            numberOfLines={1}
          >
            {value}
          </Text>
        )}
        {hint ? (
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
            {hint}
          </Text>
        ) : null}
      </Card.Content>
    </Card>
  );
}

function sumByStatus(rows, statuses) {
  if (!Array.isArray(rows)) return 0;
  const set = new Set(statuses);
  return rows.reduce((acc, r) => acc + (set.has(r.status) ? Number(r.count) || 0 : 0), 0);
}

export default function Dashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const theme = useTheme();
  const roles = user?.roles || [];
  const isApprover = roles.includes('APPROVER');

  const year = new Date().getFullYear();

  const suppliersQ = useQuery({
    queryKey: ['supplier-agg-by-status'],
    queryFn: supplierAggByStatus,
  });

  const poStatusQ = useQuery({
    queryKey: ['po-agg-by-status'],
    queryFn: poAggByStatus,
  });

  const pendingQ = useQuery({
    queryKey: ['po-pending-approvals'],
    queryFn: pendingApprovals,
    enabled: isApprover,
  });

  const monthlyQ = useQuery({
    queryKey: ['po-monthly-spend', year],
    queryFn: () => monthlySpend(year),
  });

  const cycleQ = useQuery({
    queryKey: ['po-cycle-time'],
    queryFn: cycleTime,
  });

  const activeSuppliers = useMemo(() => {
    const rows = suppliersQ.data?.data || suppliersQ.data || [];
    return sumByStatus(rows, ['ACTIVE']);
  }, [suppliersQ.data]);

  const openPOs = useMemo(() => {
    const rows = poStatusQ.data?.data || poStatusQ.data || [];
    return sumByStatus(rows, ['SUBMITTED', 'APPROVED']);
  }, [poStatusQ.data]);

  const pendingCount = pendingQ.data?.count ?? pendingQ.data?.total ?? '—';

  const monthlyTotal = useMemo(() => {
    const rows = monthlyQ.data?.data || monthlyQ.data || [];
    if (!Array.isArray(rows)) return null;
    return rows.reduce((acc, r) => acc + (Number(r.total_spend) || Number(r.total) || 0), 0);
  }, [monthlyQ.data]);

  const cycleAvg = cycleQ.data?.avg_days ?? cycleQ.data?.average_days;

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
        <KpiCard
          label="Active suppliers"
          value={suppliersQ.isLoading ? '' : `${activeSuppliers}`}
          loading={suppliersQ.isLoading}
          accent={theme.colors.primary}
          onPress={() => router.push('/(app)/suppliers')}
        />

        <KpiCard
          label="Open POs"
          value={poStatusQ.isLoading ? '' : `${openPOs}`}
          loading={poStatusQ.isLoading}
          hint="Submitted + Approved"
          onPress={() => router.push('/(app)/purchase-orders')}
        />

        {isApprover ? (
          <KpiCard
            label="Awaiting me"
            value={pendingQ.isLoading ? '' : `${pendingCount}`}
            loading={pendingQ.isLoading}
            accent="#F59E0B"
            hint="Tap to open the inbox"
            onPress={() => router.push('/(app)/approvals')}
          />
        ) : null}

        <KpiCard
          label={`Spend ${year}`}
          value={monthlyQ.isLoading ? '' : monthlyTotal != null ? formatCurrency(monthlyTotal, 'INR') : '—'}
          loading={monthlyQ.isLoading}
          hint="Year-to-date"
        />

        <KpiCard
          label="Cycle time"
          value={cycleQ.isLoading ? '' : cycleAvg != null ? `${Math.round(Number(cycleAvg))} d` : '—'}
          loading={cycleQ.isLoading}
          hint="DRAFT → FULFILLED, avg"
        />
      </View>

      <Card mode="outlined">
        <Card.Title title="Quick links" />
        <Card.Content>
          <Text variant="bodyMedium">
            Phase 3 will add the Approvals inbox with approve/reject actions; Phase 4 wires FCM push notifications.
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
