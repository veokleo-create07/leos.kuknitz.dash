# Leo’s Juice & Burger — Staff dashboard

Staff dashboard for the restaurant’s existing Supabase reservation system. It keeps the current shared-password authentication and uses server-only database access after the protected dashboard session is validated.

## Local setup

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env.local`.
3. Set `STAFF_SHARED_PASSWORD`, `SUPABASE_URL`, and `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`.
4. Run `npm run dev` and open http://localhost:3000.

Use the existing project URL and its service-role key from the Supabase project settings. Keep the service-role key on the server only. Do not use a `NEXT_PUBLIC_` prefix, commit `.env.local`, or paste the key into chat.

## Database migrations

The existing dashboard migrations are in `supabase/migrations/`. Do not rerun an old migration unless you have checked its effects in the target project. The dashboard uses the existing reservations table and does not require an Inbox or inquiry migration.

The manual reservation form accepts any positive party size and leaves phone and email optional. To enable those staff inputs in production, review and run `supabase/migrations/20261030000000_staff_optional_contacts_large_parties.sql` in the Supabase SQL Editor. It updates only the existing staff RPCs and helper, retains the reservation capacity and business-hours checks, and leaves the public booking RPC's 1–10 party-size limit in place. The migration is not applied automatically by the dashboard.

The dashboard reads through protected App Router server endpoints. Requests are checked by the existing shared-password session middleware before the service-role key is used. RLS remains enabled and browser roles have no table access. The service-role credential bypasses RLS, so it must remain server-side and dashboard API routes must stay behind the middleware.

## Checks

Run `npm run lint`, `npm run typecheck`, and `npm run build`.
