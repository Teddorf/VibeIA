import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

describe('AuthController', () => {
    let controller: AuthController;
    let authService: AuthService;

    const mockAuthService = {
        register: jest.fn(),
        login: jest.fn(),
        refreshTokens: jest.fn(),
        logout: jest.fn(),
    };

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
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    describe('register', () => {
        it('should call authService.register', async () => {
            const dto = { email: 'test@test.com', password: 'pass', name: 'test' };
            await controller.register(dto);
            expect(authService.register).toHaveBeenCalledWith(dto);
        });
    });

    describe('login', () => {
        it('should call authService.login', async () => {
            const dto = { email: 'test@test.com', password: 'pass' };
            await controller.login(dto);
            expect(authService.login).toHaveBeenCalledWith(dto);
        });
    });

    describe('refresh', () => {
        it('should call authService.refreshTokens', async () => {
            const body = { userId: '1', refreshToken: 'ref' };
            await controller.refresh(body);
            expect(authService.refreshTokens).toHaveBeenCalledWith(body.userId, body.refreshToken);
        });
    });

    describe('logout', () => {
        it('should call authService.logout', async () => {
            await controller.logout('1');
            expect(authService.logout).toHaveBeenCalledWith('1');
        });
    });
});
