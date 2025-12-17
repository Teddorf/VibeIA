import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import {
  RequirePermission,
  PERMISSIONS_KEY,
  RequirePermissionGuard,
  Permission,
} from './require-permission.decorator';

describe('RequirePermission Decorator', () => {
  describe('RequirePermission metadata decorator', () => {
    it('should set PERMISSIONS_KEY metadata with single permission', () => {
      class TestController {
        @RequirePermission(Permission.TEAM_READ)
        testMethod() {}
      }

      const reflector = new Reflector();
      const metadata = reflector.get(PERMISSIONS_KEY, TestController.prototype.testMethod);

      expect(metadata).toEqual([Permission.TEAM_READ]);
    });

    it('should set PERMISSIONS_KEY metadata with multiple permissions', () => {
      class TestController {
        @RequirePermission(Permission.TEAM_READ, Permission.TEAM_WRITE)
        testMethod() {}
      }

      const reflector = new Reflector();
      const metadata = reflector.get(PERMISSIONS_KEY, TestController.prototype.testMethod);

      expect(metadata).toEqual([Permission.TEAM_READ, Permission.TEAM_WRITE]);
    });

    it('should be applicable to class', () => {
      @RequirePermission(Permission.PROJECT_READ)
      class TestController {}

      const reflector = new Reflector();
      const metadata = reflector.get(PERMISSIONS_KEY, TestController);

      expect(metadata).toEqual([Permission.PROJECT_READ]);
    });
  });

  describe('RequirePermissionGuard', () => {
    let guard: RequirePermissionGuard;
    let reflector: Reflector;

    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          RequirePermissionGuard,
          {
            provide: Reflector,
            useValue: {
              getAllAndOverride: jest.fn(),
            },
          },
        ],
      }).compile();

      guard = module.get<RequirePermissionGuard>(RequirePermissionGuard);
      reflector = module.get<Reflector>(Reflector);
    });

    const createMockExecutionContext = (user: any = null): ExecutionContext =>
      ({
        switchToHttp: () => ({
          getRequest: () => ({ user }),
        }),
        getHandler: () => jest.fn(),
        getClass: () => jest.fn(),
      }) as unknown as ExecutionContext;

    it('should be defined', () => {
      expect(guard).toBeDefined();
    });

    it('should allow access when no permissions are required', () => {
      const context = createMockExecutionContext({ userId: 'user-123', role: 'user' });
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should allow access when user has required permission', () => {
      const context = createMockExecutionContext({
        userId: 'user-123',
        role: 'admin',
        permissions: [Permission.TEAM_READ, Permission.TEAM_WRITE],
      });
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Permission.TEAM_READ]);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should allow access when user has all required permissions', () => {
      const context = createMockExecutionContext({
        userId: 'user-123',
        role: 'admin',
        permissions: [Permission.TEAM_READ, Permission.TEAM_WRITE, Permission.PROJECT_READ],
      });
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValue([Permission.TEAM_READ, Permission.PROJECT_READ]);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should throw ForbiddenException when user lacks required permission', () => {
      const context = createMockExecutionContext({
        userId: 'user-123',
        role: 'user',
        permissions: [Permission.PROJECT_READ],
      });
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Permission.TEAM_WRITE]);

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException when user has no permissions', () => {
      const context = createMockExecutionContext({
        userId: 'user-123',
        role: 'user',
        permissions: [],
      });
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Permission.TEAM_READ]);

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException when user object is missing permissions array', () => {
      const context = createMockExecutionContext({
        userId: 'user-123',
        role: 'user',
      });
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Permission.TEAM_READ]);

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('should allow admin role to bypass permission checks', () => {
      const context = createMockExecutionContext({
        userId: 'user-123',
        role: 'admin',
        permissions: [], // Admin with no explicit permissions
      });
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Permission.TEAM_WRITE]);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should throw with descriptive message about missing permissions', () => {
      const context = createMockExecutionContext({
        userId: 'user-123',
        role: 'user',
        permissions: [Permission.PROJECT_READ],
      });
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Permission.TEAM_WRITE]);

      expect(() => guard.canActivate(context)).toThrow('Insufficient permissions');
    });
  });

  describe('Permission enum', () => {
    it('should have team permissions', () => {
      expect(Permission.TEAM_READ).toBe('team:read');
      expect(Permission.TEAM_WRITE).toBe('team:write');
      expect(Permission.TEAM_DELETE).toBe('team:delete');
      expect(Permission.TEAM_MANAGE).toBe('team:manage');
    });

    it('should have project permissions', () => {
      expect(Permission.PROJECT_READ).toBe('project:read');
      expect(Permission.PROJECT_WRITE).toBe('project:write');
      expect(Permission.PROJECT_DELETE).toBe('project:delete');
    });

    it('should have member permissions', () => {
      expect(Permission.MEMBER_INVITE).toBe('member:invite');
      expect(Permission.MEMBER_REMOVE).toBe('member:remove');
      expect(Permission.MEMBER_MANAGE).toBe('member:manage');
    });
  });
});
