# Implementation Plan - Vibe Coding Platform

## Goal
Build a "Vibe Coding" platform that guides users to create ultra-granular prompts, orchestrates AI agents for code generation, enforces enterprise-quality gates, and manages manual tasks seamlessly.

## Architecture
- **Frontend**: Next.js 14 (App Router), Tailwind CSS, shadcn/ui.
- **Backend**: NestJS, Node.js 20.
- **Database**: MongoDB Atlas.
- **Cache/Queue**: Redis, BullMQ.
- **Infrastructure**: Docker for workspace isolation.
- **AI**: Multi-LLM support (Claude, OpenAI, Gemini).

## Proposed Changes

### Phase 1: Core Platform & "The Wizard" ✅ COMPLETED
#### [DONE] Frontend Setup
- Initialize Next.js project.
- Implement "The Wizard" UI (Chat/Form hybrid) for the 4-stage analysis.
- Create Dashboard for project management.

#### [DONE] Backend Setup
- Initialize NestJS project.
- Setup MongoDB connection.
- Implement API for Project and Task management.
- Implement "Question Engine" for Business Analysis stage.

### Phase 2: Execution Engine & Git Integration ✅ COMPLETED
#### [DONE] Git Integration
- GitHub integration with Octokit.
- Repository creation and management.
- Commit creation with file blobs.

#### [DONE] Code Generation Pipeline
- LLM Orchestrator with multiple providers (Claude, OpenAI, Gemini).
- Code Generation Service with context-aware prompts.
- Plan Generation with phase/task breakdown.

### Phase 3: Manual Tasks & Advanced Features ✅ COMPLETED
#### [DONE] Quality Gates Service
- Lint check (console statements, debugger, line length, TODO comments, any types, empty catch blocks).
- Security check (hardcoded secrets, SQL injection, XSS, eval usage, insecure random, open redirects).
- Test check (test structure, assertions, .only/.skip detection, coverage ratio).
- Report generation with scores and blockers.

#### [DONE] Manual Task System
- Task detection logic (Stripe, Firebase, AWS, GitHub/Google OAuth, env vars, etc.).
- "Pause & Guide" UI with step-by-step instructions.
- Validation logic for manual steps (format matching, URL reachability, required inputs).
- Environment file generation.

#### [DONE] Execution Dashboard
- Real-time execution progress with phase/task tracking.
- Pause/Resume functionality.
- Quality gate integration.
- Manual task handling with guided flow.
- Execution logs display.

### Phase 4: Polish & Production Readiness ✅ COMPLETED
#### [DONE] Authentication & User Management
- JWT-based authentication with access/refresh tokens.
- User registration and login endpoints.
- Global auth guards with @Public() decorator opt-out.
- Project ownership and access control.
- Users module with secure password hashing (bcrypt).

#### [DONE] Real-time Updates
- WebSocket gateway with Socket.io for live execution status.
- JWT authentication on WebSocket connections.
- Real-time events: status-update, task-started, task-completed, task-failed, phase-completed, execution-completed, log.
- Frontend AuthContext with token persistence and auto-refresh.

#### [DONE] Testing & Documentation
- Backend: 128 unit tests (auth, users, execution, quality gates, plans, projects, git, LLM).
- Frontend: 70 component tests (wizard, execution dashboard, manual task guide, auth pages).

### Phase 5: Dashboard & Project Management ✅ COMPLETED
#### [DONE] Navigation & Layout
- Header component with responsive navigation.
- Logo and branding (VibeCoding).
- Conditional navigation based on auth state.
- Active link highlighting.
- User dropdown menu with logout functionality.

#### [DONE] Dashboard Page
- Welcome message with personalized greeting.
- Stats cards: Total Projects, Plans Generated, Completed, In Progress.
- Project list with status badges and GitHub links.
- Recent plans section with status indicators.
- Empty state with call-to-action for first project.
- Loading states with animated spinner.

#### [DONE] Project Detail Page
- Project overview with metadata (name, description, repository URL).
- Tabs navigation: Overview, Plans, Settings.
- Plan history table with status, phases count, estimated time.
- Plan detail sidebar with phase breakdown.
- Status badges with color-coded indicators.
- Navigation to execution dashboard.

