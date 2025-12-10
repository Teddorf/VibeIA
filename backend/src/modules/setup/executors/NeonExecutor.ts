import { Injectable, Logger } from '@nestjs/common';
import { ISetupExecutor } from './ISetupExecutor';
import { NeonSetupService } from '../neon-setup.service';
import { SetupProvider, SetupOrchestratorConfig, SetupTask, NeonSetupResult } from '../dto/setup.dto';
import { SetupStateDocument } from '../schemas/setup-state.schema';

@Injectable()
export class NeonExecutor implements ISetupExecutor {
    private readonly logger = new Logger(NeonExecutor.name);

    constructor(private readonly neonSetupService: NeonSetupService) { }

    canExecute(provider: SetupProvider): boolean {
        return provider === SetupProvider.NEON;
    }

    async execute(
        config: SetupOrchestratorConfig,
        state: SetupStateDocument,
        task: SetupTask,
        token?: string,
    ): Promise<NeonSetupResult> {
        if (!config.providers.neon) {
            throw new Error('Neon configuration missing');
        }

        this.logger.log(`Executing Neon setup task: ${task.id}`);

        const result = await this.neonSetupService.execute(
            config.providers.neon,
            token,
        );

        return result as NeonSetupResult;
    }

    async rollback(resourceId: string, token?: string): Promise<void> {
        this.logger.log(`Rolling back Neon resource: ${resourceId}`);
        await this.neonSetupService.rollback(resourceId, token);
    }
}
