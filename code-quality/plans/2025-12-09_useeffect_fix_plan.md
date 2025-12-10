# Fix useEffect Dependencies in ExecutionDashboard

## Goal Description
Fix the React hook dependency warning in `ExecutionDashboard.tsx`. The `executeNextTask` function is referenced in a `useEffect` but is not included in the dependency array, causing stale closure issues and potential bugs.

## Problem Analysis

### Current Issue (Lines 288-293)
```typescript
useEffect(() => {
  if (isExecuting && !isPaused && !manualTask) {
    const timer = setTimeout(() => executeNextTask(), 100);
    return () => clearTimeout(timer);
  }
}, [currentPhaseIndex, currentTaskIndex, isExecuting, isPaused, manualTask]);
// ❌ Missing: executeNextTask
```

**Risk**: `executeNextTask` captures stale values from props/state, leading to incorrect behavior.

## Proposed Changes

### Frontend - ExecutionDashboard

#### [MODIFY] [ExecutionDashboard.tsx](file:///c:/Users/m_ben/OneDrive/Escritorio/Mike/VibeIA/frontend/src/components/execution/ExecutionDashboard.tsx)

1. **Wrap `executeNextTask` in `useCallback`** (line ~118):
   - Add dependencies: `plan`, `isPaused`, `getCurrentTask`, `addLog`, `onComplete`, `updateTaskStatus`, `moveToNextTask`, `isExecuting`
   - Ensure all functions it calls are also wrapped in `useCallback`

2. **Wrap helper functions in `useCallback`**:
   - `getCurrentTask` (line ~111)
   - `updateTaskStatus` (line ~187)
   - `moveToNextTask` (line ~204)

3. **Add `executeNextTask` to useEffect dependency array** (line 293)

## Verification Plan

### Automated Tests
- Run frontend build to check for React Hook warnings.
- Verify no ESLint warnings for `react-hooks/exhaustive-deps`.

### Manual Verification
1. Start execution in the dashboard.
2. Verify tasks execute sequentially without infinite loops.
3. Pause and resume execution.
4. Verify no stale state issues (tasks don't re-execute incorrectly).
