# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start dev server with Turbopack
npm run build     # Production build
npm run lint      # Run ESLint
npm run test      # Unit tests (Vitest)
npm run test:rls  # RLS policy verification against local DB (requires supabase local running)
npm run clean     # Remove .next, node_modules, package-lock.json
npm run debug     # Start dev server with Node.js inspector
```

No test framework is configured.

## Architecture

**Next.js 15 App Router** with TypeScript, Tailwind CSS, and Supabase (PostgreSQL).

The app tracks household income and expenses with a Japanese-language UI.

### Directory Layout

```
app/
  page.js                  # Home (boilerplate nav links)
  layout.js                # Root layout (fonts, metadata)
  income/page.tsx          # Income management UI (client component)
  expense/page.tsx         # Expense management UI (client component)
  api/income/route.ts      # Income CRUD API
  api/expense/route.ts     # Expense CRUD API
src/
  components/
    Modal.tsx              # Generic modal wrapper
    EditEntryModal.tsx     # Shared edit form modal for income/expense
  lib/
    supabaseClient.js      # Browser client (anon key)
    supabaseAdmin.js       # Server-side client (service role key — API routes only)
    ui/readApiError.ts     # Parses structured API error responses
    validation/            # Zod schemas (common.ts, income.ts, expense.ts, index.ts)
  types/
    database.types.ts      # Auto-generated Supabase types
supabase/migrations/       # SQL migration files
```

### Data Flow

Pages are client components (`'use client'`) that fetch from the internal API routes via `fetch()` with `cache: 'no-store'`. API routes use `supabaseAdmin` (service role) and validate all incoming data with Zod before touching the database.

### API Conventions

- Full CRUD on both `/api/income` and `/api/expense`
- GET supports query params for filtering and pagination
- Validation failures return `{ error: 'validation_error', issues: [...] }` — use `readApiError` in the UI to parse these
- All amounts are stored as `bigint` (Japanese yen, no decimals)

### Database

Two tables with identical structure (`income`, `expense`): `id`, `source`, `amount`, `created_at`, `updated_at`. RLS is enabled — anonymous users get SELECT only; authenticated users get full CRUD. `updated_at` is maintained by a trigger.

### Key Conventions

- Path alias `@/*` maps to `./src/*`
- New pages/components should be TypeScript (`.tsx`/`.ts`); existing `.js` files can be left as-is
- Zod schemas live in `src/lib/validation/` and are the single source of truth for request shape — add new schemas there and re-export from `index.ts`
- UI text and code comments are in Japanese
- Dark theme throughout (`bg-gray-900`/`bg-gray-800`, white text)
- Per-page local state via `useState`/`useEffect`; no global state management