#### [DONE] New Project Flow
- Entry point page at /new-project.
- Support for existing project via query parameter.
- Integration with WizardContainer component.
- Post-completion navigation to project detail.

#### [DONE] API Enhancements
- Plans API: getAll with optional projectId filter.
- Plans sorted by createdAt descending.
- Backend controller updated for projectId query param.

#### [DONE] Testing
- Backend: 130 unit tests (added plans controller and service tests for projectId filter).
- Frontend: 83 component tests (added Dashboard, Header tests).
- Fixed async state update warnings with act() wrappers.
- Added next/navigation mocks for router-dependent components.

### Phase 6: Infrastructure Recommendations ✅ COMPLETED
#### [DONE] Database Recommendation Service
- Scoring engine for database provider selection.
- Providers: Neon, Supabase, PlanetScale, MongoDB Atlas, Railway PostgreSQL.
- Criteria: Data type, volume, traffic, branching needs, budget, auth/realtime requirements.
- Pricing information and ORM compatibility (Prisma, Drizzle, TypeORM).
- Migration complexity assessment.

#### [DONE] Deploy Recommendation Service
- Frontend providers: Vercel, Netlify.
- Backend providers: Railway, Render, Fly.io.
- Architecture recommendations based on components, traffic tier, complexity.
- Mermaid diagram generation for infrastructure visualization.
- Cost estimates for MVP/Growth/Scale phases.
- Migration triggers and DevOps level considerations.

#### [DONE] Cost Calculator Service
- Phase-based cost projections (MVP 3mo, Growth 6mo, Scale 12mo).
- Pricing data for Neon, Vercel, Railway.
- AWS cost comparison and savings analysis.
- Cost-per-user calculations.
- Recommendations for cost optimization.

#### [DONE] Recommendations API
- POST /api/recommendations/database - Get database recommendations.
- POST /api/recommendations/deploy - Get deploy recommendations.
- POST /api/recommendations/cost - Get cost projections.
- POST /api/recommendations/full - Get complete recommendations.
- GET endpoints for providers and pricing tiers.

#### [DONE] Infrastructure Recommendations UI
- Multi-step wizard (Database → Deploy → Cost → Summary).
- Form-based requirements collection.
- Provider cards with pros/cons and pricing.
- Architecture diagram display.
- Cost breakdown visualization.

#### [DONE] Testing
- Backend: 149 unit tests (added 19 recommendations service tests).
- Frontend: 83 component tests.

### Phase 7: Automated Documentation System ✅ COMPLETED
#### [DONE] ADR Generator Service
- Architecture Decision Records (ADR) generator.
- Support for proposed, accepted, deprecated, superseded statuses.
- Automatic ADR numbering and file path generation.
- Template generators for database and architecture decisions.
- ADR index generation for documentation navigation.

#### [DONE] Mermaid Diagram Generator
- Sequence diagram generation for API flows.
- Flowchart generation for system architecture.
- ERD (Entity Relationship Diagram) generation for data models.
- Class diagram generation for code structure.
- State diagram generation for workflow visualization.
- Pre-built templates for common diagrams.

#### [DONE] API Documentation Generator (OpenAPI)
- OpenAPI 3.0.3 specification generation.
- Markdown documentation export.
- CRUD endpoint template generation.
- Request/response schema documentation.
- Tag-based endpoint grouping.

#### [DONE] Documentation Service
- README generation with project structure.
- Architecture documentation with Mermaid diagrams.
- Changelog generation (Keep a Changelog format).
- Component documentation.
- Full documentation structure generation.
- Feature documentation bundles.

#### [DONE] Documentation API
- POST /api/documentation/generate - Generate any document type.
- POST /api/documentation/adr - Generate ADR.
- POST /api/documentation/diagram - Generate Mermaid diagram.
- POST /api/documentation/api-docs - Generate OpenAPI docs.
- POST /api/documentation/full - Generate full documentation.
- POST /api/documentation/feature - Generate feature documentation bundle.
- GET /api/documentation/types - Get available types.

