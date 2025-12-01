# Implementation Plan - Vibe Coding Platform

## Goal
Build a "Vibe Coding" platform that guides users to create ultra-granular prompts, orchestrates AI agents for code generation, enforces enterprise-quality gates, and manages manual tasks seamlessly.

## Architecture
- **Frontend**: Next.js 14 (App Router), Tailwind CSS, shadcn/ui.
- **Backend**: NestJS, Node.js 20.
- **Database**: MongoDB Atlas.
- **Cache/Queue**: Redis, BullMQ.
- **Infrastructure**: Docker for workspace isolation.
- **AI**: Multi-LLM support (Claude, OpenAI).

## Proposed Changes

### Phase 1: Core Platform & "The Wizard"
#### [NEW] Frontend Setup
- Initialize Next.js project.
- Implement "The Wizard" UI (Chat/Form hybrid) for the 4-stage analysis.
- Create Dashboard for project management.

#### [NEW] Backend Setup
- Initialize NestJS project.
- Setup MongoDB connection.
- Implement API for Project and Task management.
- Implement "Question Engine" for Business Analysis stage.

### Phase 2: Execution Engine & Git Integration
#### [NEW] Git Integration
- GitHub App setup.
- Branching strategy manager (Feature/Phase/Task branches).

#### [NEW] Code Generation Pipeline
- LLM Orchestrator (Adapter pattern).
- Code Generation Service.
- Test Generation Service.
- Quality Gates Service (Linting, Security, Coverage).

### Phase 3: Manual Tasks & Advanced Features
#### [NEW] Manual Task System
- Task detection logic.
- "Pause & Guide" UI.
- Validation logic for manual steps.

## Verification Plan
### Automated Tests
- Unit tests for Backend services (NestJS).
- Component tests for Frontend (React Testing Library).
- E2E tests for the "Wizard" flow.

### Manual Verification
- Verify GitHub App installation and permissions.
- Test the "Pause & Guide" flow with a real manual task (e.g., Stripe setup).
