import React from 'react';
import EmptyState from '../../src/components/EmptyState';

export default function Notifications() {
  return (
    <EmptyState
      icon="🔔"
      title="No notifications yet"
      message="Push notifications via FCM arrive in Phase 4. Approval requests, status changes, and health alerts will surface here."
    />
  );
}
