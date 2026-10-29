# Leo’s Juice & Burger — Staff dashboard

A responsive staff dashboard prototype for managing daily reservations, guest inquiries, and service analytics.

## Run locally

Install dependencies with `npm install`, copy `.env.example` to `.env.local`, set `STAFF_SHARED_PASSWORD`, and run `npm run dev`. Open http://localhost:3000.

## Stack

- Next.js App Router, React, and TypeScript
- Tailwind CSS 4 with a small custom design system
- Lucide icons and Recharts

## Prototype data

Mock reservations and inquiries are kept in `lib/mock-data.ts`, with shared data types in `lib/types.ts`. Dashboard changes are saved in browser local storage. This provides a replaceable seam for a future Supabase reservation data layer.

## Staff password setup

The dashboard uses one shared password. It has no email accounts, registration page, or Supabase Auth dependency. Set `STAFF_SHARED_PASSWORD` in `.env.local` and in your hosting provider’s server environment. Do not prefix it with `NEXT_PUBLIC_`.

The password is checked and used to sign sessions on the server. Sign-in creates an HTTP-only, secure-in-production, same-site cookie with an eight-hour rolling expiry; active sessions refresh automatically on protected requests. Changing the password invalidates existing sessions. Use the deployment platform’s rate limiting/WAF on `/auth/login` to limit password guessing, and share the password privately with staff.

No SQL migration or Supabase project change is needed for staff access. The existing reservation and website data, policies, and booking functionality are untouched.
