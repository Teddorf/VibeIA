import { SetupProvider, SetupOrchestratorConfig, SetupResult, SetupTask } from '../dto/setup.dto';
import { SetupStateDocument } from '../schemas/setup-state.schema';

export interface ISetupExecutor {
    canExecute(provider: SetupProvider): boolean;
    execute(
        config: SetupOrchestratorConfig,
        state: SetupStateDocument,
        task: SetupTask,
        token?: string
    ): Promise<any>; // Returning any for now (specific result type) or SetupResult partial
    rollback(resourceId: string, token?: string): Promise<void>;
}
