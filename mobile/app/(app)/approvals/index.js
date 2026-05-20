import React, { useCallback, useState } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Card, Text, Button, useTheme, Snackbar } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import PaginatedList from '../../../src/components/PaginatedList';
import StatusBadge from '../../../src/components/StatusBadge';
import EmptyState from '../../../src/components/EmptyState';
import ErrorToast from '../../../src/components/ErrorToast';
import ConfirmWithReasonModal from '../../../src/components/ConfirmWithReasonModal';
import { useAuth } from '../../../src/auth/AuthContext';
import { listPurchaseOrders, approvePO, rejectPO } from '../../../src/api/purchaseOrders';
import { extractApiError } from '../../../src/api/client';
import { formatCurrency, formatDate, daysAgo } from '../../../src/utils/format';

function ApprovalCard({ po, busy, onApprove, onReject, onOpen }) {
  const theme = useTheme();
  const age = daysAgo(po.submitted_at || po.created_at);
  return (
    <Card mode="outlined" style={styles.card}>
      <Pressable onPress={onOpen}>
        <Card.Content style={styles.cardContent}>
          <View style={styles.rowTop}>
            <View style={{ flex: 1 }}>
              <Text variant="titleLarge" numberOfLines={1}>{po.po_number}</Text>
              <Text variant="bodySmall" numberOfLines={1} style={{ color: theme.colors.onSurfaceVariant }}>
                {po.supplier_snapshot?.display_name || '—'}
              </Text>
            </View>
            <StatusBadge value={po.status} kind="po" />
          </View>

          <View style={styles.metaRow}>
            <View>
              <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant }}>Total</Text>
              <Text variant="titleLarge" style={{ fontWeight: '700' }}>
                {formatCurrency(po.total_amount, po.currency)}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant }}>ETA</Text>
              <Text variant="bodyMedium">{formatDate(po.expected_delivery_date)}</Text>
              {age != null ? (
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  Submitted {age === 0 ? 'today' : `${age}d ago`}
                </Text>
              ) : null}
            </View>
          </View>
        </Card.Content>
      </Pressable>

      <Card.Actions style={styles.actions}>
        <Button
          mode="outlined"
          onPress={onReject}
          disabled={busy}
          textColor={theme.colors.error}
          style={{ borderColor: theme.colors.error }}
        >
          Reject
        </Button>
        <Button
          mode="contained"
          onPress={onApprove}
          loading={busy}
          disabled={busy}
        >
          Approve
        </Button>
      </Card.Actions>
    </Card>
  );
}

export default function ApprovalsInbox() {
  const router = useRouter();
  const theme = useTheme();
  const qc = useQueryClient();
  const { user } = useAuth();
  const isApprover = (user?.roles || []).includes('APPROVER');

  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState(null);
  const [info, setInfo] = useState(null);
  const [rejectTarget, setRejectTarget] = useState(null); // PO object or null

  const queryFn = useCallback(
    ({ page, page_size }) => listPurchaseOrders({ page, page_size, status: 'SUBMITTED' }),
    [],
  );

  const invalidate = useCallback(() => {
    qc.invalidateQueries({ queryKey: ['purchase-orders'] });
    qc.invalidateQueries({ queryKey: ['po-pending-approvals'] });
    qc.invalidateQueries({ queryKey: ['po-agg-by-status'] });
  }, [qc]);

  const approveMu = useMutation({
    mutationFn: (id) => approvePO(id),
    onMutate: (id) => setBusyId(id),
    onSettled: () => setBusyId(null),
    onSuccess: (data) => {
      const poNum = data?.po_number || 'PO';
      setInfo(`${poNum} approved.`);
      invalidate();
    },
    onError: (err) => setError(extractApiError(err)),
  });

  const rejectMu = useMutation({
    mutationFn: ({ id, reason }) => rejectPO(id, reason),
    onMutate: ({ id }) => setBusyId(id),
    onSettled: () => setBusyId(null),
    onSuccess: (data) => {
      const poNum = data?.po_number || 'PO';
      setInfo(`${poNum} rejected.`);
      setRejectTarget(null);
      invalidate();
    },
    onError: (err) => {
      setError(extractApiError(err));
      setRejectTarget(null);
    },
  });

  const onApprove = (po) => {
    if (approveMu.isPending) return;
    approveMu.mutate(po.id);
  };

  const onReject = (po) => {
    if (rejectMu.isPending) return;
    setRejectTarget(po);
  };

  // Auto-refresh the list when we get a stale-state error.
  const showError = (apiErr) => {
    setError(apiErr);
    if (apiErr?.code === 'INVALID_STATUS_TRANSITION') {
      invalidate();
    }
  };
  // Hook the showError into the mutations' onError above by re-wrapping setError
  React.useEffect(() => {
    if (error?.code === 'INVALID_STATUS_TRANSITION') invalidate();
  }, [error, invalidate]);

  if (!isApprover) {
    return (
      <EmptyState
        title="Approvers only"
        message="Only users with the APPROVER role can view the inbox."
      />
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <PaginatedList
        queryKey={['approvals-inbox']}
        queryFn={queryFn}
        renderItem={({ item }) => (
          <ApprovalCard
            po={item}
            busy={busyId === item.id}
            onApprove={() => onApprove(item)}
            onReject={() => onReject(item)}
            onOpen={() => router.push(`/(app)/purchase-orders/${item.id}`)}
          />
        )}
        keyExtractor={(item) => item.id}
        emptyTitle="Inbox zero"
        emptyMessage="No purchase orders are awaiting your approval right now."
      />

      <ConfirmWithReasonModal
        visible={!!rejectTarget}
        title="Reject purchase order"
        message={
          rejectTarget
            ? `${rejectTarget.po_number} (${formatCurrency(rejectTarget.total_amount, rejectTarget.currency)}) will be sent back to the buyer.`
            : ''
        }
        confirmLabel="Reject"
        confirmTone="destructive"
        loading={rejectMu.isPending}
        onCancel={() => setRejectTarget(null)}
        onConfirm={(reason) => rejectMu.mutate({ id: rejectTarget.id, reason })}
      />

      <ErrorToast
        visible={!!error}
        error={
          error?.code === 'APPROVAL_LIMIT_EXCEEDED'
            ? {
                ...error,
                message: `This PO exceeds your approval limit (${formatCurrency(user?.approval_limit, 'INR')}). Ask a higher-limit approver.`,
              }
            : error?.code === 'INVALID_STATUS_TRANSITION'
            ? { ...error, message: 'This PO is no longer awaiting approval. Inbox refreshed.' }
            : error
        }
        onDismiss={() => setError(null)}
      />

      <Snackbar
        visible={!!info}
        onDismiss={() => setInfo(null)}
        duration={2200}
        style={{ backgroundColor: theme.colors.primary }}
      >
        <Text style={{ color: theme.colors.onPrimary }}>{info}</Text>
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginHorizontal: 16, marginTop: 8 },
  cardContent: { gap: 12 },
  rowTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  actions: { justifyContent: 'flex-end', paddingTop: 0 },
});
