import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { canLinkCustomerFromPhone, normalizeCustomerPhone } from './customers.utils';

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  async upsertByPhoneOnOrder(
    phoneRaw: string,
    name: string | undefined,
    tx: Prisma.TransactionClient,
  ) {
    const phone = normalizeCustomerPhone(phoneRaw);
    return tx.customer.upsert({
      where: { phone },
      create: { phone, name: name?.trim() || null },
      update: { ...(name?.trim() ? { name: name.trim() } : {}) },
    });
  }

  getBalanceByPhone(phoneRaw: string) {
    try {
      if (!canLinkCustomerFromPhone(phoneRaw)) {
        return Promise.resolve({ phone: null as string | null, cashbackBalanceTiyin: 0 });
      }
      const phone = normalizeCustomerPhone(phoneRaw);
      return this.prisma.customer.findUnique({ where: { phone } }).then((c) => ({
        phone,
        cashbackBalanceTiyin: c?.cashbackBalance ?? 0,
      }));
    } catch {
      return Promise.resolve({ phone: null as string | null, cashbackBalanceTiyin: 0 });
    }
  }

  listForAdmin() {
    return this.prisma.customer.findMany({
      orderBy: { updatedAt: 'desc' },
      take: 500,
    });
  }

  listTransactionsForAdmin() {
    return this.prisma.cashbackTransaction.findMany({
      orderBy: { createdAt: 'desc' },
      take: 500,
      include: {
        customer: { select: { phone: true, name: true } },
        order: { select: { id: true, status: true, totalAmount: true } },
      },
    });
  }
}
