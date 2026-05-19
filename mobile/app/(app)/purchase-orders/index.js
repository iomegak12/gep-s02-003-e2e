import React from 'react';
import EmptyState from '../../../src/components/EmptyState';

export default function PurchaseOrdersDirectory() {
  return (
    <EmptyState
      title="Purchase Orders"
      message="Phase 2 will wire this to GET /api/v1/purchase-orders with status filters and detail navigation."
    />
  );
}
