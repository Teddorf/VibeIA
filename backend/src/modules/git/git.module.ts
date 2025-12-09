import { Module, forwardRef } from '@nestjs/common';
import { GitService } from './git.service';
import { GitController } from './git.controller';
import { UsersModule } from '../users/users.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    UsersModule,
    forwardRef(() => AuthModule),
  ],
  controllers: [GitController],
  providers: [GitService],
  exports: [GitService],
})
export class GitModule {}