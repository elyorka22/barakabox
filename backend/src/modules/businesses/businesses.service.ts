import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';

@Injectable()
export class BusinessesService {
  constructor(private readonly prisma: PrismaService) {}

  async registerBusiness(userId: string, displayName: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.role !== 'BUSINESS') {
      throw new ForbiddenException('Only business users can register');
    }

    return this.prisma.businessProfile.upsert({
      where: { userId },
      create: { userId, displayName, status: 'PENDING' },
      update: { displayName, status: 'PENDING' },
    });
  }

  listPending() {
    return this.prisma.businessProfile.findMany({
      where: { status: 'PENDING' },
      include: { user: true },
    });
  }

  approve(businessId: string) {
    return this.prisma.businessProfile.update({
      where: { id: businessId },
      data: { status: 'APPROVED' },
    });
  }
}
