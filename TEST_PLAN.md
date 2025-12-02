# Test Suite Implementation Plan

## Backend Tests (NestJS + Jest)

### Unit Tests

#### 1. LLM Module
- **llm.service.spec.ts**
  - Test provider selection (primary/fallback)
  - Test cost estimation
  - Test error handling and fallback logic
  
- **anthropic.provider.spec.ts**
  - Test prompt building
  - Test API response parsing
  - Test cost calculation
  - Mock Anthropic SDK
  
- **openai.provider.spec.ts**
  - Test prompt building
  - Test API response parsing
  - Test cost calculation
  - Mock OpenAI SDK

#### 2. Plans Module
- **plans.service.spec.ts**
  - Test plan generation with LLM
  - Test plan retrieval (findAll, findOne)
  - Test status updates
  - Mock LlmService and Mongoose Model
  
- **plans.controller.spec.ts**
  - Test all endpoints (POST /generate, GET /, GET /:id, PATCH /:id)
  - Test request validation
  - Mock PlansService

#### 3. Git Module
- **git.service.spec.ts**
  - Test repository creation
  - Test commit creation
  - Test branch management
  - Mock Octokit

### Integration Tests

#### 1. Plans API Integration
- **plans.e2e-spec.ts**
  - Test full plan generation flow
  - Test with real MongoDB (test DB)
  - Test error scenarios

#### 2. LLM Integration
- **llm.e2e-spec.ts**
  - Test with mock LLM responses
  - Test fallback scenarios

## Frontend Tests (React Testing Library + Jest)

### Component Tests

#### 1. Wizard Components
- **Stage1IntentDeclaration.test.tsx**
  - Test input validation
  - Test form submission
  - Test disabled state
  
- **Stage2BusinessAnalysis.test.tsx**
  - Test question navigation
  - Test answer persistence
  - Test back navigation
  
- **Stage3TechnicalAnalysis.test.tsx**
  - Test archetype selection
  - Test API call (mocked)
  - Test plan display
  - Test error handling
  
- **Stage4ExecutionPreview.test.tsx**
  - Test data display
  - Test navigation
  
- **WizardContainer.test.tsx**
  - Test stage progression
  - Test data flow between stages

#### 2. API Client Tests
- **api-client.test.ts**
  - Test request interceptors
  - Test response interceptors
  - Test error handling
  - Mock axios

## Coverage Goals
- Backend: \u003e85% coverage
- Frontend: \u003e80% coverage
- Critical paths: 100% coverage

## Tools
- Jest (test runner)
- @testing-library/react (React components)
- supertest (API integration tests)
- mongodb-memory-server (in-memory DB for tests)
