import React from 'react';
import EmptyState from '../../../src/components/EmptyState';

export default function UsersDirectory() {
  return (
    <EmptyState
      title="Users"
      message="Phase 2 (admin) will wire this to GET /api/v1/auth/users."
    />
  );
}
