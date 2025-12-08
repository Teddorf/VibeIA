# Vibe Coding Platform (VibeIA)

Ultra-granular prompts for enterprise-quality code generation.

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
| Infra | Docker, Docker Compose, Redis |

## Quick Start

### Development

```bash
# Backend
cd backend
npm install
npm run start:dev  # http://localhost:3001

# Frontend
cd frontend
npm install
npm run dev  # http://localhost:3000
```

### Docker

```bash
docker-compose up -d
# Frontend: http://localhost:3000
# Backend: http://localhost:3001
# MongoDB: localhost:27017
# Redis: localhost:6379
```

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

### Recommendations
- `POST /api/recommendations/database` - DB recommendation
- `POST /api/recommendations/deploy` - Deploy recommendation
- `POST /api/recommendations/cost` - Cost projection
- `POST /api/recommendations/full` - Full recommendation

### Setup
- `POST /api/setup/start` - Start automated setup
- `GET /api/setup/status/:setupId` - Setup progress
- `POST /api/setup/validate-tokens` - Validate tokens

### Documentation
- `POST /api/documentation/generate` - Generate docs
- `POST /api/documentation/adr` - Generate ADR
- `POST /api/documentation/diagram` - Generate diagram

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

## Environment Variables

### Backend (.env)
```
MONGO_URI=mongodb://localhost:27017/vibecoding
JWT_SECRET=your-jwt-secret
JWT_REFRESH_SECRET=your-refresh-secret
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
GOOGLE_AI_API_KEY=...
GITHUB_TOKEN=ghp_...
```

### Frontend (.env.local)
```
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

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

## Documentation

- [CLAUDE.md](./CLAUDE.md) - Full project context for AI assistants
- [Implementation Plan](./implementation_plan.md) - Detailed feature roadmap

## Best Practices Applied

- Ultra-granular tasks (~10 min each)
- Quality-first UI/UX
- Comprehensive test coverage
- Clear git commits
- Enterprise-quality code gates

## License

MIT