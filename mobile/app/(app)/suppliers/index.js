import React from 'react';
import EmptyState from '../../../src/components/EmptyState';

export default function SuppliersDirectory() {
  return (
    <EmptyState
      title="Suppliers Directory"
      message="Phase 2 will wire this to GET /api/v1/suppliers with paging, status filters, and a search box."
    />
  );
}
