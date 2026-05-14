import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { canLinkCustomerFromPhone, normalizeCustomerPhone } from './customers.utils';
import type { CreateCustomerAddressDto } from './dto/customer-address.dto';

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

  async listAddressesByPhone(phoneRaw: string) {
    const phone = normalizeCustomerPhone(phoneRaw);
    const customer = await this.prisma.customer.findUnique({ where: { phone } });
    if (!customer) return [];
    return this.prisma.customerAddress.findMany({
      where: { customerId: customer.id },
      orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }],
    });
  }

  async createCustomerAddress(dto: CreateCustomerAddressDto) {
    const phone = normalizeCustomerPhone(dto.phone);
    const lat = dto.latitude;
    const lng = dto.longitude;
    const customer = await this.prisma.customer.upsert({
      where: { phone },
      create: { phone },
      update: {},
    });

    const siblings = await this.prisma.customerAddress.findMany({
      where: { customerId: customer.id },
      select: { id: true, latitude: true, longitude: true },
    });
    const duplicate = siblings.find(
      (a) => Math.abs(a.latitude - lat) < 0.00015 && Math.abs(a.longitude - lng) < 0.00015,
    );
    if (duplicate) {
      throw new BadRequestException('Bu joylashuv allaqachon saqlangan');
    }

    if (dto.isDefault) {
      await this.prisma.customerAddress.updateMany({
        where: { customerId: customer.id },
        data: { isDefault: false },
      });
    }

    return this.prisma.customerAddress.create({
      data: {
        customerId: customer.id,
        label: dto.label.trim(),
        address: dto.address?.trim() ?? '',
        latitude: lat,
        longitude: lng,
        isDefault: Boolean(dto.isDefault),
      },
    });
  }

  async deleteCustomerAddress(phoneRaw: string, addressId: string) {
    const phone = normalizeCustomerPhone(phoneRaw);
    const customer = await this.prisma.customer.findUnique({ where: { phone } });
    if (!customer) throw new NotFoundException('Mijoz topilmadi');
    const row = await this.prisma.customerAddress.findFirst({
      where: { id: addressId, customerId: customer.id },
    });
    if (!row) throw new NotFoundException('Manzil topilmadi');
    await this.prisma.customerAddress.delete({ where: { id: addressId } });
    return { ok: true };
  }

  async setDefaultCustomerAddress(phoneRaw: string, addressId: string) {
    const phone = normalizeCustomerPhone(phoneRaw);
    const customer = await this.prisma.customer.findUnique({ where: { phone } });
    if (!customer) throw new NotFoundException('Mijoz topilmadi');
    const row = await this.prisma.customerAddress.findFirst({
      where: { id: addressId, customerId: customer.id },
    });
    if (!row) throw new NotFoundException('Manzil topilmadi');
    await this.prisma.$transaction([
      this.prisma.customerAddress.updateMany({
        where: { customerId: customer.id },
        data: { isDefault: false },
      }),
      this.prisma.customerAddress.update({
        where: { id: addressId },
        data: { isDefault: true },
      }),
    ]);
    return this.prisma.customerAddress.findMany({
      where: { customerId: customer.id },
      orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }],
    });
  }
}
