import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';

@Injectable()
export class BoxesService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.box.findMany({
      where: { isActive: true },
      include: { items: { include: { product: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getById(id: string) {
    const box = await this.prisma.box.findUnique({
      where: { id },
      include: { items: { include: { product: true } } },
    });
    if (!box || !box.isActive) {
      throw new NotFoundException('Box not found');
    }
    return box;
  }
}
