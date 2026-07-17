# HousePro

Home services, professionally managed — a platform connecting homeowners with
trusted professionals and keeping every job on track.

Built with **Next.js 15**, **TypeScript**, **Tailwind CSS v4**, **shadcn/ui**,
**framer-motion**, and **Supabase**.

## Getting started

```bash
pnpm install

# Configure Supabase (Dashboard → Project Settings → API)
cp .env.example .env.local

pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command      | Description                           |
| ------------ | ------------------------------------- |
| `pnpm dev`   | Start the dev server                  |
| `pnpm build` | Production build (also lints + types) |
| `pnpm start` | Serve the production build            |
| `pnpm lint`  | Run ESLint                            |

## Project structure

```
src/
├─ app/                 # App Router routes, layout, global styles
├─ components/
│  ├─ ui/               # shadcn/ui primitives (button, card, input, …)
│  ├─ brand/            # HousePro logo / wordmark
│  ├─ motion/           # framer-motion helpers (FadeIn)
│  ├─ theme-provider.tsx
│  └─ mode-toggle.tsx
├─ lib/
│  ├─ utils.ts          # cn() class merge helper
│  └─ supabase/         # browser + server clients, session middleware, env
└─ middleware.ts        # refreshes the Supabase auth session
```

## Design system

Brand tokens live in `src/app/globals.css` as semantic CSS variables
(shadcn convention) with full light/dark themes:

- **Primary** — HousePro teal
- **Accent** — warm amber (`brand-accent`, used for primary CTAs)
- Standard `secondary`, `muted`, `destructive`, `success`, `warning`, chart and
  sidebar tokens

See [`PLAN.md`](./PLAN.md) for the full roadmap.
