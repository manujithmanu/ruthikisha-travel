# Ruthikisha Travel deployment foundation

The project keeps its current Vite customer site and adds an Express API under `backend/`. PostgreSQL is the source of truth for buses, routes, schedules, seats, customers, reservations, payments and bookings. The admin dashboard is served at `/admin`.

## Local setup

1. Copy `.env.example` to `.env` and replace every `replace_...` value with a unique secret. Keep `.env` out of version control.
2. Ensure Docker and Docker Compose are installed, and that ports 80 and 443 are available on the Linux host.
3. Set `DOMAIN=manujithdev.shop`, point that domain's A/AAAA records at the host, then run `docker compose up --build -d`. The API applies migrations and does not create sample schedules on normal restarts.
4. For an initial install, set `SEED_ADMIN_EMAIL` and a one-time `SEED_ADMIN_PASSWORD` (16+ characters) in `.env`, then run `docker compose run --rm backend npm run seed` once. This creates the super admin and initial website content without inventing fleet or schedule records. Sign in at `https://manujithdev.shop/admin`, change the temporary password, and enter the real fleet and services before accepting bookings. `SEED_DEMO_DATA=true` is an optional local/demo-only fixture mode; keep it `false` in production.
5. Set the Razorpay key ID, secret and webhook secret in `.env`. Configure the Razorpay webhook URL as `https://manujithdev.shop/api/payments/webhook` and subscribe to `payment.captured`, `refund.processed`, and `refund.failed`. Until credentials are configured, checkout returns an explicit service-unavailable response; it never marks a booking paid.

For frontend-only development use `npm run dev`. Start the API separately from `backend/` with `npm install`, `npm run migrate`, `npm run seed`, and `npm run dev`; set `APP_URL=http://localhost:5173` and the database URL first. The Vite dev server should proxy `/api` to `http://localhost:4000` (see `vite.config.js`).

## Operations

PostgreSQL is private to the Compose network. Persistent volumes retain the database, uploads, and Caddy certificates. Take encrypted off-host backups regularly:

```sh
docker compose exec -T postgres pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" | gzip > "ruthikisha-$(date +%F).sql.gz"
```

Restore only into a verified target database:

```sh
gzip -dc ruthikisha-YYYY-MM-DD.sql.gz | docker compose exec -T postgres psql -U "$POSTGRES_USER" "$POSTGRES_DB"
```

Restrict backup files, test restore procedures before relying on them, and rotate database, JWT, admin and payment secrets through a controlled deployment. Check service logs with `docker compose logs -f backend caddy`; `GET /api/health` is the API liveness endpoint.

## API outline

- Public: `/api/meta`, `/api/content`, `/api/routes`, `/api/buses`, `/api/search`, `/api/schedules/:id`, `/api/schedules/:id/seats`, `/api/bookings`, `/api/contact`.
- Booking access uses an opaque per-booking token; the browser sends it as a bearer credential for booking details and payment actions. Seat holds are unique by schedule/date/seat in PostgreSQL and expire after `SEAT_LOCK_MINUTES`.
- Admin: `/api/auth/{login,logout,me,password}` and role-checked `/api/admin/{dashboard,buses,routes,schedules,bookings,customers,contact-messages,payments,reports,settings,admin-users}`. Mutations use validation, parameterized SQL and audit records.
- Payments: `/api/payments/order`, `/api/payments/verify`, plus the raw-body signed webhook. Only a verified captured gateway payment changes the booking to confirmed.

The operational foundation includes admin authentication and roles, bus/seat/route/schedule management, schedule pricing, media upload, customer bookings and seat holds, Razorpay verification/webhooks, payment refunds, QR-coded printable tickets, date-filtered reports with CSV export, editable homepage and policy content, contact-message management, and audit-log viewing. Migration `004_operational_integrity.sql` adds the roles catalog, normalized route stops, a refund ledger, and an expiry index. Configure a cancellation cutoff in Admin → Website Content; it defaults to 24 hours before departure. Paid cancellations are recorded as requests for staff review, and refunds are only reported after Razorpay confirms them.

Before public launch, exercise migrations, seed, search, concurrent seat contention, cancellation, refund, and webhook retry paths against PostgreSQL and a Razorpay test account. Verify a complete payment/refund cycle, check the company's real catalog, fares, policies and contact details, configure monitoring and production rate limits, and confirm backups can be restored. Customer email/SMS delivery and deployment-specific monitoring are not included in this application pass.
