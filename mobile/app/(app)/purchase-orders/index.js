import React, { useCallback, useState } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Card, Text, useTheme } from 'react-native-paper';
import { useRouter } from 'expo-router';
import PaginatedList from '../../../src/components/PaginatedList';
import StatusFilterBar from '../../../src/components/StatusFilterBar';
import StatusBadge from '../../../src/components/StatusBadge';
import { listPurchaseOrders } from '../../../src/api/purchaseOrders';
import { formatCurrency, formatDate } from '../../../src/utils/format';

const STATUS_OPTIONS = ['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'FULFILLED', 'CLOSED', 'CANCELLED'];

function PoRow({ item, onPress }) {
  const theme = useTheme();
  return (
    <Pressable onPress={onPress}>
      <Card mode="outlined" style={styles.card}>
        <Card.Content style={styles.cardContent}>
          <View style={styles.rowTop}>
            <View style={{ flex: 1 }}>
              <Text variant="titleLarge" numberOfLines={1}>
                {item.po_number || '—'}
              </Text>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }} numberOfLines={1}>
                {item.supplier_snapshot?.display_name || '—'}
              </Text>
            </View>
            <StatusBadge value={item.status} kind="po" />
          </View>
          <View style={styles.rowMeta}>
            <Text variant="bodyMedium" style={styles.total}>
              {formatCurrency(item.total_amount, item.currency)}
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              ETA {formatDate(item.expected_delivery_date)}
            </Text>
          </View>
        </Card.Content>
      </Card>
    </Pressable>
  );
}

export default function PurchaseOrdersDirectory() {
  const router = useRouter();
  const [status, setStatus] = useState(null);

  const queryFn = useCallback(
    ({ page, page_size }) => {
      const params = { page, page_size };
      if (status) params.status = status;
      return listPurchaseOrders(params);
    },
    [status],
  );

  return (
    <View style={{ flex: 1 }}>
      <PaginatedList
        queryKey={['purchase-orders', { status }]}
        queryFn={queryFn}
        renderItem={({ item }) => (
          <PoRow item={item} onPress={() => router.push(`/(app)/purchase-orders/${item.id}`)} />
        )}
        keyExtractor={(item) => item.id}
        emptyTitle="No purchase orders"
        emptyMessage="No POs match the current filters."
        ListHeaderComponent={
          <StatusFilterBar options={STATUS_OPTIONS} value={status} onChange={setStatus} />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginHorizontal: 16, marginTop: 8 },
  cardContent: { gap: 8 },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  rowMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  total: { fontWeight: '700' },
});