#### [DONE] Documentation UI Component
- Tab-based interface (README, Architecture, Changelog, ADR, Diagram).
- Form-based input for each documentation type.
- Live preview of generated content.
- Copy to clipboard and download functionality.
- Diagram entity and connection input parsing.

#### [DONE] Testing
- Backend: 173 unit tests (added 24 documentation service tests).
- Frontend: 83 component tests.

### Phase 8: Automated Setup System ✅ COMPLETED
#### [DONE] Setup DTOs and Types
- SetupTaskStatus enum (pending, in_progress, completed, failed, rolled_back).
- SetupProvider enum (neon, vercel, railway).
- Configuration interfaces for each provider.
- Setup state and result types with progress tracking.
- Rollback action types for error recovery.

#### [DONE] Neon Setup Service
- Neon API integration for project creation.
- Database creation with owner configuration.
- Preview branch creation for development workflows.
- Connection string generation (main and pooled).
- Token validation and region selection.
- Rollback support for cleanup on failure.

#### [DONE] Vercel Setup Service
- Vercel API integration for project creation.
- Environment variable configuration (encrypted).
- Deployment triggering and status monitoring.
- Git repository integration support.
- Token validation with user info retrieval.
- Rollback support for project deletion.

#### [DONE] Railway Setup Service
- Railway GraphQL API integration.
- Project and service creation.
- Git repository connection.
- Redis database provisioning.
- Domain generation for services.
- Environment variable configuration.
- Token validation and rollback support.

#### [DONE] Setup Orchestrator Service
- Multi-provider setup coordination.
- Sequential task execution with progress tracking.
- Automatic rollback on failure.
- Environment file generation (.env).
- Next steps recommendations.
- Setup state persistence and status retrieval.

#### [DONE] Setup API Endpoints
- POST /api/setup/start - Start automated setup.
- GET /api/setup/status/:setupId - Get setup progress.
- POST /api/setup/validate-tokens - Validate provider tokens.
- POST /api/setup/rollback/:setupId - Manual rollback.
- GET /api/setup/providers - List available providers.
- GET /api/setup/regions - Get region options.
- Provider-specific token validation endpoints.

#### [DONE] Setup Wizard UI
- Multi-step wizard (Providers → Tokens → Config → Execute → Complete).
- Provider selection with feature highlights.
- Token input with inline validation.
- Configuration options per provider.
- Real-time setup progress display.
- Generated .env file with copy functionality.
- Dashboard links and next steps display.

#### [DONE] Testing
- Backend: 197 unit tests (added 24 setup service tests).
- Frontend: 83 component tests.

### Phase 9: Error Handling & Rollback System ✅ COMPLETED
#### [DONE] Error Classification System
- ErrorType enum (network, rate_limit, auth, validation, conflict, server, quota, timeout, unknown).
- ErrorStrategy configuration per error type (retry, backoff, rollback behavior).
- BackoffType enum (exponential, linear, none).
- EnhancedError interface with classification metadata.

#### [DONE] Retry Service
- executeWithRetry with configurable strategy.
- Exponential and linear backoff calculation.
- Jitter for avoiding thundering herd.
- Max delay limits to prevent excessive waits.
- Error classification from exception messages.
- Retryable vs non-retryable error detection.
- Timeout wrapper for long-running operations.

#### [DONE] Rollback Engine
- LIFO (Last-In-First-Out) rollback stack.
- Provider-specific rollback handlers (Neon, Vercel, Railway).
- Rollback action registration and execution.
- Timeout protection for rollback operations.
- Cost avoidance calculation for cleaned resources.
- Stack management (initialize, clear, get status).

#### [DONE] Recovery Service
- Failure analysis with confidence scoring.
- Recovery strategy selection (partial_rollback, alternative, skip, manual, full_rollback).
- Critical task detection for infrastructure components.
- Suggested user actions based on error type.
- Next steps generation for user guidance.
- Partial and full rollback orchestration.

#### [DONE] Error Handling API
- POST /api/error-handling/rollback - Trigger rollback.
- GET /api/error-handling/rollback/status/:setupId - Rollback progress.
- POST /api/error-handling/recover - Attempt recovery.
- POST /api/error-handling/analyze - Analyze error and get recommendations.
- GET /api/error-handling/strategies - Get error strategies config.
- GET /api/error-handling/health - Service health check.

