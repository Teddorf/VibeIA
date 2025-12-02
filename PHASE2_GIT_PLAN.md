# Phase 2.2: Git Integration Plan

## Goal
Enable Vibe Coding Platform to create repositories, manage branches, and push code to GitHub on behalf of the user.

## Architecture
We will use a **GitHub App** (instead of OAuth App) for finer-grained permissions and higher rate limits.

### Components

#### 1. GitHub Service (Backend)
**Files:**
- `backend/src/modules/git/git.module.ts`
- `backend/src/modules/git/git.service.ts`
- `backend/src/modules/git/github.provider.ts`

**Features:**
- Authenticate as GitHub App
- Create repository for new projects
- Create branches (`feature/xyz`)
- Create commits (using Octokit)
- Create Pull Requests

#### 2. Auth Update
- Update Passport strategy to handle GitHub App installation ID
- Store installation ID in User schema

#### 3. Execution Engine (Backend)
**Files:**
- `backend/src/modules/execution/execution.module.ts`
- `backend/src/modules/execution/execution.service.ts`

**Flow:**
1. Receive "Start Execution" request
2. Create GitHub Repo
3. For each task in Plan:
   a. Create branch
   b. Generate code (LLM)
   c. Commit code
   d. Create PR
   e. Merge PR (if auto-merge enabled)

## Implementation Steps

1. **Setup GitHub App**: Register app in GitHub (manual step for user, we provide manifest)
2. **Backend Git Module**: Implement Octokit integration
3. **Repo Creation**: Endpoint to initialize project repo
4. **Execution Orchestrator**: Connect Plan -> LLM -> Git

## Tasks
- [ ] Create Git Module in NestJS
- [ ] Implement `createRepo` method
- [ ] Implement `createCommit` method
- [ ] Update User schema for GitHub App installation
