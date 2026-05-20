import React from 'react';
import { View, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { Card, Text, useTheme, Divider } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import StatusBadge from '../../../src/components/StatusBadge';
import EmptyState from '../../../src/components/EmptyState';
import { getPurchaseOrder, getLineItems } from '../../../src/api/purchaseOrders';
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

function LineItemRow({ item, currency }) {
  const theme = useTheme();
  const lineTotal =
    item.line_total != null
      ? Number(item.line_total)
      : Number(item.quantity) * Number(item.unit_price);
  return (
    <View style={styles.lineRow}>
      <View style={styles.lineHeader}>
        <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant }}>
          #{item.line_number}
        </Text>
        <Text variant="bodyMedium" style={styles.lineTotal}>
          {formatCurrency(lineTotal, currency)}
        </Text>
      </View>
      <Text variant="bodyMedium" numberOfLines={2}>
        {item.item_description}
      </Text>
      <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
        {item.quantity} {item.unit_of_measure} × {formatCurrency(item.unit_price, currency)}
        {item.tax_rate ? ` · tax ${item.tax_rate}%` : ''}
      </Text>
    </View>
  );
}

export default function PurchaseOrderDetail() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const theme = useTheme();

  const {
    data: po,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['purchase-order', id],
    queryFn: () => getPurchaseOrder(id),
    enabled: !!id,
  });

  const { data: linesResp, isLoading: linesLoading } = useQuery({
    queryKey: ['purchase-order-lines', id],
    queryFn: () => getLineItems(id),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  if (isError || !po) {
    const apiErr = extractApiError(error);
    return (
      <EmptyState
        title="Purchase order not found"
        message={apiErr.message}
        actionLabel="Back to POs"
        onAction={() => router.replace('/(app)/purchase-orders')}
      />
    );
  }

  const lineItems = Array.isArray(linesResp?.data)
    ? linesResp.data
    : Array.isArray(linesResp)
    ? linesResp
    : Array.isArray(po.line_items)
    ? po.line_items
    : [];

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <Card mode="outlined">
        <Card.Content style={{ gap: 12 }}>
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <Text variant="titleLarge" style={{ fontWeight: '700' }}>
                {po.po_number}
              </Text>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                {po.supplier_snapshot?.display_name || 'Supplier —'}
                {po.supplier_snapshot?.category ? ` · ${po.supplier_snapshot.category}` : ''}
              </Text>
            </View>
            <StatusBadge value={po.status} kind="po" />
          </View>

          <View style={styles.totalsRow}>
            <View>
              <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                Total
              </Text>
              <Text variant="displayMedium" style={{ fontWeight: '700' }}>
                {formatCurrency(po.total_amount, po.currency)}
              </Text>
            </View>
            <View style={styles.totalsMeta}>
              <Field label="Subtotal" value={formatCurrency(po.subtotal, po.currency)} />
              <Field label="Tax" value={formatCurrency(po.tax_amount, po.currency)} />
            </View>
          </View>
        </Card.Content>
      </Card>

      <Card mode="outlined">
        <Card.Title title="Dates" />
        <Card.Content style={styles.grid}>
          <Field label="Created" value={formatDate(po.created_at)} />
          <Field label="Submitted" value={formatDate(po.submitted_at)} />
          <Field label="Approved" value={formatDate(po.approved_at)} />
          <Field label="Expected delivery" value={formatDate(po.expected_delivery_date)} />
          <Field label="Actual delivery" value={formatDate(po.actual_delivery_date)} />
        </Card.Content>
      </Card>

      <Card mode="outlined">
        <Card.Title title="Line items" subtitle={`${lineItems.length} item(s)`} />
        <Card.Content style={{ gap: 0 }}>
          {linesLoading ? (
            <ActivityIndicator />
          ) : lineItems.length === 0 ? (
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              No line items.
            </Text>
          ) : (
            lineItems.map((li, idx) => (
              <View key={li.id || li.line_number}>
                {idx > 0 ? <Divider style={{ marginVertical: 8 }} /> : null}
                <LineItemRow item={li} currency={po.currency} />
              </View>
            ))
          )}
        </Card.Content>
      </Card>

      <Card mode="outlined">
        <Card.Title title="Delivery & terms" />
        <Card.Content style={styles.grid}>
          <Field label="Payment terms" value={po.payment_terms} />
          <Field label="Currency" value={po.currency} />
          <Field
            label="Delivery address"
            value={
              po.delivery_address
                ? [
                    po.delivery_address.street,
                    po.delivery_address.city,
                    po.delivery_address.state,
                    po.delivery_address.postal_code,
                    po.delivery_address.country,
                  ]
                    .filter(Boolean)
                    .join(', ')
                : '—'
            }
          />
          {po.notes ? <Field label="Notes" value={po.notes} /> : null}
        </Card.Content>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 16, gap: 12 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  totalsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalsMeta: { gap: 4, alignItems: 'flex-end' },
  grid: { gap: 8 },
  field: { gap: 2 },
  lineRow: { gap: 2, paddingVertical: 4 },
  lineHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  lineTotal: { fontWeight: '600' },
});
