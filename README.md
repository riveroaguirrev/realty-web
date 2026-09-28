# 🏘️ Realty Platform

Platform for real estate agencies with centralized property management, advisor networking, and intelligent matching system.

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18 + TypeScript + Vite + Tailwind |
| **State Management** | TanStack Query + Zustand |
| **Backend** | Next.js 14 + Node.js + Prisma |
| **Database** | Supabase (PostgreSQL) |
| **Auth** | Supabase Auth (built-in) |
| **Real-time** | Supabase Real-time subscriptions |
| **Background Jobs** | BullMQ + Redis |
| **Hosting** | Vercel (frontend + backend) + Supabase Cloud |

## 📋 Project Structure

```
realty/
├── packages/
│   ├── frontend/          # React + Vite SPA
│   │   ├── src/
│   │   │   ├── components/    # Reusable React components
│   │   │   ├── pages/         # Page components
│   │   │   ├── hooks/         # Custom React hooks
│   │   │   ├── stores/        # Zustand state management
│   │   │   ├── services/      # API client services
│   │   │   ├── types/         # TypeScript types
│   │   │   └── utils/         # Utility functions
│   │   ├── vite.config.ts
│   │   ├── tailwind.config.js
│   │   └── tsconfig.json
│   │
│   ├── backend/           # Next.js API + Prisma
│   │   ├── src/
│   │   │   ├── app/            # App directory routes
│   │   │   ├── api/            # API endpoints
│   │   │   │   ├── properties/
│   │   │   │   ├── requirements/
│   │   │   │   ├── matches/
│   │   │   │   ├── advisors/
│   │   │   │   └── organizations/
│   │   │   ├── lib/            # Library utilities
│   │   │   ├── services/       # Business logic
│   │   │   ├── jobs/           # Background jobs (BullMQ)
│   │   │   ├── middleware/     # Next.js middleware
│   │   │   └── utils/          # Utility functions
│   │   ├── next.config.js
│   │   ├── tsconfig.json
│   │   └── prisma/
│   │
│   └── shared/            # Shared types & utilities
│       └── src/
│           └── types/     # Shared TypeScript types
│
├── prisma/
│   ├── schema.prisma      # Database schema
│   └── migrations/        # Migration files
│
├── .env.example           # Environment variables template
├── package.json           # Root monorepo
├── turbo.json             # Turbo build configuration
└── docker-compose.yml     # Local development stack
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Supabase CLI (`brew install supabase/tap/supabase`)
- Docker (required by Supabase CLI)
- pnpm or npm

### Setup

1. **Install dependencies:**
```bash
pnpm install
```

2. **Start Supabase locally:**
```bash
supabase start
# Outputs DATABASE_URL, API URL, and auth keys
```

3. **Configure environment variables:**
```bash
cp .env.example .env.local
# Copy the credentials from supabase start output
```

4. **Setup database schema:**
```bash
pnpm db:push                    # Push Prisma schema to Supabase
pnpm db:studio                  # Inspect database (optional)
```

5. **Start development servers:**
```bash
pnpm dev                        # Runs frontend (5173) and backend (3000)
```

6. **Open in browser:**
- **Frontend**: http://localhost:5173
- **API**: http://localhost:3000
- **Supabase Dashboard**: http://localhost:54323 (if running Supabase locally)
- **Prisma Studio**: `pnpm db:studio`

## 📊 Database Schema

### Core Entities

- **Organization**: Real estate offices/agencies
- **Advisor**: Real estate agents (part of org or independent)
- **Property**: Real estate listings
- **Requirement**: Buyer/seeker search criteria
- **Match**: Suggestions matching requirements to properties
- **Commission**: Commission structure per organization

See [prisma/schema.prisma](./prisma/schema.prisma) for complete schema.

## 🎯 Key Features

### Phase 1 (MVP)
- [ ] Admin dashboard for organizations
- [ ] Property listing and management
- [ ] Advisor profiles and authentication
- [ ] Basic matching system
- [ ] Simple notifications

### Phase 2 (Scaling)
- [ ] Advanced matching algorithm with scoring
- [ ] Real-time notifications
- [ ] Payment integration (Stripe)
- [ ] Email notifications (SendGrid)
- [ ] Image upload (AWS S3)

### Phase 3 (Advanced)
- [ ] Mobile app (React Native/Expo)
- [ ] Analytics dashboard
- [ ] Commission tracking
- [ ] Multi-language support
- [ ] Video tours integration

## 📝 API Endpoints (Coming Soon)

### Properties
- `GET /api/properties` - List all properties
- `POST /api/properties` - Create property
- `GET /api/properties/:id` - Get property details
- `PATCH /api/properties/:id` - Update property
- `DELETE /api/properties/:id` - Delete property

### Requirements
- `GET /api/requirements` - List requirements
- `POST /api/requirements` - Create requirement
- `GET /api/requirements/:id` - Get requirement
- `PATCH /api/requirements/:id` - Update requirement

### Matches
- `GET /api/matches` - List matches
- `POST /api/matches/generate` - Generate matches for requirement
- `PATCH /api/matches/:id` - Update match status

### Advisors
- `GET /api/advisors` - List advisors
- `POST /api/advisors` - Register advisor
- `GET /api/advisors/:id` - Get advisor profile

## 🔐 Security

- Row-level security (RLS) policies in PostgreSQL
- JWT-based authentication
- Input validation with Zod
- CORS configuration
- Environment variable isolation

## 📦 Scripts

```bash
# Development
pnpm dev                    # Run all dev servers
pnpm build                  # Build all packages
pnpm lint                   # Run ESLint
pnpm type-check             # TypeScript check

# Database
pnpm db:push                # Push schema changes
pnpm db:migrate             # Create migration
pnpm db:studio              # Open Prisma Studio

# Frontend only
pnpm --filter @realty/frontend dev
pnpm --filter @realty/frontend build

# Backend only
pnpm --filter @realty/backend dev
pnpm --filter @realty/backend build
```

## 🐳 Docker Setup (Optional)

```bash
docker-compose up -d        # Start PostgreSQL + Redis
docker-compose down         # Stop services
```

## 📚 Documentation

- [Architecture Overview](./docs/ARCHITECTURE.md) - Coming soon
- [API Documentation](./docs/API.md) - Coming soon
- [Database Schema](./prisma/schema.prisma)

## 🤝 Contributing

1. Create feature branch: `git checkout -b feat/your-feature`
2. Follow the [Global Engineering Rules](./.claude/CLAUDE.md)
3. Write tests for new features
4. Submit pull request

## 📄 License

MIT

## 👤 Author

Created with ❤️ for real estate professionals.
