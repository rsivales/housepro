# HousePro — Build Plan

> **Note:** The repository was empty when work started (no `PLAN.md` existed).
> This file was created to capture the roadmap so we can advance
> **milestone by milestone**. Milestones 2+ are a proposed direction —
> adjust them as priorities become clearer.

HousePro is a platform that connects homeowners with trusted home-service
professionals and keeps every job on track, from first quote to final sign-off.

## Tech stack

- **Framework:** Next.js 15 (App Router, RSC) + TypeScript
- **Styling:** Tailwind CSS v4 + shadcn/ui (new-york, Radix primitives)
- **Motion:** framer-motion
- **Backend:** Supabase (Postgres, Auth, Storage) via `@supabase/ssr`
- **Package manager:** pnpm

---

## Milestone 1 — Scaffold & design system ✅

- [x] Next.js 15 + TypeScript + Tailwind v4 + ESLint (App Router, `src/`, `@/*` alias)
- [x] shadcn/ui set up for Tailwind v4 (`components.json`, `cn()` helper, core primitives: button, card, input, label, badge, separator)
- [x] framer-motion + reusable `FadeIn` reveal helper
- [x] Supabase integration: browser client, server client, session middleware, env validation, `.env.example`
- [x] HousePro design system: brand tokens (teal primary + amber accent), light/dark themes, `next-themes` provider + mode toggle, logo/wordmark
- [x] Demo landing page showcasing the system; production build green

## Milestone 2 — Authentication (proposed)

- [ ] Supabase Auth: email/password + OAuth (Google)
- [ ] Sign-up / sign-in / sign-out flows and forms
- [ ] Protected routes via middleware; `getUser()` helpers
- [ ] Basic account/profile page

## Milestone 3 — Data model & database (proposed)

- [ ] Schema: users, professionals, services, jobs, bookings, reviews
- [ ] Row Level Security policies
- [ ] Supabase migrations + typed database client (generated types)

## Milestone 4 — Marketplace (proposed)

- [ ] Browse / search / filter professionals
- [ ] Professional profile pages with services & reviews

## Milestone 5 — Booking & scheduling (proposed)

- [ ] Request a quote / booking flow
- [ ] Availability & scheduling, reminders

## Milestone 6 — Payments (proposed)

- [ ] Escrow-style protected payments (release on sign-off)

## Milestone 7 — Dashboards (proposed)

- [ ] Homeowner dashboard (jobs, bookings, payments)
- [ ] Professional dashboard (leads, schedule, earnings)

## Milestone 8 — Notifications & polish (proposed)

- [ ] Email/push notifications, activity feed, final polish

---

## Running locally

```bash
pnpm install
cp .env.example .env.local   # fill in your Supabase project values
pnpm dev
```

Open <http://localhost:3000>.
