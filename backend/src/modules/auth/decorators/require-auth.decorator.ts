import {
  SetMetadata,
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

/**
 * Metadata key for RequireAuth decorator
 */
export const REQUIRE_AUTH_KEY = 'requireAuth';

/**
 * Decorator that explicitly requires authentication.
 * While JwtAuthGuard is applied globally, this decorator provides:
 * 1. Explicit documentation of auth requirements
 * 2. Additional validation that user object has userId
 * 3. Can be combined with other decorators for cleaner code
 *
 * @example
 * ```typescript
 * @RequireAuth()
 * @Get('profile')
 * getProfile(@CurrentUser('userId') userId: string) {
 *   return this.usersService.findById(userId);
 * }
 * ```
 */
export const RequireAuth = () => SetMetadata(REQUIRE_AUTH_KEY, true);

/**
 * Guard that validates RequireAuth metadata.
 * Ensures the user object exists and has a valid userId.
 */
@Injectable()
export class RequireAuthGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requireAuth = this.reflector.getAllAndOverride<boolean>(REQUIRE_AUTH_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // If @RequireAuth() is not applied, let the request through
    // (global JwtAuthGuard handles default auth)
    if (!requireAuth) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.userId) {
      throw new UnauthorizedException('Authentication required');
    }

    return true;
  }
}
