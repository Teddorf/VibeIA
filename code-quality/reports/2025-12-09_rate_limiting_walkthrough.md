# Walkthrough - Rate Limiting Implementation

Completed Task 2.1 from the remediation plan, adding protection against brute-force attacks.

## Changes

### 1. Dependencies and Configuration (Task 2.1)
- **Dependencies**: Installed `@nestjs/throttler`.
- **`app.module.ts`**: Imported `ThrottlerModule` with global configuration (TTL: 60s, Limit: 10).
- **`auth.controller.ts`**:
    - Applied `ThrottlerGuard`.
    - Configured specific limits for sensitive endpoints:
        - **Login**: 10 requests / 15 min
        - **Register**: 5 requests / 15 min
        - **Refresh**: 20 requests / 15 min

### 2. Testing
- **`auth.controller.spec.ts`**:
    - Created unit tests for `AuthController`.
    - Verifies that the controller integrates correctly with the Throttler guards and decorators.

## Verification Results

### Automated Tests
```
PASS  src/modules/auth/auth.controller.spec.ts (5 passed)
```

### Manual Verification Steps
1.  **Trigger Limit**: Repeatedly hit the `POST /api/auth/login` endpoint.
2.  **Observe**: After 10 attempts within 15 minutes, the 11th request should return `429 Too Many Requests`.
