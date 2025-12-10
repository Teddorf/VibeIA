# Validate JSON.parse in AuthContext

## Goal Description
Enhance application stability and security by replacing unsafe `JSON.parse` with `zod` schema validation when hydrating user state from `localStorage`.

## Proposed Changes

### Frontend - Dependency
- [ ] Install `zod` in frontend package.

### Frontend - Auth Context

#### [MODIFY] [AuthContext.tsx](file:///c:/Users/m_ben/OneDrive/Escritorio/Mike/VibeIA/frontend/src/contexts/AuthContext.tsx)
- Import `z` from `zod`.
- Define `UserSchema` matching the `User` interface:
  ```typescript
  const UserSchema = z.object({
    id: z.string(),
    email: z.string().email(),
    name: z.string(),
    role: z.string(),
  });
  ```
- In `useEffect` (initAuth) and `refreshAuth`:
    - Replace `JSON.parse(userStr)` with safe parsing logic.
    - `const result = UserSchema.safeParse(JSON.parse(userStr));`
    - Check `result.success`. If false, clear auth state.

## Verification Plan

### Automated Tests
- **Run existing tests**: `npm run test src/contexts/__tests__/AuthContext.test.tsx`
- **New Test Case**: Add a test case in `AuthContext.test.tsx` simulating corrupted `localStorage` data.
    - Set `localStorage.setItem('auth_user', '{"invalid": "data"}')`.
    - Mount `AuthProvider`.
    - Expect user to be `null` and state to be unauthenticated (or cleared).

### Manual Verification
1.  **Corrupted Data**:
    - Log in to the app.
    - Open DevTools -> Application -> Local Storage.
    - Edit `auth_user` value to be invalid JSON or mismatching structure (e.g. `{ "id": 123 }` missing email).
    - Refresh the page.
    - Verify user is logged out instead of the app crashing.