#### [DONE] Error Recovery UI Component
- Error display with type-specific icons and colors.
- Auto-retry with countdown timer.
- Rollback progress visualization.
- Cost avoided report after cleanup.
- Suggested next steps display.
- Retry/Cancel/Rollback action buttons.

#### [DONE] Testing
- Backend: 235 unit tests (added 38 error handling tests).
- Frontend: 83 component tests.

### Phase 10: Security & Isolation ✅ COMPLETED
#### [DONE] Security DTOs and Types
- WorkspaceConfig interface (base image, tools, resources, network, lifetime).
- Workspace interface with status tracking and container management.
- WorkspaceStatus enum (creating, running, paused, stopped, destroying, destroyed, error).
- CredentialStore interface for secure token storage.
- CredentialProvider enum (github, gitlab, bitbucket, neon, vercel, railway, openai, anthropic, google).
- SECRET_PATTERNS array with regex patterns for secret detection.
- Security scan result types and report interfaces.
- Rate limit configuration and security headers types.
- GitIgnoreEntry for sensitive file detection.

#### [DONE] Security Scanner Service
- Full file scanning for secrets and vulnerabilities.
- Pattern-based secret detection (AWS keys, GitHub tokens, Stripe keys, database URLs, private keys, JWTs, API keys).
- Vulnerability detection (eval usage, innerHTML XSS, SQL injection, command injection, hardcoded passwords, debug code).
- Security header validation (CSP, HSTS, X-Frame-Options, X-Content-Type-Options).
- Sensitive file detection (.env, .pem, .key, credentials.json).
- Risk score calculation with severity weighting.
- Recommendation generation for security improvements.
- Secret masking for safe reporting.

#### [DONE] Credential Manager Service
- AES-256-GCM encryption for token storage.
- Store, retrieve, list, delete credential operations.
- Credential rotation with timestamp tracking.
- Provider-specific token validation (GitHub, Neon, Vercel, Railway APIs).
- Expiration tracking and rotation reminders (30-day threshold).
- GitIgnore pattern generation for secret protection.

#### [DONE] Workspace Service
- Container lifecycle management (create, pause, resume, destroy).
- Default configuration (Ubuntu 22.04, git/node/npm/python tools).
- Resource allocation (CPU, memory, disk).
- Network isolation modes (isolated, restricted, full).
- Auto-destroy with configurable lifetime.
- Workspace extension and activity tracking.
- Command execution in isolated environment.
- Workspace statistics and cleanup for expired containers.

#### [DONE] Rate Limiter Service
- Configurable rate limiters (global, auth, api, llm).
- Window-based request tracking with automatic reset.
- Token consumption for multi-unit operations.
- Path-based skip rules for health endpoints.
- Security headers generation with defaults.
- CSP (Content Security Policy) generator with customizable directives.
- Automatic cleanup of expired entries.

#### [DONE] Security API Endpoints
- POST /api/security/scan - Full security scan.
- POST /api/security/scan/secrets - Secret-only scan.
- POST /api/security/scan/vulnerabilities - Vulnerability-only scan.
- POST /api/security/validate-headers - Validate security headers.
- POST /api/security/detect-sensitive-files - Find sensitive files.
- Credential CRUD: POST/GET/DELETE /api/security/credentials.
- POST /api/security/credentials/:id/rotate - Rotate credentials.
- POST /api/security/credentials/validate - Validate tokens.
- Workspace CRUD: POST/GET/DELETE /api/security/workspaces.
- POST /api/security/workspaces/:id/pause|resume|extend|exec - Workspace operations.
- GET /api/security/rate-limits - Rate limit statistics.
- POST /api/security/rate-limits/check|reset - Rate limit operations.
- GET /api/security/headers - Get security headers.
- POST /api/security/headers/csp - Generate CSP.
- POST /api/security/gitignore - Generate gitignore content.
- GET /api/security/health - Service health check.

