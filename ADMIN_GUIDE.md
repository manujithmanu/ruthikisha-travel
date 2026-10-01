# Admin guide

The admin interface is at `/admin`; it uses a separate sign-in screen and an HTTP-only session cookie. The initial super-admin is created by the one-time seed command in [PRODUCTION_SETUP.md](PRODUCTION_SETUP.md). Change its temporary password at first sign-in. Password changes are required before using the dashboard.

## Roles

- **SUPER_ADMIN** manages admin accounts and all operations.
- **ADMIN** manages catalog, schedules, bookings, customers, payments, reports, and settings.
- **BOOKING_STAFF** can view schedules, bookings, customers, and the dashboard.

The API enforces these permissions independently of the interface.

## Catalog and schedules

Create buses with their fleet number, registration, type, seat count, amenities, and a local JPEG/PNG/WebP photo (maximum 5 MB). Use **Seats** to choose a bus, configure its rows, columns, aisle, seat IDs, seat class, and active state, then save the plan. Saving updates that bus and its schedule seat inventory while preserving historical reservation rows. Create directed routes with stops and duration. Add either a date-specific schedule or a recurring service with a date range and weekdays; the schedule form can apply the service to every day. Use the table actions to update basic details or activate/deactivate records.

Fares, fees, and tax values belong to the schedule. Customer search reads current values from the API. A bus that has been used by a schedule is deactivated instead of deleted.

## Bookings and payments

Unpaid pending bookings can be cancelled from the bookings table or by the customer from My Bookings. Paid bookings require the Refund action on the matching payment; it calls Razorpay and updates payment, booking, and seat status. Never mark a payment as paid manually. A captured payment is verified by the API using Razorpay's signature and fetched gateway state. If payment arrives after its seat hold expires, the API cancels the booking and requests a gateway refund.

Seat reservations expire according to `SEAT_LOCK_MINUTES`. The database uniqueness constraint and transaction locks prevent two bookings from claiming the same schedule, date, and seat.

## Content and support

Edit website settings as JSON key/value entries. Each value must be valid JSON; use a quoted string such as `"Your new headline"` for text. `home.heroTitle`, `home.heroSubtitle`, `about.story`, `contact.phone`, `contact.email`, `contact.address`, and `contact.supportHours` are displayed on the public website. New notes submitted through Contact are stored in PostgreSQL and visible in the Contact Messages section. Bus images uploaded through the bus form are stored in the persistent uploads volume. Reports can be filtered by date and exported to CSV. Changes are audited with admin ID, action, entity, and request IP.

The dashboard includes daily booking and revenue totals, pending and cancelled counts, popular routes, recent bookings, and upcoming trips. Reports include date filters, route and bus revenue, payment status, occupancy, and CSV export. Website Content controls homepage copy, featured routes and buses, contact details, policies, and the cancellation cutoff (0–720 hours before departure; default 24). The Media section lists uploads, and Audit Logs shows recent admin actions. Tickets include a QR containing only the booking reference and can be printed or saved as PDF from the browser print dialog. Paid cancellation requests require staff review; processing a refund through the Payments section calls Razorpay, and the booking changes to refunded only after the gateway confirms it. Review catalog content, price rules, refund policy, and business information before enabling customer sales.
