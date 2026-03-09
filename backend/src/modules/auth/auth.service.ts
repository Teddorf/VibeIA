import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService, CreateUserDto } from '../users/users.service';
import { UserDocument } from '../users/user.schema';
import { ACCESS_TOKEN_EXPIRY, REFRESH_TOKEN_EXPIRY } from './auth.constants';
import {
  LoginDto,
  RegisterDto,
  TokenResponse,
  JwtPayload,
} from './dto/auth.dto';

// Re-export for backward compatibility
export { LoginDto, RegisterDto } from './dto/auth.dto';
export type { TokenResponse, JwtPayload } from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto): Promise<TokenResponse> {
    // Validate input
    if (!registerDto.email || !registerDto.password || !registerDto.name) {
      throw new BadRequestException('Email, password, and name are required');
    }

    this.validatePasswordStrength(registerDto.password);

    // Create user
    const user = await this.usersService.create(registerDto);

    // Generate tokens
    return this.generateTokens(user);
  }

  private validatePasswordStrength(password: string): void {
    if (password.length < 12) {
      throw new BadRequestException('Password must be at least 12 characters');
    }

    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    if (!hasUpperCase || !hasLowerCase || !hasNumbers || !hasSpecialChar) {
      throw new BadRequestException(
        'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
      );
    }
  }

  async login(loginDto: LoginDto): Promise<TokenResponse> {
    const { email, password } = loginDto;

    // Find user
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if user is active
    if (!user.isActive) {
      throw new UnauthorizedException('Account is disabled');
    }

    // Validate password
    const isPasswordValid = await this.usersService.validatePassword(
      password,
      user.password,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Update last login
    await this.usersService.updateLastLogin(user._id.toString());

    // Generate tokens
    return this.generateTokens(user);
  }

  async refreshTokens(
    userId: string,
    refreshToken: string,
  ): Promise<TokenResponse> {
    // IDOR Prevention: First verify the token exists and get its owner
    const tokenOwner =
      await this.usersService.findRefreshTokenOwner(refreshToken);

    if (!tokenOwner) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // IDOR Prevention: Verify the userId matches the token owner
    if (tokenOwner !== userId) {
      throw new UnauthorizedException('Token does not belong to this user');
    }

    // Validate refresh token (additional validation)
    const isValid = await this.usersService.validateRefreshToken(
      userId,
      refreshToken,
    );
    if (!isValid) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Get user
    const user = await this.usersService.findById(userId);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found or inactive');
    }

    // Generate new tokens
    return this.generateTokens(user);
  }

  async logout(userId: string): Promise<void> {
    // Clear refresh token
    await this.usersService.updateRefreshToken(userId, null);
  }

  async validateUser(payload: JwtPayload): Promise<UserDocument | null> {
    const user = await this.usersService.findById(payload.sub);
    if (!user || !user.isActive) {
      return null;
    }
    return user;
  }

  private async generateTokens(user: UserDocument): Promise<TokenResponse> {
    const payload: JwtPayload = {
      sub: user._id.toString(),
      email: user.email,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: ACCESS_TOKEN_EXPIRY,
    });

    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: REFRESH_TOKEN_EXPIRY,
    });

    // Store refresh token hash
    await this.usersService.updateRefreshToken(
      user._id.toString(),
      refreshToken,
    );

    return {
      accessToken,
      refreshToken,
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  }
  async forgotPassword(email: string): Promise<{ token: string } | null> {
    const result = await this.usersService.setPasswordResetToken(email);
    if (!result) {
      return null;
    }
    return { token: result.token };
  }

  async resetPassword(token: string, newPassword: string): Promise<boolean> {
    return this.usersService.resetPassword(token, newPassword);
  }

  async verifyResetToken(token: string): Promise<boolean> {
    return this.usersService.verifyResetToken(token);
  }

  /**
   * OAuth Login/Register - finds or creates user and generates tokens
   */
  async loginWithOAuth(
    provider: 'github' | 'google' | 'gitlab',
    providerUserId: string,
    email: string,
    name: string,
    accessToken: string,
    username?: string,
  ): Promise<TokenResponse> {
    let user: UserDocument | null = null;

    // Try to find existing user by provider ID
    if (provider === 'github') {
      user = await this.usersService.findByGitHubId(providerUserId);
    } else if (provider === 'google') {
      user = await this.usersService.findByGoogleId(providerUserId);
    } else if (provider === 'gitlab') {
      user = await this.usersService.findByGitLabId(providerUserId);
    }

    // If not found by provider ID, try by email
    if (!user && email) {
      user = await this.usersService.findByEmail(email);
    }

    // If still no user, create a new one
    if (!user) {
      // Generate a random password for OAuth users (they won't use it)
      const randomPassword = this.generateSecurePassword();

      user = await this.usersService.create({
        email: email || `${provider}-${providerUserId}@oauth.local`,
        password: randomPassword,
        name: name || username || 'OAuth User',
      });
    }

    // Connect the OAuth provider to the user
    if (provider === 'github') {
      await this.usersService.connectGitHub(
        user._id.toString(),
        providerUserId,
        accessToken,
        username || '',
      );
    } else if (provider === 'google') {
      await this.usersService.connectGoogle(
        user._id.toString(),
        providerUserId,
        accessToken,
        email,
        name,
      );
    } else if (provider === 'gitlab') {
      await this.usersService.connectGitLab(
        user._id.toString(),
        providerUserId,
        accessToken,
        username || '',
        email,
      );
    }

    // Update last login
    await this.usersService.updateLastLogin(user._id.toString());

    // Generate tokens
    return this.generateTokens(user);
  }

  private generateSecurePassword(): string {
    const chars =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 32; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }
}
