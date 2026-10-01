# Ruthikisha Travel

Premium React + Vite customer site with an Express REST API, PostgreSQL, protected admin dashboard, live seat reservations, and Razorpay verification.

## Development

- Install frontend dependencies with `npm install`, then run `npm run dev`.
- Vite proxies `/api` to `http://localhost:4000`; start the backend separately with `npm install --prefix backend` and `npm run api:dev`.
- Configure a PostgreSQL `DATABASE_URL`, a `JWT_SECRET` with at least 32 characters, and `APP_URL`; apply the schema with `npm run api:migrate` and create the initial catalog/admin with `npm run api:seed`.
- Run `npm run lint` and `npm run build` for the frontend checks.

## Deployment and operations

See [PRODUCTION_SETUP.md](PRODUCTION_SETUP.md) for Docker Compose, HTTPS at `manujithdev.shop`, one-time seeding, Razorpay setup, and database backups. See [ADMIN_GUIDE.md](ADMIN_GUIDE.md) for roles and operations.

No production credentials are stored in this repository. Copy `.env.example`, generate unique secrets, and replace the initial sample catalog with the operator's approved fleet and schedules before selling tickets.
