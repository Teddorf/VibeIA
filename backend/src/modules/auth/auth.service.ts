import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService, CreateUserDto } from '../users/users.service';
import { UserDocument } from '../users/user.schema';

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
}

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface RegisterDto {
  email: string;
  password: string;
  name: string;
}

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) { }

  async register(registerDto: RegisterDto): Promise<TokenResponse> {
    // Validate input
    if (!registerDto.email || !registerDto.password || !registerDto.name) {
      throw new BadRequestException('Email, password, and name are required');
    }

    if (registerDto.password.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters');
    }

    // Create user
    const user = await this.usersService.create(registerDto);

    // Generate tokens
    return this.generateTokens(user);
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
    const isPasswordValid = await this.usersService.validatePassword(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Update last login
    await this.usersService.updateLastLogin(user._id.toString());

    // Generate tokens
    return this.generateTokens(user);
  }

  async refreshTokens(userId: string, refreshToken: string): Promise<TokenResponse> {
    // Validate refresh token
    const isValid = await this.usersService.validateRefreshToken(userId, refreshToken);
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
      expiresIn: '15m',
    });

    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: '7d',
    });

    // Store refresh token hash
    await this.usersService.updateRefreshToken(user._id.toString(), refreshToken);

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
}