#### [DONE] Testing
- Backend: 313 unit tests (added 78 security tests).
- SecurityScannerService: 22 tests (secrets, vulnerabilities, headers, files).
- CredentialManagerService: 19 tests (CRUD, encryption, rotation, validation).
- WorkspaceService: 18 tests (lifecycle, execution, stats, cleanup).
- RateLimiterService: 19 tests (limits, tokens, headers, CSP).

### Phase 11: Business Model & Analytics ✅ COMPLETED
#### [DONE] Subscription DTOs and Types
- SubscriptionPlan enum (free, basic, pro, enterprise).
- SubscriptionStatus enum (active, cancelled, past_due, trialing, expired).
- BillingCycle enum (monthly, yearly).
- PlanLimits interface (maxTasks, maxProjects, maxPlans, features).
- PlanDefinition with pricing and feature lists.
- PLAN_DEFINITIONS constant with all plan configurations.
- Invoice and InvoiceItem interfaces.
- UsageRecord and UsageSummary interfaces.
- Analytics types (DailyMetrics, PlatformAnalytics, TimeSeriesData).
- ROICalculation interface.

#### [DONE] Subscription Service
- Create subscription with trial period for paid plans.
- Retrieve subscriptions by ID or user ID.
- Update subscription (plan upgrade/downgrade, billing cycle).
- Cancel subscription (immediately or at period end).
- Reactivate scheduled cancellations.
- Renew subscriptions with invoice generation.
- Invoice creation and payment handling.
- Feature access checking based on plan limits.
- Usage limit retrieval per plan.
- ROI calculator (84% cost reduction, 3800% ROI).

#### [DONE] Usage Metering Service
- Record usage by type (tasks, plans, projects, API calls, LLM tokens).
- Get usage for current or specific periods.
- Usage summary with percentage calculations.
- Limit checking with allowed/remaining status.
- Increment helpers (incrementTask, incrementPlan, incrementProject).
- Usage history for trend analysis.
- Top users by usage type.
- Total usage aggregation.
- Period-based reset functionality.

#### [DONE] Analytics Service
- User activity tracking (sessions, first/last seen).
- Plan and task creation tracking.
- Quality gate result tracking.
- Revenue tracking.
- Daily metrics aggregation.
- Platform analytics (MAU, DAU, retention, MRR, ARR, churn, LTV, CAC).
- Overview metrics with trend indicators.
- Time series data for charts (users, plans, tasks, revenue).
- Subscription breakdown by plan.
- Top features usage ranking.
- User-level analytics.
- Date range metrics queries.

#### [DONE] Billing API Endpoints
- POST /api/billing/subscriptions - Create subscription.
- GET /api/billing/subscriptions/me - Get current user subscription.
- PATCH /api/billing/subscriptions/:id - Update subscription.
- POST /api/billing/subscriptions/:id/cancel - Cancel subscription.
- POST /api/billing/subscriptions/:id/reactivate - Reactivate subscription.
- GET /api/billing/plans - List all plans.
- GET /api/billing/invoices - Get user invoices.
- POST /api/billing/invoices/:id/pay - Pay invoice.
- GET /api/billing/usage/me - Get usage summary.
- GET /api/billing/usage/check/:type - Check usage limit.
- GET /api/billing/usage/history/:type - Get usage history.
- GET /api/billing/analytics/overview - Get overview metrics.
- GET /api/billing/analytics/platform - Get platform analytics.
- GET /api/billing/analytics/timeseries/:metric - Get time series data.
- POST /api/billing/track/* - Activity tracking endpoints.
- POST /api/billing/roi/calculate - ROI calculator.
- GET /api/billing/features/:feature - Check feature access.

#### [DONE] Testing
- Backend: 362 unit tests (added 49 billing tests).
- SubscriptionService: 22 tests (CRUD, cancellation, invoices, ROI).
- UsageService: 13 tests (recording, limits, history).
- AnalyticsService: 14 tests (tracking, metrics, time series).

## Verification Plan
### Automated Tests
- Unit tests for Backend services (NestJS).
- Component tests for Frontend (React Testing Library).
- E2E tests for the "Wizard" flow.

### Manual Verification
- Verify GitHub App installation and permissions.
- Test the "Pause & Guide" flow with a real manual task (e.g., Stripe setup).
- Test quality gates with various code samples.
