# Leo’s Juice & Burger — Staff dashboard

Staff dashboard for the restaurant’s existing Supabase reservation system. It keeps the current shared-password authentication and uses server-only database access after the protected dashboard session is validated.

## Local setup

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env.local`.
3. Set `STAFF_SHARED_PASSWORD`, `SUPABASE_URL`, and `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`.
4. Run `npm run dev` and open http://localhost:3000.

Use the existing project URL and its service-role key from the Supabase project settings. Keep the service-role key on the server only. Do not use a `NEXT_PUBLIC_` prefix, commit `.env.local`, or paste the key into chat.

## Database migration

Run `supabase/migrations/20261029000000_staff_dashboard.sql` once in the Supabase SQL Editor. It adds dashboard metadata to the existing `reservations` and `reservation_inquiries` tables and creates server-only booking/update/conversion RPCs. It does not recreate either table or change the public website booking RPC.

The existing website creates confirmed reservations through `create_reservation`. Staff creation and inquiry conversion use that same RPC, preserving its time, capacity, and party-size validation. `reservation_inquiries` already exists and its website submissions remain valid without preferred date/time or party size. Inquiry status maps to the existing database values: `new`, `contacted`, and `closed`.

The dashboard reads through protected App Router server endpoints. Requests are checked by the existing shared-password session middleware before the service-role key is used. RLS remains enabled and browser roles have no table access. The service-role credential bypasses RLS, so it must remain server-side and dashboard API routes must stay behind the middleware.

## Checks

Run `npm run lint`, `npm run typecheck`, and `npm run build`.
