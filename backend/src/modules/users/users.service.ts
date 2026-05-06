import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { Role, User } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  createUser(data: {
    email: string;
    fullName: string;
    passwordHash: string;
    role?: Role;
  }): Promise<User> {
    return this.prisma.user.create({
      data: {
        email: data.email,
        fullName: data.fullName,
        passwordHash: data.passwordHash,
        role: data.role ?? Role.CLIENT,
      },
    });
  }

  updateRefreshToken(userId: string, refreshToken: string | null): Promise<User> {
    return this.prisma.user.update({
      where: { id: userId },
      data: { refreshToken },
    });
  }

  ensureGuestUser(guestId: string): Promise<User> {
    const normalizedGuestId = guestId.trim().toLowerCase();
    const email = `guest-${normalizedGuestId}@barakabox.local`;
    return this.prisma.user.upsert({
      where: { email },
      create: {
        email,
        fullName: `Guest ${normalizedGuestId.slice(0, 8)}`,
        passwordHash: 'guest-account',
        role: Role.CLIENT,
      },
      update: {},
    });
  }
}
