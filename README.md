# Vibe Coding Platform

A revolutionary AI-powered platform that guides users through ultra-granular prompts to build enterprise-quality applications.

##  What We Built (Phase 1)

### The Wizard - 4-Stage Analysis System
1. **Intent Declaration**: Project name + description
2. **Business Analysis**: 5 dynamic questions about users, features, scale
3. **Technical Analysis**: Archetype selection + granular plan generation
4. **Execution**: Coming in Phase 2

### Infrastructure
- Next.js 14 (TypeScript, Tailwind, shadcn/ui)
- NestJS (MongoDB, Passport, JWT)
- Docker Compose (4 services)

##  Quick Start

### Run with Docker
```bash
docker-compose up
```
- Frontend: http://localhost:3000
- Backend: http://localhost:3001

### Local Development
```bash
# Frontend
cd frontend
npm install
npm run dev

# Backend
cd backend
npm install
npm run start:dev
```

##  Features

###  Completed
- Stage 1: Intent Declaration UI
- Stage 2: Business Analysis (Question Engine)
- Stage 3: Technical Analysis (5 Archetypos + Plan Generator)
- Progress indicator with visual feedback
- Responsive design with shadcn/ui
- Docker configuration
- MongoDB schemas (User, Project)

###  In Progress
- Stage 4: Execution Engine
- Backend API integration
- LLM orchestration

###  Planned (Phase 2)
- Git integration (GitHub/GitLab/Bitbucket)
- Multi-LLM support (Claude, OpenAI, Gemini)
- Quality gates (Lint, Security, Coverage)
- Test generation
- Manual task detection

##  Architecture

### Archetypos (Patterns)
1. **JWT Stateless Auth**: Token-based, no sessions
2. **Session-based Auth**: Redis/DB sessions
3. **Event-Driven Notifications**: Pub/Sub + WebSocket
4. **Stripe Payments**: Hosted checkout
5. **S3 Direct Upload**: Presigned URLs

### Plan Generation
- **Ultra-granular**: Tasks 10 minutes
- **Phased approach**: Infrastructure  Features  Testing
- **Dependency tracking**: Clear task order
- **Time estimation**: Per task, phase, and total

##  Documentation
- [Implementation Plan](./implementation_plan.md)
- [Phase 1 Walkthrough](./PHASE1_WALKTHROUGH.md)
- [Full Specification](./VIBE_CODING_PLATFORM_COMPLETE_SPECIFICATION.md)

##  Practices Applied
 Ultra-granular task breakdown
 Quality-first UI/UX
 Clear git commits with context
 Comprehensive documentation
 Responsive, accessible design

##  License
Proprietary - All Rights Reserved
