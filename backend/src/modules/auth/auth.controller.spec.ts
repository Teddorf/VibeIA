import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Response, Request } from 'express';

describe('AuthController', () => {
    let controller: AuthController;
    let authService: AuthService;

    const mockAuthService = {
        register: jest.fn(),
        login: jest.fn(),
        refreshTokens: jest.fn(),
        logout: jest.fn(),
    };

    // Mock Response object for cookie operations
    const createMockResponse = (): Partial<Response> => ({
        cookie: jest.fn(),
        clearCookie: jest.fn(),
    });

    // Mock Request object with cookies
    const createMockRequest = (cookies: Record<string, string> = {}): Partial<Request> => ({
        cookies,
    });

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            imports: [
                ThrottlerModule.forRoot([{
                    ttl: 60000,
                    limit: 10,
                }])
            ],
            controllers: [AuthController],
            providers: [
                {
                    provide: AuthService,
                    useValue: mockAuthService,
                },
            ],
        })
            .overrideGuard(JwtAuthGuard)
            .useValue({ canActivate: () => true })
            .compile();

        controller = module.get<AuthController>(AuthController);
        authService = module.get<AuthService>(AuthService);

        // Reset mocks
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    describe('register', () => {
        it('should call authService.register and set cookies', async () => {
            const dto = { email: 'test@test.com', password: 'pass', name: 'test' };
            const mockTokens = {
                accessToken: 'access',
                refreshToken: 'refresh',
                user: { id: 'user-id', email: 'test@test.com', name: 'test' },
            };
            mockAuthService.register.mockResolvedValue(mockTokens);

            const res = createMockResponse() as Response;
            await controller.register(dto, res);

            expect(authService.register).toHaveBeenCalledWith(dto);
            expect(res.cookie).toHaveBeenCalled();
        });
    });

    describe('login', () => {
        it('should call authService.login and set cookies', async () => {
            const dto = { email: 'test@test.com', password: 'pass' };
            const mockTokens = {
                accessToken: 'access',
                refreshToken: 'refresh',
                user: { id: 'user-id', email: 'test@test.com', name: 'test' },
            };
            mockAuthService.login.mockResolvedValue(mockTokens);

            const res = createMockResponse() as Response;
            await controller.login(dto, res);

            expect(authService.login).toHaveBeenCalledWith(dto);
            expect(res.cookie).toHaveBeenCalled();
        });
    });

    describe('refresh', () => {
        it('should read refresh token from cookies when available', async () => {
            const mockTokens = {
                accessToken: 'new-access',
                refreshToken: 'new-refresh',
                user: { id: 'user-id', email: 'test@test.com', name: 'test' },
            };
            mockAuthService.refreshTokens.mockResolvedValue(mockTokens);

            const req = createMockRequest({
                refresh_token: 'cookie-refresh',
                user_id: 'cookie-user-id',
            }) as Request;
            const res = createMockResponse() as Response;

            await controller.refresh(req, res, {});

            expect(authService.refreshTokens).toHaveBeenCalledWith('cookie-user-id', 'cookie-refresh');
            expect(res.cookie).toHaveBeenCalled();
        });

        it('should fall back to body when cookies not present', async () => {
            const mockTokens = {
                accessToken: 'new-access',
                refreshToken: 'new-refresh',
                user: { id: 'user-id', email: 'test@test.com', name: 'test' },
            };
            mockAuthService.refreshTokens.mockResolvedValue(mockTokens);

            const req = createMockRequest({}) as Request;
            const res = createMockResponse() as Response;
            const body = { userId: 'body-user-id', refreshToken: 'body-refresh' };

            await controller.refresh(req, res, body);

            expect(authService.refreshTokens).toHaveBeenCalledWith('body-user-id', 'body-refresh');
        });

        it('should throw error when no refresh token provided', async () => {
            const req = createMockRequest({}) as Request;
            const res = createMockResponse() as Response;

            await expect(controller.refresh(req, res, {})).rejects.toThrow('Refresh token and user ID are required');
        });
    });

    describe('logout', () => {
        it('should call authService.logout and clear cookies', async () => {
            const res = createMockResponse() as Response;
            await controller.logout('user-id', res);

            expect(authService.logout).toHaveBeenCalledWith('user-id');
            expect(res.clearCookie).toHaveBeenCalled();
        });
    });
});
