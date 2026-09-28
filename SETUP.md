# 🚀 Setup Instructions for Realty Platform (Supabase)

## Step 1: Install Supabase CLI

```bash
# macOS
brew install supabase/tap/supabase

# Linux
brew install supabase/tap/supabase

# Or download from: https://github.com/supabase/cli/releases
```

Verify installation:
```bash
supabase --version
```

## Step 2: Initialize Git Repository

```bash
cd /Users/valeriariveroaguirre/Realty
git init
git add .
git commit -m "Initial commit: Project scaffolding with monorepo + Supabase"
```

## Step 3: Install Dependencies

```bash
# Using pnpm (recommended)
pnpm install

# Or using npm
npm install
```

## Step 4: Start Supabase Locally

```bash
# This starts PostgreSQL + Auth + Real-time + API (all local)
supabase start

# It will output credentials like:
# API URL: http://localhost:54321
# anon key: eyJhbGciOi...
# service_role key: eyJhbGciOi...
# DB URL: postgresql://postgres:postgres@localhost:54322/postgres
```

Copy the credentials to `.env.local`:
```bash
cp .env.example .env.local

# Edit .env.local and paste the values from supabase start output:
# NEXT_PUBLIC_SUPABASE_URL="http://localhost:54321"
# NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOi..."
# SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOi..."
# DATABASE_URL="postgresql://postgres:postgres@localhost:54322/postgres"
```

## Step 5: Setup Database Schema

```bash
# Push Prisma schema to Supabase
pnpm db:push

# Verify with Prisma Studio
pnpm db:studio
```

This opens http://localhost:5555 where you can inspect your database.

## Step 5: Start Development Servers

```bash
pnpm dev

# This starts:
# - Frontend: http://localhost:5173
# - Backend API: http://localhost:3000
```

Open your browser and visit:
- Frontend: http://localhost:5173
- API Health Check: http://localhost:3000 (should show a welcome page)

## Step 6: Verify Everything Works

### Test Backend API:
```bash
curl http://localhost:3000/api/properties
```

Should return:
```json
{
  "success": true,
  "data": [],
  "meta": { "page": 1, "pageSize": 10, "total": 0 }
}
```

## 📁 Project Structure

```
realty/
├── packages/
│   ├── frontend/        # React app
│   ├── backend/         # Next.js API
│   └── shared/          # Shared types
├── prisma/
│   └── schema.prisma    # Database schema
├── .env.example         # Environment template
├── docker-compose.yml   # Local dev stack
└── README.md            # Documentation
```

## 🔑 Environment Variables

Key variables in `.env.local`:

```
DATABASE_URL=postgresql://realty_user:realty_password@localhost:5432/realty_dev
REDIS_URL=redis://localhost:6379
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:5173
NODE_ENV=development
```

## 📚 Useful Commands

```bash
# Supabase
supabase start              # Start Supabase locally
supabase stop               # Stop Supabase
supabase status             # Check status
supabase link               # Link to Supabase cloud project
supabase db push            # Push schema to production

# Development
pnpm dev                    # Start all servers (frontend + backend)
pnpm build                  # Build all packages
pnpm lint                   # Lint code

# Database
pnpm db:studio              # Open Prisma Studio (inspect DB)
pnpm db:push                # Apply schema changes to Supabase
pnpm db:migrate             # Create new migration

# Frontend only
pnpm --filter @realty/frontend dev

# Backend only
pnpm --filter @realty/backend dev
```

## ⚠️ Troubleshooting

### Supabase not starting
```bash
# Check if Docker daemon is running (Supabase uses Docker)
docker info

# If Docker isn't installed, install it:
# https://www.docker.com/products/docker-desktop

# Try again
supabase start
```

### Database connection error
```bash
# Check Supabase status
supabase status

# See the DATABASE_URL in output
# Copy it to .env.local
```

### Prisma error after schema change
```bash
# Regenerate Prisma client
pnpm --filter @realty/backend exec prisma generate

# Then push changes
pnpm db:push
```

### Wrong Supabase credentials
```bash
# Run supabase start again and copy new credentials:
supabase stop
supabase start

# Update .env.local with new values
```

## 🎯 Next Development Steps

1. **Phase 1 - MVP**
   - [ ] Auth system (Supabase)
   - [ ] Property CRUD operations
   - [ ] Advisor profiles
   - [ ] Basic matching algorithm
   - [ ] Property search/filter

2. **Phase 2 - Scaling**
   - [ ] Real-time notifications
   - [ ] Image upload (AWS S3)
   - [ ] Payment integration
   - [ ] Background jobs
   - [ ] Advanced matching

3. **Phase 3 - Mobile**
   - [ ] React Native app (Expo)
   - [ ] Push notifications
   - [ ] Offline support

## 📖 Documentation

- Database Schema: See `prisma/schema.prisma`
- Types: See `packages/shared/src/types/index.ts`
- API Example: See `packages/backend/src/app/api/properties/route.ts`
- Project Guidelines: See `.claude/CLAUDE.md`

## 🆘 Need Help?

- Check the main README.md
- Review the schema.prisma for data structure
- Look at example API routes for patterns
- Check Prisma docs: https://www.prisma.io/docs/

---

**Good luck! 🎉**
