import {
  SetMetadata,
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

/**
 * Available permissions in the system.
 * Format: resource:action
 */
export enum Permission {
  // Team permissions
  TEAM_READ = 'team:read',
  TEAM_WRITE = 'team:write',
  TEAM_DELETE = 'team:delete',
  TEAM_MANAGE = 'team:manage',

  // Project permissions
  PROJECT_READ = 'project:read',
  PROJECT_WRITE = 'project:write',
  PROJECT_DELETE = 'project:delete',

  // Member permissions
  MEMBER_INVITE = 'member:invite',
  MEMBER_REMOVE = 'member:remove',
  MEMBER_MANAGE = 'member:manage',

  // Plan/Execution permissions
  PLAN_CREATE = 'plan:create',
  PLAN_EXECUTE = 'plan:execute',

  // Admin permissions
  ADMIN_ALL = 'admin:all',
}

/**
 * Metadata key for RequirePermission decorator
 */
export const PERMISSIONS_KEY = 'permissions';

/**
 * Decorator that requires specific permissions to access a route.
 * User must have ALL specified permissions to be granted access.
 * Admin role bypasses permission checks.
 *
 * @param permissions - One or more permissions required
 *
 * @example
 * ```typescript
 * // Single permission
 * @RequirePermission(Permission.TEAM_READ)
 * @Get('teams')
 * getTeams() {}
 *
 * // Multiple permissions (user must have ALL)
 * @RequirePermission(Permission.TEAM_READ, Permission.TEAM_WRITE)
 * @Put('teams/:id')
 * updateTeam() {}
 * ```
 */
export const RequirePermission = (...permissions: Permission[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);

/**
 * Guard that validates user has required permissions.
 * Admin role automatically has all permissions.
 */
@Injectable()
export class RequirePermissionGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<Permission[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // No permissions required, allow access
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Admin role bypasses all permission checks
    if (user?.role === 'admin') {
      return true;
    }

    const userPermissions = user?.permissions || [];

    // Check if user has ALL required permissions
    const hasAllPermissions = requiredPermissions.every((permission) =>
      userPermissions.includes(permission),
    );

    if (!hasAllPermissions) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }
}
