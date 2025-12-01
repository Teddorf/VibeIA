# Vibe Coding Platform

A platform that guides users to create ultra-granular prompts, orchestrates AI agents for code generation, and enforces enterprise-quality gates.

## Architecture

- **Frontend**: Next.js 14 (TypeScript, Tailwind CSS, shadcn/ui)
- **Backend**: NestJS (Node.js 20)
- **Database**: MongoDB
- **Cache/Queue**: Redis, BullMQ
- **Infrastructure**: Docker

## Getting Started

### Prerequisites

- Docker and Docker Compose
- Node.js 20+ (for local development)

### Running with Docker

```bash
# Start all services
docker-compose up

# Frontend: http://localhost:3000
# Backend: http://localhost:3001
```

### Local Development

#### Frontend
```bash
cd frontend
npm install
npm run dev
```

#### Backend
```bash
cd backend
npm install
npm run start:dev
```

## Project Structure

```
.
 frontend/          # Next.js application
 backend/           # NestJS application
 docker-compose.yml # Docker orchestration
 implementation_plan.md
```

## Phase 1 Progress

- [x] Next.js frontend initialized
- [x] NestJS backend initialized
- [x] Docker configuration
- [ ] Database & Auth setup
- [ ] Core Logic (4 Stages)

## Documentation

- [Implementation Plan](./implementation_plan.md)
- [Full Specification](./VIBE_CODING_PLATFORM_COMPLETE_SPECIFICATION.md)
