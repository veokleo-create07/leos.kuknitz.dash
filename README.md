# Leo’s Juice & Burger — Staff dashboard

A responsive staff dashboard prototype for managing daily reservations, guest inquiries, and service analytics.

## Run locally

Install dependencies with `npm install`, copy `.env.example` to `.env.local`, configure the two server-only variables below, and run `npm run dev`. Open http://localhost:3000.

## Stack

- Next.js App Router, React, and TypeScript
- Tailwind CSS 4 with a small custom design system
- Lucide icons and Recharts

## Prototype data

Mock reservations and inquiries are kept in `lib/mock-data.ts`, with shared data types in `lib/types.ts`. Dashboard changes are saved in browser local storage. This provides a replaceable seam for a future Supabase reservation data layer.

## Staff password setup

The dashboard uses one shared password. It has no email accounts, registration page, or Supabase Auth dependency. Keep the password hash and session signing secret in the server environment only; do not prefix them with `NEXT_PUBLIC_`.

Required environment variables:

- `STAFF_SHARED_PASSWORD_HASH` — the scrypt hash of a long, unique password that you share directly with staff. Generate it in a terminal with `npm run hash-password`; enter the password at the hidden prompt, then copy the printed `STAFF_SHARED_PASSWORD_HASH=...` line into `.env.local` or your deployment secrets.
- `STAFF_SESSION_SECRET` — a random secret of at least 32 characters. Generate one with `openssl rand -base64 48`.

Set both in `.env.local` for local development and in the deployment platform’s server environment for production. Restart the app after changing them. Sign-in creates an HTTP-only, secure-in-production, same-site cookie with an eight-hour rolling expiry; active sessions refresh automatically on protected requests. Changing either value invalidates access or existing sessions. Use the deployment platform’s rate limiting/WAF on `/auth/login` to limit password guessing; keep the password private and rotate it when staff access changes.

No SQL migration or Supabase project change is needed for staff access. The existing reservation and website data, policies, and booking functionality are untouched.
