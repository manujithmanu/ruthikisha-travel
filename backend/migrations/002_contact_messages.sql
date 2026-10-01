CREATE TABLE IF NOT EXISTS contact_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL CHECK(length(full_name) BETWEEN 2 AND 120),
  email text NOT NULL CHECK(length(email) <= 254),
  message text NOT NULL CHECK(length(message) BETWEEN 10 AND 5000),
  status text NOT NULL DEFAULT 'NEW' CHECK(status IN ('NEW','READ','RESPONDED')),
  ip_address inet,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS contact_messages_created_idx ON contact_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS contact_messages_status_idx ON contact_messages(status,created_at DESC);
