CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE SEQUENCE IF NOT EXISTS booking_reference_seq START 1;

CREATE TABLE IF NOT EXISTS admin_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), email text NOT NULL UNIQUE, full_name text NOT NULL,
  password_hash text NOT NULL, role text NOT NULL CHECK (role IN ('SUPER_ADMIN','ADMIN','BOOKING_STAFF')),
  active boolean NOT NULL DEFAULT true, must_change_password boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), full_name text NOT NULL, phone text NOT NULL UNIQUE,
  email text, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS buses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL, bus_number text NOT NULL UNIQUE,
  registration_number text NOT NULL UNIQUE, type text NOT NULL, total_seats integer NOT NULL CHECK(total_seats BETWEEN 4 AND 100),
  seat_layout jsonb NOT NULL DEFAULT '{}'::jsonb, amenities jsonb NOT NULL DEFAULT '[]'::jsonb,
  photo_path text, active boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS bus_seats (
  bus_id uuid NOT NULL REFERENCES buses(id) ON DELETE CASCADE, seat_number text NOT NULL,
  seat_type text NOT NULL DEFAULT 'STANDARD', active boolean NOT NULL DEFAULT true,
  PRIMARY KEY(bus_id, seat_number)
);
CREATE TABLE IF NOT EXISTS routes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), from_city text NOT NULL, to_city text NOT NULL,
  route_name text NOT NULL, stops jsonb NOT NULL DEFAULT '[]'::jsonb, distance_km numeric(7,1),
  estimated_duration_minutes integer NOT NULL CHECK(estimated_duration_minutes > 0), active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(from_city, to_city)
);
CREATE TABLE IF NOT EXISTS schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), bus_id uuid NOT NULL REFERENCES buses(id) ON DELETE RESTRICT,
  route_id uuid NOT NULL REFERENCES routes(id) ON DELETE RESTRICT, service_date date,
  starts_on date, ends_on date, days_of_week smallint[] NOT NULL DEFAULT '{}',
  departure_time time NOT NULL, arrival_time time NOT NULL, duration_minutes integer NOT NULL,
  base_price numeric(10,2) NOT NULL CHECK(base_price >= 0), convenience_fee numeric(10,2) NOT NULL DEFAULT 25,
  tax_percent numeric(5,2) NOT NULL DEFAULT 0, active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (service_date IS NOT NULL OR (starts_on IS NOT NULL AND ends_on IS NOT NULL AND cardinality(days_of_week)>0))
);
CREATE TABLE IF NOT EXISTS schedule_seats (
  schedule_id uuid NOT NULL REFERENCES schedules(id) ON DELETE CASCADE, seat_number text NOT NULL,
  seat_type text NOT NULL DEFAULT 'STANDARD', active boolean NOT NULL DEFAULT true,
  PRIMARY KEY(schedule_id, seat_number)
);
CREATE TABLE IF NOT EXISTS bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), reference text NOT NULL UNIQUE,
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  schedule_id uuid NOT NULL REFERENCES schedules(id) ON DELETE RESTRICT, travel_date date NOT NULL,
  status text NOT NULL CHECK(status IN ('PENDING','CONFIRMED','CANCELLED','COMPLETED','NO_SHOW')) DEFAULT 'PENDING',
  payment_status text NOT NULL CHECK(payment_status IN ('PENDING','PAID','FAILED','REFUNDED','PARTIALLY_REFUNDED')) DEFAULT 'PENDING',
  subtotal numeric(10,2) NOT NULL, fee numeric(10,2) NOT NULL, tax numeric(10,2) NOT NULL, total numeric(10,2) NOT NULL,
  access_token_hash text NOT NULL, cancellation_reason text, cancelled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS booking_passengers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), booking_id uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  full_name text NOT NULL, age integer CHECK(age BETWEEN 1 AND 120), gender text CHECK(gender IN ('FEMALE','MALE','OTHER','PREFER_NOT_TO_SAY')),
  phone text, email text, emergency_contact text, seat_number text NOT NULL
);
CREATE TABLE IF NOT EXISTS seat_reservations (
  schedule_id uuid NOT NULL, travel_date date NOT NULL, seat_number text NOT NULL,
  booking_id uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  state text NOT NULL CHECK(state IN ('LOCKED','CONFIRMED','RELEASED')),
  expires_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(schedule_id, travel_date, seat_number),
  FOREIGN KEY(schedule_id, seat_number) REFERENCES schedule_seats(schedule_id, seat_number) ON DELETE RESTRICT
);
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), booking_id uuid NOT NULL REFERENCES bookings(id) ON DELETE RESTRICT,
  gateway text NOT NULL DEFAULT 'RAZORPAY', gateway_order_id text UNIQUE, gateway_payment_id text UNIQUE,
  amount numeric(10,2) NOT NULL, status text NOT NULL CHECK(status IN ('PENDING','PAID','FAILED','REFUNDED','PARTIALLY_REFUNDED')) DEFAULT 'PENDING',
  refund_status text, gateway_payload jsonb NOT NULL DEFAULT '{}'::jsonb, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS website_settings (
  key text PRIMARY KEY, value jsonb NOT NULL, updated_by uuid REFERENCES admin_users(id) ON DELETE SET NULL, updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), path text NOT NULL UNIQUE, original_name text NOT NULL,
  content_type text NOT NULL, byte_size integer NOT NULL CHECK(byte_size > 0), uploaded_by uuid REFERENCES admin_users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS audit_logs (
  id bigserial PRIMARY KEY, admin_id uuid REFERENCES admin_users(id) ON DELETE SET NULL,
  action text NOT NULL, entity text NOT NULL, entity_id text, ip_address inet, details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS schedules_route_date_idx ON schedules(route_id, service_date, starts_on, ends_on) WHERE active=true;
CREATE INDEX IF NOT EXISTS bookings_schedule_date_idx ON bookings(schedule_id, travel_date, status);
CREATE INDEX IF NOT EXISTS bookings_customer_idx ON bookings(customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS payments_status_created_idx ON payments(status, created_at DESC);
CREATE INDEX IF NOT EXISTS audit_logs_created_idx ON audit_logs(created_at DESC);
