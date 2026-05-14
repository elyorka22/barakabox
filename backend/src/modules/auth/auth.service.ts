import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { Role, User } from '@prisma/client';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async register(email: string, fullName: string, password: string): Promise<{
    accessToken: string;
    refreshToken: string;
    user: ReturnType<typeof this.serializeUser>;
  }> {
    const existing = await this.usersService.findByEmail(email);
    if (existing) {
      throw new UnauthorizedException('Email already exists');
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await this.usersService.createUser({
      email,
      fullName,
      passwordHash,
      role: Role.CLIENT,
    });
    return this.issueTokens(user);
  }

  async login(identifier: string, password: string) {
    const user = await this.usersService.findByStaffLoginOrEmail(identifier);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    if (!user.isActive) {
      throw new UnauthorizedException('Account disabled');
    }
    if (user.passwordHash === 'guest-account') {
      throw new UnauthorizedException('Invalid credentials');
    }

    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) {
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.usersService.updateLastLogin(user.id);
    return this.issueTokens(user);
  }

  async refresh(refreshToken: string) {
    let payload: { sub: string };
    try {
      payload = this.jwtService.verify<{ sub: string }>(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET!,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown';
      this.logger.warn(
        JSON.stringify({
          event: 'refresh_failed',
          reason: message.includes('expired') ? 'token_expired' : 'invalid_token',
          error: message,
        }),
      );
      throw new UnauthorizedException('Refresh token yaroqsiz yoki muddati tugagan');
    }

    const user = await this.usersService.findById(payload.sub);
    if (!user || !user.refreshToken) {
      this.logger.warn(
        JSON.stringify({
          event: 'refresh_failed',
          reason: 'token_not_found_in_db',
          userId: payload.sub,
        }),
      );
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account disabled');
    }

    const refreshTokenMatches = await bcrypt.compare(refreshToken, user.refreshToken);
    if (!refreshTokenMatches) {
      this.logger.warn(
        JSON.stringify({
          event: 'refresh_failed',
          reason: 'token_hash_mismatch',
          userId: user.id,
        }),
      );
      throw new UnauthorizedException('Invalid refresh token');
    }

    this.logger.log(
      JSON.stringify({
        event: 'token_refreshed',
        userId: user.id,
      }),
    );
    return this.issueTokens(user);
  }

  async logout(refreshToken: string) {
    try {
      const payload = this.jwtService.verify<{ sub: string }>(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET!,
      });
      const user = await this.usersService.findById(payload.sub);
      if (user?.refreshToken) {
        const matches = await bcrypt.compare(refreshToken, user.refreshToken);
        if (matches) {
          await this.usersService.updateRefreshToken(user.id, null);
          this.logger.log(
            JSON.stringify({
              event: 'logout',
              userId: user.id,
            }),
          );
        }
      }
    } catch (error) {
      this.logger.warn(
        JSON.stringify({
          event: 'logout',
          result: 'token_invalid_or_expired',
          error: error instanceof Error ? error.message : 'unknown',
        }),
      );
    }
    return { success: true };
  }

  private serializeUser(user: User) {
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      staffLogin: user.staffLogin ?? null,
      phone: user.phone ?? null,
      businessScopeId: user.businessScopeId ?? null,
      isActive: user.isActive,
    };
  }

  private async issueTokens(user: User) {
    const payload = { sub: user.id, role: user.role, email: user.email };
    const accessToken = await this.jwtService.signAsync(payload, {
      secret: process.env.JWT_ACCESS_SECRET!,
      expiresIn: '15m',
    });
    const refreshToken = await this.jwtService.signAsync(payload, {
      secret: process.env.JWT_REFRESH_SECRET!,
      expiresIn: '30d',
    });

    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);
    await this.usersService.updateRefreshToken(user.id, refreshTokenHash);
    this.logger.log(
      JSON.stringify({
        event: 'token_issued',
        userId: user.id,
      }),
    );

    return {
      accessToken,
      refreshToken,
      user: this.serializeUser(user),
    };
  }
}
