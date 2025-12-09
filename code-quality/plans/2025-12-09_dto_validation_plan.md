# Validate DTOs with class-validator

## Goal Description
Enhance API security and data integrity by validating incoming requests using DTOs with `class-validator` decorators and enforcing them globally.

## Proposed Changes

### Backend - Configuration

#### [MODIFY] [main.ts](file:///c:/Users/m_ben/OneDrive/Escritorio/Mike/VibeIA/backend/src/main.ts)
- Import `ValidationPipe` from `@nestjs/common`.
- Apply `app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }))`.

### Backend - Projects Module

#### [NEW] [create-project.dto.ts](file:///c:/Users/m_ben/OneDrive/Escritorio/Mike/VibeIA/backend/src/modules/projects/dto/create-project.dto.ts)
- Define `CreateProjectDto` class.
- Fields:
    - `name`: string, not empty.
    - `description`: string, optional.

#### [NEW] [update-project.dto.ts](file:///c:/Users/m_ben/OneDrive/Escritorio/Mike/VibeIA/backend/src/modules/projects/dto/update-project.dto.ts)
- Define `UpdateProjectDto` class (PartialType of CreateProjectDto or specific fields).
- Fields:
    - `name`: string, optional.
    - `description`: string, optional.
    - `status`: string, enum/optional.

#### [MODIFY] [import-project.dto.ts](file:///c:/Users/m_ben/OneDrive/Escritorio/Mike/VibeIA/backend/src/modules/projects/dto/import-project.dto.ts)
- Convert interface to `class ImportProjectDto`.
- Add decorators: `IsString`, `IsNotEmpty`, `IsOptional`.

#### [MODIFY] [projects.controller.ts](file:///c:/Users/m_ben/OneDrive/Escritorio/Mike/VibeIA/backend/src/modules/projects/projects.controller.ts)
- Update `create` method to use `CreateProjectDto`.
- Update `update` method to use `UpdateProjectDto`.
- Update `importFromGitHub` to use the class-based `ImportProjectDto`.

### Backend - Dependencies
- Ensure `class-validator` and `class-transformer` are installed (often default in Nest, but verify).

## Verification Plan

### Automated Tests
Run project controller tests (create new ones if needed, or rely on existing):
```bash
# Verify existing tests don't break
npm run test backend/src/modules/projects/projects.controller.spec.ts
```

### Manual Verification
1.  **Validation Rejection**:
    - Try to create a project with empty name.
    - Expect `400 Bad Request` with message "name should not be empty".
2.  **Strip Stripped**:
    - updates with extra fields should be stripped due to `whitelist: true`.
