import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { RequireAuth, REQUIRE_AUTH_KEY, RequireAuthGuard } from './require-auth.decorator';

describe('RequireAuth Decorator', () => {
  describe('RequireAuth metadata decorator', () => {
    it('should set REQUIRE_AUTH_KEY metadata to true', () => {
      @RequireAuth()
      class TestController {}

      const reflector = new Reflector();
      const metadata = reflector.get(REQUIRE_AUTH_KEY, TestController);

      expect(metadata).toBe(true);
    });

    it('should be applicable to methods', () => {
      class TestController {
        @RequireAuth()
        testMethod() {}
      }

      const reflector = new Reflector();
      const metadata = reflector.get(REQUIRE_AUTH_KEY, TestController.prototype.testMethod);

      expect(metadata).toBe(true);
    });
  });

  describe('RequireAuthGuard', () => {
    let guard: RequireAuthGuard;
    let reflector: Reflector;

    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          RequireAuthGuard,
          {
            provide: Reflector,
            useValue: {
              getAllAndOverride: jest.fn(),
            },
          },
        ],
      }).compile();

      guard = module.get<RequireAuthGuard>(RequireAuthGuard);
      reflector = module.get<Reflector>(Reflector);
    });

    const createMockExecutionContext = (user: any = null): ExecutionContext => ({
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
      getHandler: () => jest.fn(),
      getClass: () => jest.fn(),
    } as unknown as ExecutionContext);

    it('should be defined', () => {
      expect(guard).toBeDefined();
    });

    it('should allow access when user is authenticated and has userId', () => {
      const context = createMockExecutionContext({ userId: 'user-123', email: 'test@example.com' });
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should throw UnauthorizedException when user is null', () => {
      const context = createMockExecutionContext(null);
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);

      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when user has no userId', () => {
      const context = createMockExecutionContext({ email: 'test@example.com' });
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);

      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
    });

    it('should allow access when RequireAuth metadata is not set (default behavior)', () => {
      const context = createMockExecutionContext({ userId: 'user-123' });
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should throw with custom message when user is not authenticated', () => {
      const context = createMockExecutionContext(null);
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);

      expect(() => guard.canActivate(context)).toThrow('Authentication required');
    });
  });
});
