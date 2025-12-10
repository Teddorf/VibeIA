import { Injectable, Logger } from '@nestjs/common';
import { ISetupExecutor } from './ISetupExecutor';
import { RailwaySetupService } from '../railway-setup.service';
import { SetupProvider, SetupOrchestratorConfig, SetupTask, RailwaySetupResult } from '../dto/setup.dto';
import { SetupStateDocument } from '../schemas/setup-state.schema';

@Injectable()
export class RailwayExecutor implements ISetupExecutor {
    private readonly logger = new Logger(RailwayExecutor.name);

    constructor(private readonly railwaySetupService: RailwaySetupService) { }

    canExecute(provider: SetupProvider): boolean {
        return provider === SetupProvider.RAILWAY;
    }

    async execute(
        config: SetupOrchestratorConfig,
        state: SetupStateDocument,
        task: SetupTask,
        token?: string,
    ): Promise<RailwaySetupResult> {
        if (!config.providers.railway) {
            throw new Error('Railway configuration missing');
        }

        this.logger.log(`Executing Railway setup task: ${task.id}`);

        // Prepare env vars for Railway
        const envVars: Record<string, string> = {};
        if (state.credentials?.databaseUrl) {
            envVars['DATABASE_URL'] = state.credentials.databaseUrl;
        }
        if (state.urls?.frontend) {
            envVars['FRONTEND_URL'] = state.urls.frontend;
        }
        if (config.envVars) {
            Object.assign(envVars, config.envVars);
        }

        const result = await this.railwaySetupService.execute(
            config.providers.railway,
            undefined, // serviceConfig
            false, // needsRedis
            envVars,
            token,
        );

        return result as RailwaySetupResult;
    }

    async rollback(resourceId: string, token?: string): Promise<void> {
        this.logger.log(`Rolling back Railway resource: ${resourceId}`);
        await this.railwaySetupService.rollback(resourceId, token);
    }
}
