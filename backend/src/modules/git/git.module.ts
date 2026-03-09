import { Module, forwardRef } from '@nestjs/common';
import { GitService } from './git.service';
import { GitController } from './git.controller';
import { UsersModule } from '../users/users.module';
import { AuthModule } from '../auth/auth.module';
import { GIT_HOST_PROVIDER } from '../../providers/tokens';
import { GitHubHostAdapter } from '../../providers/adapters/github-host.adapter';

@Module({
  imports: [UsersModule, forwardRef(() => AuthModule)],
  controllers: [GitController],
  providers: [
    GitService,
    {
      provide: GIT_HOST_PROVIDER,
      useClass: GitHubHostAdapter,
    },
  ],
  exports: [GitService, GIT_HOST_PROVIDER],
})
export class GitModule {}
