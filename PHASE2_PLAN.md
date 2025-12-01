# Phase 2 Implementation Plan

## Goal
Implement backend API for plan generation, LLM integration for intelligent code generation, and foundational Git integration.

## Proposed Changes

### Backend API Development

#### [NEW] Plan Generation Module
**Files:**
- `backend/src/modules/plans/plans.module.ts`
- `backend/src/modules/plans/plans.controller.ts`
- `backend/src/modules/plans/plans.service.ts`
- `backend/src/modules/plans/dto/create-plan.dto.ts`
- `backend/src/schemas/plan.schema.ts`

**Endpoints:**
- `POST /api/plans/generate` - Generate plan from wizard data
- `GET /api/plans/:id` - Get plan by ID
- `PATCH /api/plans/:id` - Update plan status

#### [NEW] LLM Integration Service
**Files:**
- `backend/src/modules/llm/llm.module.ts`
- `backend/src/modules/llm/llm.service.ts`
- `backend/src/modules/llm/providers/anthropic.provider.ts`
- `backend/src/modules/llm/providers/openai.provider.ts`
- `backend/src/modules/llm/interfaces/llm-provider.interface.ts`

**Features:**
- Adapter pattern for multi-LLM support
- Claude as primary, OpenAI as fallback
- Cost tracking per request
- Rate limiting

#### [NEW] Project Management API
**Files:**
- `backend/src/modules/projects/projects.module.ts`
- `backend/src/modules/projects/projects.controller.ts`
- `backend/src/modules/projects/projects.service.ts`

**Endpoints:**
- `POST /api/projects` - Create project
- `GET /api/projects` - List user projects
- `GET /api/projects/:id` - Get project details

---

### Frontend Integration

#### [MODIFY] Stage 3 Component
**File:** `frontend/src/components/wizard/Stage3TechnicalAnalysis.tsx`

**Changes:**
- Replace mock plan generation with API call
- Add loading states
- Error handling

#### [NEW] API Client
**File:** `frontend/src/lib/api-client.ts`

**Features:**
- Axios instance with base URL
- Request/response interceptors
- Error handling

---

### Environment Configuration

#### [MODIFY] Backend .env.example
**File:** `backend/.env.example`

**Add:**
```
# LLM APIs
ANTHROPIC_API_KEY=your-anthropic-key
OPENAI_API_KEY=your-openai-key

# LLM Configuration
PRIMARY_LLM=anthropic
FALLBACK_LLM=openai
```

## Verification Plan

### Automated Tests
- Unit tests for Plan Service
- Unit tests for LLM Service
- Integration tests for /api/plans/generate endpoint

### Manual Verification
1. Complete wizard flow in frontend
2. Verify API call to /api/plans/generate
3. Check plan is generated with LLM
4. Verify plan is saved to MongoDB
5. Check plan can be retrieved

## Next Steps (Phase 2.2)
- Git integration (GitHub App)
- Quality gates implementation
- Test generation
