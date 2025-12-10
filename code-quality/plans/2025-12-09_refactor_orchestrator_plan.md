# Refactor SetupOrchestratorService

## Goal Description
Refactor the monolithic `SetupOrchestratorService` to use the **Strategy Pattern**. This will decouple the orchestration logic from specific provider implementations, making the system more extensible and testable.

## Proposed Changes

### Backend - Setup Module

#### [NEW] [ISetupExecutor.ts](file:///c:/Users/m_ben/OneDrive/Escritorio/Mike/VibeIA/backend/src/modules/setup/executors/ISetupExecutor.ts)
- Define interface `ISetupExecutor`:
  ```typescript
  export interface ISetupExecutor {
    canExecute(provider: SetupProvider): boolean;
    execute(config: SetupOrchestratorConfig, state: SetupStateDocument): Promise<SetupResult>;
    rollback(resourceId: string, token?: string): Promise<void>;
  }
  ```

#### [NEW] [NeonExecutor.ts](file:///c:/Users/m_ben/OneDrive/Escritorio/Mike/VibeIA/backend/src/modules/setup/executors/NeonExecutor.ts)
- Implement `ISetupExecutor` for Neon.
- Move Neon-specific logic from orchestrator here.

#### [NEW] [VercelExecutor.ts](file:///c:/Users/m_ben/OneDrive/Escritorio/Mike/VibeIA/backend/src/modules/setup/executors/VercelExecutor.ts)
- Implement `ISetupExecutor` for Vercel.
- Move Vercel-specific logic from orchestrator here.

#### [NEW] [RailwayExecutor.ts](file:///c:/Users/m_ben/OneDrive/Escritorio/Mike/VibeIA/backend/src/modules/setup/executors/RailwayExecutor.ts)
- Implement `ISetupExecutor` for Railway.
- Move Railway-specific logic from orchestrator here.

#### [MODIFY] [setup-orchestrator.service.ts](file:///c:/Users/m_ben/OneDrive/Escritorio/Mike/VibeIA/backend/src/modules/setup/setup-orchestrator.service.ts)
- Inject a list/registry of executors.
- In `execute` method, iterate through tasks and find the matching executor dynamically.
- Remove hardcoded blocks for Neon, Vercel, Railway.

## Verification Plan

### Automated Tests
- Create unit tests for each new Executor.
- Update `setup-orchestrator.service.spec.ts` to mock the executors instead of individual services.

### Manual Verification
- Since we lack a real testing environment for these 3rd party services, verification will rely heavily on unit tests and preserving existing logic structure.
