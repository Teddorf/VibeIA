# Remove Sensitive Logs

## Goal Description
Prevent sensitive information, such as full API error payloads (which might contain stack traces or internal IDs), from being exposed in the browser console in production environments.

## Proposed Changes

### Frontend - Utility

#### [NEW] [logger.ts](file:///c:/Users/m_ben/OneDrive/Escritorio/Mike/VibeIA/frontend/src/lib/logger.ts)
- Create a simple logger utility.
- Methods: `log`, `error`, `warn`, `info`.
- Logic:
    - In `development`: output full details to console.
    - In `production`: suppress logs or only output sanitized messages (e.g. "An error occurred" without payload).

### Frontend - Network Layer

#### [MODIFY] [api-client.ts](file:///c:/Users/m_ben/OneDrive/Escritorio/Mike/VibeIA/frontend/src/lib/api-client.ts)
- Import new `logger`.
- Replace `console.error` in the response interceptor.
- **Sanitization**:
    - Instead of `console.error('API Error:', error.response?.data || error.message);`
    - Use `logger.error('API Error:', sanitize(error));`
    - In production, ensure `error.response.data` is NOT logged.

## Verification Plan

### Manual Verification
1.  **Development Mode (`npm run dev`)**:
    - Trigger an API error (e.g., login with bad credentials).
    - Verify console shows full error details (helpful for debugging).
2.  **Production Mode (`npm run build && npm start`)** *simulation*:
    - Temporarily set `NODE_ENV='production'` logic in logger.
    - Trigger an API error.
    - Verify console does **not** show the sensitive data blob.
