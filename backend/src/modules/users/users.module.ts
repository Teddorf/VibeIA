import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from './user.schema';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { EncryptionService } from './encryption.service';
import { createRepositoryProvider } from '../../providers/repository-providers.factory';
import { USER_REPOSITORY } from '../../providers/repository-tokens';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
  ],
  controllers: [UsersController],
  providers: [
    UsersService,
    EncryptionService,
    createRepositoryProvider(USER_REPOSITORY, User.name),
  ],
  exports: [UsersService, EncryptionService],
})
export class UsersModule {}
