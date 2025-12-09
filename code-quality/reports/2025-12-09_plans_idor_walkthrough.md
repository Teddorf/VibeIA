# Walkthrough - Plans Module IDOR Fix

Completed Task 1.4 from the remediation plan, securing plan access and management.

## Changes

### 1. Plans Service Security (Task 1.4)
- **`plans.service.ts`**:
    - **`findOne(id, userId?)`**: Added optional `userId` parameter. If provided, it validates that `plan.userId === userId`. Throws `BadRequestException` if mismatch.
    - **`updateStatus(id, status, userId)`**: Now requires `userId` and validates ownership before update.
    - **`updateTaskStatus`**: Added `userId` check logic.

- **`plans.controller.ts`**:
    - Updated `findOne` to pass `userId` from `@CurrentUser`.
    - Updated `updateStatus` to pass `userId` from `@CurrentUser`.

### 2. Testing
- **`plans.service.spec.ts`**:
    - Fixed missing dependencies (`UsersService`, `ProjectsService`).
    - Added specific test cases to verify:
        - `findOne` allows access when `userId` matches.
        - `findOne` throws exception when `userId` does not match.
        - `updateStatus` prevents modifications by non-owners.

## Verification Results

### Automated Tests
```
PASS  src/modules/plans/plans.service.spec.ts (7 passed)
```

### Manual Verification Steps
1.  **Access Control**: Try to fetch a plan ID belonging to User A using a token from User B. Should receive 400 Bad Request.
2.  **Update Control**: Try to update status of a plan belonging to User A using User B's token. Should fail.
3.  **Backward Compatibility**: Internal calls (e.g., from execution engine) that don't pass `userId` to `findOne` still work (returning the plan without check), assuming internal trusted context.
