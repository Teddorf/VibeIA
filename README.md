# Vibe Coding Platform (VibeIA)

Ultra-granular prompts for enterprise-quality code generation.

## 🚀 Production URLs

| Service | URL | Status |
|---------|-----|--------|
| **Frontend** | https://frontend-delta-drab-99.vercel.app | ✅ Live |
| **Backend API** | https://vibeia.onrender.com | ✅ Live |
| **Database** | MongoDB Atlas | ✅ Connected |

### Quick Links
- **Login**: https://frontend-delta-drab-99.vercel.app/login
- **Register**: https://frontend-delta-drab-99.vercel.app/register
- **Dashboard**: https://frontend-delta-drab-99.vercel.app/dashboard

> **Note**: Backend on Render free tier sleeps after 15 min of inactivity. First request takes ~30 seconds to wake up.

## Overview

VibeIA is an AI-powered code generation platform that guides users through a 4-stage wizard to create ultra-granular prompts, orchestrates AI agents for code generation, enforces enterprise-quality gates, and manages manual tasks seamlessly.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 15, React 19, TypeScript, Tailwind CSS, shadcn/ui |
| Backend | NestJS 11, TypeScript, MongoDB, Mongoose |
| Auth | JWT (access + refresh tokens), Passport.js, bcrypt |
| Real-time | Socket.io (WebSocket gateway) |
| AI/LLM | Anthropic Claude, OpenAI GPT-4, Google Gemini |
| Git | Octokit (GitHub API) |
| Hosting | Vercel (Frontend), Render (Backend), MongoDB Atlas (DB) |

## Features

### The Wizard (4 Stages)

1. **Intent Declaration**: Project name and description
2. **Business Analysis**: 5 key questions about users, features, scale, integrations, auth
3. **Technical Analysis**: Archetype selection (JWT Auth, Session Auth, Notifications, Payments, File Upload) + Infrastructure recommendations
4. **Execution Preview**: Complete plan review with time estimates

### Execution Engine

- Phase-by-phase, task-by-task execution
- Real-time WebSocket updates
- Pause/Resume functionality
- Quality gates (lint, security, tests)
- Manual task detection with guided flow

### Infrastructure Recommendations

- Database selection (Neon, Supabase, PlanetScale, MongoDB Atlas)
- Deployment platforms (Vercel, Netlify, Railway, Render, Fly.io)
- Cost projections (MVP, Growth, Scale phases)

### Automated Setup

- One-click setup for Neon, Vercel, Railway
- Token validation and configuration
- Automatic .env generation
- Rollback on failure

### Documentation Generation

- README, Architecture docs, Changelog
- ADRs (Architecture Decision Records)
- Mermaid diagrams (sequence, flowchart, ERD, class)
- OpenAPI 3.0.3 specifications

## Project Structure

```
VibeIA/
├── backend/                 # NestJS API
│   └── src/modules/
│       ├── auth/           # JWT authentication
│       ├── users/          # User management
│       ├── projects/       # Project CRUD
│       ├── plans/          # Plan generation
│       ├── execution/      # Execution engine
│       ├── llm/            # Multi-LLM orchestrator
│       ├── git/            # GitHub integration
│       ├── quality-gates/  # Code validation
│       ├── manual-tasks/   # Manual task handling
│       ├── recommendations/# Infra recommendations
│       ├── documentation/  # Doc generation
│       ├── setup/          # Automated setup
│       ├── teams/          # Team collaboration
│       ├── security/       # Security scanning
│       ├── billing/        # Billing management
│       ├── error-handling/ # Error & rollback
│       └── events/         # WebSocket gateway
│
├── frontend/                # Next.js App
│   └── src/
│       ├── app/            # Pages (App Router)
│       ├── components/     # React components
│       ├── contexts/       # AuthContext
│       └── lib/            # API client, utils
│
└── docker-compose.yml
```

## API Endpoints

**Base URL**: `https://vibeia.onrender.com`

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Token refresh
- `GET /api/auth/me` - Current user

### Projects
- `POST /api/projects` - Create project
- `GET /api/projects` - List projects
- `GET /api/projects/:id` - Project details

