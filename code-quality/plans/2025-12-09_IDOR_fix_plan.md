# Fix IDOR in Projects Controller/Service

## Goal Description
Fix Insecure Direct Object Reference (IDOR) vulnerability in `ProjectsService.findOne` where project ownership was not validated, allowing any authenticated user to access any project by ID.

## Proposed Changes

### Backend - Projects Module

#### [MODIFY] [projects.service.ts](file:///c:/Users/m_ben/OneDrive/Escritorio/Mike/VibeIA/backend/src/modules/projects/projects.service.ts)
- Update `findOne(id: string)` signature to `findOne(id: string, userId: string)`.
- Add validation: `if (project.ownerId !== userId) throw new ForbiddenException(...)`.

#### [MODIFY] [projects.controller.ts](file:///c:/Users/m_ben/OneDrive/Escritorio/Mike/VibeIA/backend/src/modules/projects/projects.controller.ts)
- Pass `userId` from `@CurrentUser` to `projectsService.findOne`.

### Backend - Dependent Modules

#### [MODIFY] [plans.service.ts](file:///c:/Users/m_ben/OneDrive/Escritorio/Mike/VibeIA/backend/src/modules/plans/plans.service.ts)
- Update `enrichWizardDataForImportedProject` to accept `userId` and pass it to `projectsService.findOne`.
- Update `generatePlan` to pass `userId` to `enrichWizardDataForImportedProject`.

#### [MODIFY] [execution.service.ts](file:///c:/Users/m_ben/OneDrive/Escritorio/Mike/VibeIA/backend/src/modules/execution/execution.service.ts)
- Update `executePlan` to pass `plan.userId` to `projectsService.findOne`.
- Update `resumeExecution` to pass `plan.userId` to `projectsService.findOne`.

### Backend - Tests

#### [NEW] [projects.service.spec.ts](file:///c:/Users/m_ben/OneDrive/Escritorio/Mike/VibeIA/backend/src/modules/projects/projects.service.spec.ts)
- Create unit tests for `ProjectsService`.
- Test `findOne` with correct owner (success).
- Test `findOne` with incorrect owner (ForbiddenException).

#### [MODIFY] [execution.service.spec.ts](file:///c:/Users/m_ben/OneDrive/Escritorio/Mike/VibeIA/backend/src/modules/execution/execution.service.spec.ts)
- Update mocks for `projectsService.findOne` to match new signature.

## Verification Plan

### Automated Tests
Run the new unit test for projects service:
```bash
npm run test backend/src/modules/projects/projects.service.spec.ts
```
(Note: Adjust path to match jest config if needed, or use `npm run test -- projects.service`)

Run all tests to ensure no regressions:
```bash
cd backend
npm run test
```

### Manual Verification
1.  Login as User A.
2.  Create a project (Project A).
3.  Login as User B.
4.  Try to access Project A via API (e.g. GET `/api/projects/<ProjectA_ID>`) or by changing ID in URL if applicable.
5.  Verify 403 Forbidden is returned.
