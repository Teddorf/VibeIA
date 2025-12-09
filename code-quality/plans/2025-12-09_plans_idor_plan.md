# Fix IDOR in Plans Service

## Goal Description
Fix Insecure Direct Object Reference (IDOR) vulnerabilities in `PlansService` where plan ownership is not validated.

## Proposed Changes

### Backend - Plans Module

#### [MODIFY] [plans.service.ts](file:///c:/Users/m_ben/OneDrive/Escritorio/Mike/VibeIA/backend/src/modules/plans/plans.service.ts)
- **`findAll(userId: string, projectId?: string)`**:
    - Ensure `projectId` belongs to `userId` if checking against project (though `Plans` schema has `userId`, so filtering by `userId` in `find()` query is sufficient and already present).
    - *Verify*: Current `findAll` implementation uses `query: any = { userId };`, so it is **SECURE** by design for listing.

- **`findOne(id: string)` -> `findOne(id: string, userId: string)`**:
    - Add `userId` parameter.
    - Check `if (plan.userId !== userId) throw new ForbiddenException()`.

- **`updateStatus(id: string, status: string)` -> `updateStatus(id: string, status: string, userId: string)`**:
    - Add `userId` parameter.
    - Fetch plan first, check ownership, then update.

- **`updateTaskStatus`**:
    - Add `userId` to signature and check ownership.

#### [MODIFY] [plans.controller.ts](file:///c:/Users/m_ben/OneDrive/Escritorio/Mike/VibeIA/backend/src/modules/plans/plans.controller.ts)
- Update `findOne`: Pass `userId`.
- Update `updateStatus`: Pass `userId`.
- Update `updateTaskStatus` (if exposed in controller, otherwise check if needed). `updateTaskStatus` is not exposed in `PlansController` currently shown, but `updateStatus` is.

### Backend - Dependent Modules
- Check `ExecutionService` and `Stage4ExecutionPreview` (frontend) usages.
- `ExecutionService.executePlan` calls `plansService.findOne(planId)`. It currently passes `userId` to `projectsService`, but we need to update `plansService.findOne`.
- `ExecutionService.resumeExecution` etc.

#### [MODIFY] [execution.service.ts](file:///c:/Users/m_ben/OneDrive/Escritorio/Mike/VibeIA/backend/src/modules/execution/execution.service.ts)
- Update `plansService.findOne` calls. `ExecutionService` usually has `planId`.
- **Challenge**: `ExecutionService` methods like `executePlan(planId)` don't always take `userId` as input?
    - `executePlan(planId)`: It reads the plan *to find the userId*.
    - If `executePlan` is an internal administrative action or triggered by user, it should accept `userId`.
    - If `executePlan` is called by a controller, that controller should pass `userId`.
    - `ExecutionController` (not yet viewed) likely exposes these.

### Wait, `ExecutionService` acts as system or on behalf of user?
- `executePlan` reads `plan` to get `userId`.
- The vulnerability is in *accessing* the plan.
- If `ExecutionService` is trusted (server-side), it might be `findOne` vs `findOneByUser`.
- Better approach: `findOne(id)` becomes `findById(id)` (internal, no check) vs `getUserPlan(id, userId)` (public, check).
- **Decision**: Overload `findOne` or split?
    - To fix IDOR in `PlansController`, we MUST have a method that validates user.
    - `PlansService.findOne` is used by Controller (needs check) and ExecutionService (trusted context? - `executePlan` loads plan to *know* who the user is).
    - If `ExecutionService` calling `findOne` requires `userId`, we have a chicken-and-egg problem if we don't know the `userId` yet.
    - **Resolution**:
        - `findOne(id: string)` -> returns Plan without check (Internal use or when we don't know user yet).
        - `findOneByUser(id: string, userId: string)` -> Validation.
        - OR `findOne(id: string, userId?: string)` -> if userId provided, check it.

- **Plan**:
    - Update `findOne(id, userId)` to enforce check.
    - Update `ExecutionService`:
        - When `executePlan(planId)` is called, does it come from a user request? Yes, likely `ExecutionController`.
        - If `ExecutionController` has `userId`, we pass it.

#### [MODIFY] [plans.service.spec.ts](file:///c:/Users/m_ben/OneDrive/Escritorio/Mike/VibeIA/backend/src/modules/plans/plans.service.spec.ts)
- Fix missing dependencies (`UsersService`, `ProjectsService`).
- Add tests for IDOR cases.

## Verification Plan

### Automated Tests
Run plans service tests:
```bash
npm run test backend/src/modules/plans/plans.service.spec.ts
```
