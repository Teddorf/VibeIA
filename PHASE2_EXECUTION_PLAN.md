# Phase 2.3: Execution Engine Plan

## Goal
Automate the execution of tasks defined in the Implementation Plan by generating code via LLM and committing it to GitHub.

## Architecture

### 1. Execution Module
**Files:**
- `backend/src/modules/execution/execution.module.ts`
- `backend/src/modules/execution/execution.service.ts`
- `backend/src/modules/execution/execution.controller.ts`

### 2. Workflow Logic
The `ExecutionService` will handle the following flow for a given Plan:

1. **Start Execution:**
   - Receive `planId`.
   - Fetch Plan from DB.
   - Verify Project and GitHub Repo exist.

2. **Task Loop (Sequential):**
   - Iterate through Phases -> Tasks.
   - For each `pending` task:
     a. **Context Building:** Gather context (project desc, architecture, previous files).
     b. **Code Generation:** Call `LlmService` with a specific prompt to generate code for the task.
     c. **File Parsing:** Parse LLM response to extract filenames and content.
     d. **Git Commit:** Call `GitService.createCommit` to push changes to a feature branch (or main for MVP).
     e. **Update Status:** Mark task as `completed` in DB.

3. **Completion:**
   - Update Plan status to `completed`.

## Key Components

### Prompt Engineering (in LlmService or specialized helper)
- Need a prompt that outputs structured JSON with file paths and content.
- Example:
  \\\json
  {
    "files": [
      { "path": "src/auth/auth.service.ts", "content": "..." },
      { "path": "src/auth/auth.controller.ts", "content": "..." }
    ]
  }
  \\\

### Dependency Injection
- `ExecutionModule` needs imports:
  - `PlansModule` (to read/update plans)
  - `ProjectsModule` (to get repo info)
  - `GitModule` (to commit code)
  - `LlmModule` (to generate code)

## Implementation Steps
1. Create `ExecutionModule` structure.
2. Implement `generateCodeForTask` in `LlmService`.
3. Implement `executeTask` in `ExecutionService`.
4. Create API endpoint to trigger execution.
