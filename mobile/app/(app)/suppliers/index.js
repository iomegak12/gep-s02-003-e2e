import React, { useCallback, useState } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Card, Text, useTheme } from 'react-native-paper';
import { useRouter } from 'expo-router';
import PaginatedList from '../../../src/components/PaginatedList';
import StatusFilterBar from '../../../src/components/StatusFilterBar';
import SearchBar from '../../../src/components/SearchBar';
import StatusBadge from '../../../src/components/StatusBadge';
import { listSuppliers, searchSuppliers } from '../../../src/api/suppliers';
import { formatDate } from '../../../src/utils/format';

const STATUS_OPTIONS = ['PENDING_APPROVAL', 'ACTIVE', 'INACTIVE', 'BLACKLISTED'];

function SupplierRow({ item, onPress }) {
  const theme = useTheme();
  return (
    <Pressable onPress={onPress}>
      <Card mode="outlined" style={styles.card}>
        <Card.Content style={styles.cardContent}>
          <View style={styles.rowTop}>
            <View style={{ flex: 1 }}>
              <Text variant="titleLarge" numberOfLines={1}>
                {item.display_name || item.legal_name || '—'}
              </Text>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                {item.supplier_code || '—'} · {item.category || '—'}
              </Text>
            </View>
            <StatusBadge value={item.status} kind="supplier" />
          </View>
          <View style={styles.rowMeta}>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              {item.country || '—'} · onboarded {formatDate(item.created_at)}
            </Text>
          </View>
        </Card.Content>
      </Card>
    </Pressable>
  );
}

export default function SuppliersDirectory() {
  const router = useRouter();
  const [status, setStatus] = useState(null);
  const [q, setQ] = useState('');

  const queryFn = useCallback(
    ({ page, page_size }) => {
      if (q) {
        return searchSuppliers(q, page_size).then((data) => ({
          data: data?.data || data || [],
          page: 1,
          page_size,
          total: (data?.data || data || []).length,
        }));
      }
      const params = { page, page_size };
      if (status) params.status = status;
      return listSuppliers(params);
    },
    [status, q],
  );

  return (
    <View style={{ flex: 1 }}>
      <PaginatedList
        queryKey={['suppliers', { status, q }]}
        queryFn={queryFn}
        renderItem={({ item }) => (
          <SupplierRow item={item} onPress={() => router.push(`/(app)/suppliers/${item.id}`)} />
        )}
        keyExtractor={(item) => item.id}
        emptyTitle="No suppliers found"
        emptyMessage={
          q ? `No matches for "${q}".` : 'No suppliers match the current filters.'
        }
        ListHeaderComponent={
          <View>
            <SearchBar placeholder="Search suppliers…" onDebouncedChange={setQ} />
            <StatusFilterBar options={STATUS_OPTIONS} value={status} onChange={setStatus} />
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginHorizontal: 16, marginTop: 8 },
  cardContent: { gap: 8 },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  rowMeta: { flexDirection: 'row' },
});
