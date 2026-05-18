CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email           VARCHAR(255) UNIQUE NOT NULL,
  full_name       VARCHAR(200) NOT NULL,
  password_hash   VARCHAR(255) NOT NULL,
  roles           TEXT[] NOT NULL,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  approval_limit  NUMERIC(15,2),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
