CREATE TABLE IF NOT EXISTS roles (
  name text PRIMARY KEY CHECK (name IN ('SUPER_ADMIN','ADMIN','BOOKING_STAFF')),
  description text NOT NULL
);
INSERT INTO roles(name, description) VALUES
  ('SUPER_ADMIN','Full access including administrator accounts'),
  ('ADMIN','Business operations and settings'),
  ('BOOKING_STAFF','Read-only booking and schedule access')
ON CONFLICT(name) DO NOTHING;
ALTER TABLE admin_users ADD CONSTRAINT admin_users_role_fk
  FOREIGN KEY (role) REFERENCES roles(name) NOT VALID;
ALTER TABLE admin_users VALIDATE CONSTRAINT admin_users_role_fk;

CREATE TABLE IF NOT EXISTS route_stops (
  id bigserial PRIMARY KEY,
  route_id uuid NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
  stop_order integer NOT NULL CHECK (stop_order >= 0),
  stop_name text NOT NULL CHECK (length(trim(stop_name)) BETWEEN 1 AND 120),
  UNIQUE(route_id, stop_order)
);
INSERT INTO route_stops(route_id, stop_order, stop_name)
SELECT r.id, (entry.ordinality - 1)::int, trim(entry.stop)
FROM routes r
CROSS JOIN LATERAL jsonb_array_elements_text(r.stops) WITH ORDINALITY AS entry(stop, ordinality)
WHERE trim(entry.stop) <> ''
ON CONFLICT(route_id, stop_order) DO NOTHING;
CREATE OR REPLACE FUNCTION sync_route_stop_rows() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  DELETE FROM route_stops WHERE route_id = NEW.id;
  INSERT INTO route_stops(route_id, stop_order, stop_name)
  SELECT NEW.id, (entry.ordinality - 1)::int, trim(entry.stop)
  FROM jsonb_array_elements_text(NEW.stops) WITH ORDINALITY AS entry(stop, ordinality)
  WHERE trim(entry.stop) <> '';
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS routes_sync_stop_rows ON routes;
CREATE TRIGGER routes_sync_stop_rows AFTER INSERT OR UPDATE OF stops ON routes
  FOR EACH ROW EXECUTE FUNCTION sync_route_stop_rows();

CREATE TABLE IF NOT EXISTS refunds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id uuid NOT NULL REFERENCES payments(id) ON DELETE RESTRICT,
  gateway_refund_id text UNIQUE,
  amount numeric(10,2) NOT NULL CHECK (amount > 0),
  status text NOT NULL CHECK (status IN ('PENDING','PROCESSED','FAILED')) DEFAULT 'PENDING',
  reason text,
  gateway_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS refunds_payment_created_idx ON refunds(payment_id, created_at DESC);

CREATE INDEX IF NOT EXISTS seat_reservations_expiry_idx
  ON seat_reservations(expires_at) WHERE state='LOCKED';

ALTER TABLE payment_webhook_events
  ADD COLUMN IF NOT EXISTS attempts integer NOT NULL DEFAULT 0;
