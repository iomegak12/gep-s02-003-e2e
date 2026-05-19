import React from 'react';
import EmptyState from '../../../src/components/EmptyState';

export default function ApprovalsInbox() {
  return (
    <EmptyState
      title="Approvals Inbox"
      message="Phase 3 will wire this to GET /api/v1/purchase-orders/aggregations/pending-approvals with approve / reject actions."
    />
  );
}
