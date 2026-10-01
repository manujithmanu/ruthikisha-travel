ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS cancellation_requested_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancellation_request_reason text,
  ADD COLUMN IF NOT EXISTS cancellation_request_status text NOT NULL DEFAULT 'NONE'
    CHECK (cancellation_request_status IN ('NONE','REQUESTED','APPROVED','REJECTED'));

CREATE INDEX IF NOT EXISTS bookings_cancellation_requests_idx
  ON bookings(cancellation_requested_at DESC)
  WHERE cancellation_request_status = 'REQUESTED';

CREATE TABLE IF NOT EXISTS payment_webhook_events (
  event_id text PRIMARY KEY,
  event_type text NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  status text NOT NULL DEFAULT 'RECEIVED' CHECK (status IN ('RECEIVED','PROCESSED','IGNORED','FAILED')),
  error_message text
);

CREATE INDEX IF NOT EXISTS payment_webhook_events_received_idx
  ON payment_webhook_events(received_at DESC);
