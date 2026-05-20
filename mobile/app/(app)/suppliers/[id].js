import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { Card, Text, useTheme, SegmentedButtons, Chip } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import StatusBadge from '../../../src/components/StatusBadge';
import EmptyState from '../../../src/components/EmptyState';
import { getSupplier, getSupplierScorecard } from '../../../src/api/suppliers';
import { extractApiError } from '../../../src/api/client';
import { formatDate, formatCurrency } from '../../../src/utils/format';

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

function OverviewTab({ s }) {
  return (
    <View style={{ gap: 12 }}>
      <Card mode="outlined">
        <Card.Title title="Identity" />
        <Card.Content style={styles.grid}>
          <Field label="Supplier code" value={s.supplier_code} />
          <Field label="Legal name" value={s.legal_name} />
          <Field label="Display name" value={s.display_name} />
          <Field label="Tax ID" value={s.tax_id} />
        </Card.Content>
      </Card>

      <Card mode="outlined">
        <Card.Title title="Classification" />
        <Card.Content style={styles.grid}>
          <Field label="Category" value={s.category} />
          <Field label="Sub-category" value={s.sub_category} />
          <Field label="Country" value={s.country} />
          <Field label="Region" value={s.region} />
        </Card.Content>
        {Array.isArray(s.tags) && s.tags.length ? (
          <Card.Content>
            <Text variant="labelMedium" style={styles.tagsLabel}>Tags</Text>
            <View style={styles.chipRow}>
              {s.tags.map((t) => (
                <Chip key={t} compact>{t}</Chip>
              ))}
            </View>
          </Card.Content>
        ) : null}
      </Card>

      <Card mode="outlined">
        <Card.Title title="Contact" />
        <Card.Content style={styles.grid}>
          <Field label="Primary contact" value={s.contact?.primary_name} />
          <Field label="Email" value={s.contact?.email} />
          <Field label="Phone" value={s.contact?.phone} />
        </Card.Content>
      </Card>

      <Card mode="outlined">
        <Card.Title title="Address" />
        <Card.Content style={styles.grid}>
          <Field label="Street" value={s.address?.street} />
          <Field label="City" value={s.address?.city} />
          <Field label="State" value={s.address?.state} />
          <Field label="Country" value={s.address?.country} />
          <Field label="Postal code" value={s.address?.postal_code} />
        </Card.Content>
      </Card>

      <Card mode="outlined">
        <Card.Title title="Commercial" />
        <Card.Content style={styles.grid}>
          <Field label="Payment terms" value={s.payment_terms} />
          <Field label="Currency" value={s.currency} />
          <Field label="Created" value={formatDate(s.created_at)} />
        </Card.Content>
      </Card>
    </View>
  );
}

function ScorecardTab({ id }) {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['supplier-scorecard', id],
    queryFn: () => getSupplierScorecard(id),
  });

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }
  if (isError) {
    const apiErr = extractApiError(error);
    return <EmptyState title="Scorecard unavailable" message={apiErr.message} />;
  }

  return (
    <Card mode="outlined">
      <Card.Title title="Performance" />
      <Card.Content style={styles.grid}>
        <Field label="Rating" value={data?.rating != null ? `${data.rating}` : '—'} />
        <Field
          label="On-time delivery"
          value={data?.on_time_delivery_rate != null ? `${data.on_time_delivery_rate}%` : '—'}
        />
        <Field label="Total orders" value={data?.total_orders_count} />
        <Field
          label="Total spend"
          value={data?.total_spend_inr != null ? formatCurrency(data.total_spend_inr, 'INR') : '—'}
        />
      </Card.Content>
    </Card>
  );
}

export default function SupplierDetail() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const theme = useTheme();
  const [tab, setTab] = useState('overview');

  const { data: supplier, isLoading, isError, error } = useQuery({
    queryKey: ['supplier', id],
    queryFn: () => getSupplier(id),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }
  if (isError || !supplier) {
    const apiErr = extractApiError(error);
    return (
      <EmptyState
        title="Supplier not found"
        message={apiErr.message}
        actionLabel="Back to suppliers"
        onAction={() => router.replace('/(app)/suppliers')}
      />
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <Card mode="outlined">
        <Card.Content style={styles.headerCard}>
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <Text variant="titleLarge" style={{ fontWeight: '700' }}>
                {supplier.display_name || supplier.legal_name}
              </Text>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                {supplier.supplier_code} · {supplier.category}
              </Text>
            </View>
            <StatusBadge value={supplier.status} kind="supplier" />
          </View>
        </Card.Content>
      </Card>

      <SegmentedButtons
        value={tab}
        onValueChange={setTab}
        density="small"
        buttons={[
          { value: 'overview', label: 'Overview' },
          { value: 'scorecard', label: 'Scorecard' },
        ]}
      />

      {tab === 'overview' ? <OverviewTab s={supplier} /> : <ScorecardTab id={id} />}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 16, gap: 12 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  headerCard: { gap: 8 },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  grid: { gap: 8 },
  field: { gap: 2 },
  tagsLabel: { marginBottom: 6 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
});
