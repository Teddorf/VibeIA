# Secure Token Encryption & Fix Hardcoded Salt

## Goal Description
Implement secure encryption for GitHub Access Tokens in `UsersService` (Task 1.2) and remove hardcoded salt in `EncryptionService` (Task 1.3). Also fix existing broken unit tests for `UsersService`.

## Proposed Changes

### Backend - Encryption

#### [MODIFY] [encryption.service.ts](file:///c:/Users/m_ben/OneDrive/Escritorio/Mike/VibeIA/backend/src/modules/users/encryption.service.ts)
- Update `getKey()` to use `process.env.ENCRYPTION_SALT` with fallback to a default (only matching the plan's requirement).
- Note: This change invalidates previously encrypted data if the salt changes.

### Backend - Users Module

#### [MODIFY] [users.service.ts](file:///c:/Users/m_ben/OneDrive/Escritorio/Mike/VibeIA/backend/src/modules/users/users.service.ts)
- **Encryption**: In `connectGitHub`, encrypt `accessToken` before storing.
- **Decryption**: In `getGitHubAccessToken`, decrypt the token before returning. Handle decryption errors by returning `null` or the raw token if legacy format (graceful degradation).

#### [MODIFY] [users.service.spec.ts](file:///c:/Users/m_ben/OneDrive/Escritorio/Mike/VibeIA/backend/src/modules/users/users.service.spec.ts)
- **Fix Setup**: Add `EncryptionService` mock to the testing module providers.
- **New Tests**:
    - Test `connectGitHub`: Verify `encryptionService.encrypt` is called and encrypted value is stored.
    - Test `getGitHubAccessToken`: Verify `encryptionService.decrypt` is called and original value is returned.

## Verification Plan

### Automated Tests
Run the fixed users service tests:
```bash
npm run test src/modules/users/users.service.spec.ts
```

### Manual Verification
1.  Verify `ENCRYPTION_SALT` is set (or relies on default).
2.  Trigger a GitHub connection flow (mock or real if possible).
3.  Inspect MongoDB (if accessible) to see that `githubAccessToken` is stored in format `iv:tag:text`.
4.  Verify that application features relying on GitHub token (e.g., project import) still work (meaning decryption works).
