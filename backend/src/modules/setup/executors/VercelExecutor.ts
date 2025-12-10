import { Injectable, Logger } from '@nestjs/common';
import { ISetupExecutor } from './ISetupExecutor';
import { VercelSetupService } from '../vercel-setup.service';
import { SetupProvider, SetupOrchestratorConfig, SetupTask, VercelSetupResult, VercelEnvironmentVariable } from '../dto/setup.dto';
import { SetupStateDocument } from '../schemas/setup-state.schema';

@Injectable()
export class VercelExecutor implements ISetupExecutor {
    private readonly logger = new Logger(VercelExecutor.name);

    constructor(private readonly vercelSetupService: VercelSetupService) { }

    canExecute(provider: SetupProvider): boolean {
        return provider === SetupProvider.VERCEL;
    }

    async execute(
        config: SetupOrchestratorConfig,
        state: SetupStateDocument,
        task: SetupTask,
        token?: string,
    ): Promise<VercelSetupResult> {
        if (!config.providers.vercel) {
            throw new Error('Vercel configuration missing');
        }

        this.logger.log(`Executing Vercel setup task: ${task.id}`);

        // Prepare env vars for Vercel
        const envVars: VercelEnvironmentVariable[] = [];
        if (state.credentials?.databaseUrl) {
            envVars.push({
                key: 'DATABASE_URL',
                value: state.credentials.databaseUrl,
                target: ['production', 'preview'],
            });
        }

        if (config.envVars) {
            for (const [key, value] of Object.entries(config.envVars)) {
                envVars.push({
                    key,
                    value,
                    target: ['production', 'preview', 'development'],
                });
            }
        }

        const result = await this.vercelSetupService.execute(
            config.providers.vercel,
            envVars,
            undefined, // gitSource
            token,
        );

        return result as VercelSetupResult;
    }

    async rollback(resourceId: string, token?: string): Promise<void> {
        this.logger.log(`Rolling back Vercel resource: ${resourceId}`);
        await this.vercelSetupService.rollback(resourceId, token);
    }
}
