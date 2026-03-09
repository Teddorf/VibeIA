import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { GitHubAuthController } from './github-auth.controller';
import { GoogleAuthController } from './google-auth.controller';
import { GitLabAuthController } from './gitlab-auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { OAuthStateService } from './services/oauth-state.service';
import { UsersModule } from '../users/users.module';
import { GitModule } from '../git/git.module';
import { SecurityModule } from '../security/security.module';
import { ACCESS_TOKEN_EXPIRY, DEFAULT_JWT_SECRET } from './auth.constants';

@Module({
  imports: [
    ConfigModule,
    UsersModule,
    forwardRef(() => GitModule),
    SecurityModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      secret: process.env.JWT_SECRET || DEFAULT_JWT_SECRET,
      signOptions: {
        expiresIn: ACCESS_TOKEN_EXPIRY,
      },
    }),
  ],
  controllers: [
    AuthController,
    GitHubAuthController,
    GoogleAuthController,
    GitLabAuthController,
  ],
  providers: [
    AuthService,
    JwtStrategy,
    OAuthStateService,
    // Register JwtAuthGuard globally - routes can opt-out with @Public()
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    // Register RolesGuard globally - routes can require roles with @Roles()
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
  exports: [AuthService, JwtModule, OAuthStateService],
})
export class AuthModule {}
