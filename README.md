# Leo's Juice & Burger — Staff dashboard

A responsive staff dashboard prototype for managing daily reservations, guest inquiries, and service analytics.

## Run locally

Install dependencies with npm install, then start the development server with npm run dev.

Open http://localhost:3000.

## Stack

- Next.js App Router, React, and TypeScript
- Tailwind CSS 4 with a small custom design system
- Lucide icons and Recharts

## Prototype data

Mock reservations and inquiries are kept in lib/mock-data.ts, with shared data types in lib/types.ts. Dashboard changes are saved in browser local storage. This provides a replaceable seam for a future Supabase data-access layer; there is no authentication, production API, or backend in this phase.
