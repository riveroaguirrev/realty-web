# Realty Platform - Project Guidelines

This is an additional project-level CLAUDE.md that builds on the global guidelines.

## Architecture

This is a monorepo with three main packages:
- **Frontend**: React 18 SPA with Vite, served on port 5173
- **Backend**: Next.js API with Prisma ORM, served on port 3000
- **Shared**: TypeScript types used by both frontend and backend

## Database

- **Platform**: Supabase (PostgreSQL + Auth + Real-time)
- **ORM**: Prisma (backend type-safety)
- **Local Dev**: `supabase start` (includes PostgreSQL + Auth locally)
- **Production**: Supabase Cloud
- **Key files**: `prisma/schema.prisma` contains all schema definitions

## Development Workflow

1. **Start Supabase**: `supabase start` (runs local PostgreSQL + Auth)
2. **Configure env**: Copy credentials from `supabase start` output to `.env.local`
3. **Setup schema**: `pnpm db:push` (applies Prisma schema to Supabase)
4. **Run dev**: `pnpm dev` (starts frontend + backend)
5. **Inspect DB**: `pnpm db:studio` opens Prisma Studio
6. **Stop services**: `supabase stop`

## Key Principles for This Project

### API Design
- All API responses follow the `ApiResponse<T>` interface from `@shared/types`
- Endpoint should always return `{ success, data?, error?, meta? }`
- Pagination: use `page`, `pageSize` query params
- Always include proper status codes (200, 400, 404, 500)

### State Management
- Frontend: Use Zustand for global state, TanStack Query for server state
- Backend: Business logic in services, not in API routes

### Authentication
- **Supabase Auth** handles user registration, login, JWT tokens
- **Frontend**: Use `supabase.auth.signUp()` / `signIn()` / `signOut()`
- **Backend**: Extract JWT from Authorization header, verify with Supabase
- **Protected Routes**: Check token in middleware before accessing `/api/*`
- **See**: `packages/backend/src/lib/supabase.ts` and `packages/frontend/src/services/supabase.ts`

### Matching Algorithm (Phase 1 TODO)
- Location: exact city + region match
- Price: within buyer's range
- Property type: must be in buyer's preferences
- Features: bonus points for garage/garden/pool

### File Organization
```
packages/frontend/src/
  ├── components/   # Reusable React components
  ├── pages/        # Full-page components
  ├── hooks/        # Custom hooks (useProperties, useMatches, etc)
  ├── stores/       # Zustand stores (auth, ui, etc)
  ├── services/     # API client methods
  ├── types/        # Local TypeScript types
  └── utils/        # Helpers, formatters

packages/backend/src/
  ├── app/          # Next.js app directory (pages)
  ├── api/          # API route handlers
  ├── services/     # Business logic
  ├── lib/          # Utilities (prisma, auth, etc)
  ├── jobs/         # Background jobs (BullMQ)
  ├── middleware/   # Next.js middleware
  └── utils/        # Helpers
```

## Important Notes

- **Supabase required**: Install Supabase CLI (`brew install supabase/tap/supabase`)
- **Docker required**: Supabase CLI uses Docker under the hood
- **No hardcoded values**: All secrets in `.env.local` (never commit)
- **TypeScript strict mode**: No `any` types unless absolutely necessary
- **Prisma migrations**: Schema changes via `pnpm db:push` (Supabase handles migrations)
- **API versioning**: Start with `/api/v1/*` routes for future compatibility

## Setup Quick Reference

```bash
# First time setup
supabase start
cp .env.example .env.local
# Edit .env.local with values from supabase start output
pnpm install
pnpm db:push
pnpm dev

# Daily development
supabase start       # Morning
pnpm dev             # Start dev servers
supabase stop        # Evening
```

## Next Development Steps

1. ✅ **Project scaffolding** (done)
2. ⏳ **Authentication system** (Supabase Auth)
3. ⏳ **Property CRUD** (GET/POST/PUT/DELETE endpoints)
4. ⏳ **Advisor profiles**
5. ⏳ **Basic matching algorithm**
6. ⏳ **Search/filter** functionality
7. ⏳ **Real-time notifications** (Supabase subscriptions)
