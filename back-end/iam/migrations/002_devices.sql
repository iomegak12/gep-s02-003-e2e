-- Devices table: stores per-user push notification tokens (FCM today, APNs later).
-- A given token is unique globally; if a device re-installs the app and the
-- token is re-issued to a different user, we re-bind it via ON CONFLICT.

CREATE TABLE IF NOT EXISTS devices (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token         VARCHAR(512) UNIQUE NOT NULL,
  platform      VARCHAR(16) NOT NULL CHECK (platform IN ('android', 'ios', 'web')),
  app_version   VARCHAR(32),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_devices_user ON devices (user_id);
CREATE INDEX IF NOT EXISTS idx_devices_last_seen ON devices (last_seen_at);
