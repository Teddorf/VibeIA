# Improve Password Validation

## Goal Description
Enhance account security by enforcing stronger password complexity policies during user registration.

## Proposed Changes

### Backend - Auth Service

#### [MODIFY] [auth.service.ts](file:///c:/Users/m_ben/OneDrive/Escritorio/Mike/VibeIA/backend/src/modules/auth/auth.service.ts)
- Add `validatePasswordStrength(password: string): void` private method.
- Rules:
  - Minimum length: 12 characters.
  - At least one uppercase letter.
  - At least one lowercase letter.
  - At least one number.
  - At least one special character (`!@#$%^&*` etc).
- Throw `BadRequestException` with specific messages if validation fails.
- Call this validation in `register()` method.

### Backend - Tests

#### [MODIFY] [auth.service.spec.ts](file:///c:/Users/m_ben/OneDrive/Escritorio/Mike/VibeIA/backend/src/modules/auth/auth.service.spec.ts)
- Update existing "short password" test.
- Add new test cases:
  - Missing uppercase.
  - Missing lowercase.
  - Missing number.
  - Missing symbol.
  - Valid complex password.

## Verification Plan

### Automated Tests
```bash
npm run test backend/src/modules/auth/auth.service.spec.ts
```

### Manual Verification
1.  **Register (Weak)**: Try registering with `password123`. Expect 400 Bad Request.
2.  **Register (Strong)**: Try registering with `ComplexPass123!`. Expect 200 OK (token).
