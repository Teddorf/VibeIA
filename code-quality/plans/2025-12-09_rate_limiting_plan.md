# Implement Rate Limiting

## Goal Description
Protect authentication endpoints against brute-force and spam attacks by implementing rate limiting.

## Proposed Changes

### Backend - Dependencies
- Install `@nestjs/throttler`.

### Backend - App Configurtion

#### [MODIFY] [app.module.ts](file:///c:/Users/m_ben/OneDrive/Escritorio/Mike/VibeIA/backend/src/app.module.ts)
- Import `ThrottlerModule`.
- Register strictly for global usage or per-controller. Plan says "Configure ThrottlerModule in app.module.ts".
- **Config**:
    - TTL: 60s
    - Limit: 10 (default), but will override in AuthController.

### Backend - Auth Module

#### [MODIFY] [auth.controller.ts](file:///c:/Users/m_ben/OneDrive/Escritorio/Mike/VibeIA/backend/src/modules/auth/auth.controller.ts)
- Add `@UseGuards(ThrottlerGuard)` or rely on global guard (easiest to just use decorators if global guard is set).
- Apply specific limits:
    - Login: 10 requests / 15 min
    - Register: 5 requests / 15 min
    - Refresh: 20 requests / 15 min

#### [NEW] [auth.controller.spec.ts](file:///c:/Users/m_ben/OneDrive/Escritorio/Mike/VibeIA/backend/src/modules/auth/auth.controller.spec.ts)
- Create missing test file.
- Verify controller methods call service.
- *Note*: Unit testing rate limiting logic usually requires integration tests (e2e) or internal guard testing. For this plan, I'll add basic unit coverage for the controller and verify rate limiting via Manual Verification or E2E if possible. I won't write complex unit tests for the Guard itself as it's a library feature.

## Verification Plan

### Automated Tests
Run the new auth controller tests:
```bash
npm run test backend/src/modules/auth/auth.controller.spec.ts
```

### Manual Verification
1.  **Rate Limit Trigger**:
    - Start backend.
    - Send 11 login requests in rapid succession.
    - Verify 11th request receives 429 Too Many Requests.