### Plans
- `POST /api/plans/generate` - Generate plan
- `GET /api/plans` - List plans
- `GET /api/plans/:id` - Plan details

### Execution
- `POST /api/execution/:planId/start` - Start execution
- `GET /api/execution/:planId/status` - Execution status
- `POST /api/execution/:planId/pause` - Pause
- `POST /api/execution/:planId/resume` - Resume

### Recommendations (Public)
- `GET /api/recommendations/database/providers` - List DB providers
- `GET /api/recommendations/deploy/providers` - List deploy providers
- `POST /api/recommendations/database` - DB recommendation
- `POST /api/recommendations/deploy` - Deploy recommendation
- `POST /api/recommendations/cost` - Cost projection

### Setup
- `POST /api/setup/start` - Start automated setup
- `GET /api/setup/status/:setupId` - Setup progress
- `POST /api/setup/validate-tokens` - Validate tokens

### Documentation
- `POST /api/documentation/generate` - Generate docs
- `POST /api/documentation/adr` - Generate ADR
- `POST /api/documentation/diagram` - Generate diagram

## Local Development

### Prerequisites
- Node.js 20+
- MongoDB (local or Atlas)
- npm or yarn

### Backend
```bash
cd backend
npm install
cp .env.example .env  # Configure environment variables
npm run start:dev     # Runs on http://localhost:3001
```

### Frontend
```bash
cd frontend
npm install
cp .env.example .env.local  # Configure API URL
npm run dev           # Runs on http://localhost:3000
```

### Docker (Optional)
```bash
docker-compose up -d
# Frontend: http://localhost:3000
# Backend: http://localhost:3001
```

## Environment Variables

### Backend Production (.env)
```bash
MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/vibecoding
JWT_SECRET=your-secure-jwt-secret-32-chars
JWT_REFRESH_SECRET=your-secure-refresh-secret-32-chars
PORT=10000
NODE_ENV=production
FRONTEND_URL=https://frontend-delta-drab-99.vercel.app

# Optional: LLM APIs
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
GOOGLE_AI_API_KEY=...
GITHUB_TOKEN=ghp_...
```

### Frontend Production (.env.local)
```bash
NEXT_PUBLIC_API_URL=https://vibeia.onrender.com
```

## Testing

```bash
# Backend (197+ tests)
cd backend
npm run test        # Unit tests
npm run test:cov    # Coverage

# Frontend (83+ tests)
cd frontend
npm run test        # Component tests
npm run test:cov    # Coverage
```

## Deployment

### Current Production Setup

| Service | Platform | Plan |
|---------|----------|------|
| Frontend | Vercel | Free |
| Backend | Render | Free (750 hrs/month) |
| Database | MongoDB Atlas | Free (512MB) |

### Deploy Your Own

1. **MongoDB Atlas**: Create free cluster, whitelist 0.0.0.0/0
2. **Render**: Connect GitHub, set root directory to `backend`, add env vars
3. **Vercel**: Connect GitHub, set root directory to `frontend`, add `NEXT_PUBLIC_API_URL`

See [CLAUDE.md](./.claude/CLAUDE.md) for detailed deployment instructions.

## Implementation Status

| Phase | Status | Description |
|-------|--------|-------------|
| 1 | ✅ | Core Platform & Wizard |
| 2 | ✅ | Execution Engine & Git Integration |
| 3 | ✅ | Manual Tasks & Quality Gates |
| 4 | ✅ | Auth, Real-time & Testing |
| 5 | ✅ | Dashboard & Project Management |
| 6 | ✅ | Infrastructure Recommendations |
| 7 | ✅ | Automated Documentation |
| 8 | ✅ | Automated Setup System |
| 9 | ✅ | Error Handling & Rollback |
| 10 | ✅ | Security & Billing Modules |
| 11 | ✅ | Teams & Collaboration |

## Documentation

- [CLAUDE.md](./.claude/CLAUDE.md) - Full project context for AI assistants
- [Implementation Plan](./implementation_plan.md) - Detailed feature roadmap

## License

MIT