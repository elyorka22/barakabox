import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';

@Injectable()
export class CartService {
  constructor(private readonly prisma: PrismaService) {}

  private async getOrCreateCart(userId: string) {
    const existing = await this.prisma.cart.findUnique({ where: { userId } });
    if (existing) return existing;
    return this.prisma.cart.create({ data: { userId } });
  }

  async getCart(userId: string) {
    const cart = await this.getOrCreateCart(userId);
    return this.prisma.cart.findUnique({
      where: { id: cart.id },
      include: { items: { include: { product: true, box: { include: { items: { include: { product: true } } } } } } },
    });
  }

  async addItem(userId: string, productId: string, quantity: number) {
    if (quantity === 0) {
      throw new BadRequestException('Quantity cannot be zero');
    }
    const cart = await this.getOrCreateCart(userId);
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product || !product.isActive) {
      throw new NotFoundException('Product not found');
    }
    const existing = await this.prisma.cartItem.findUnique({
      where: { cartId_productId: { cartId: cart.id, productId } },
    });
    if (!existing && quantity < 0) {
      throw new NotFoundException('Cart item not found');
    }
    if (existing) {
      const nextQty = existing.quantity + quantity;
      if (nextQty <= 0) {
        await this.prisma.cartItem.delete({ where: { id: existing.id } });
      } else {
        await this.prisma.cartItem.update({
          where: { id: existing.id },
          data: { quantity: nextQty },
        });
      }
    } else {
      await this.prisma.cartItem.create({
        data: { cartId: cart.id, productId, quantity },
      });
    }
    return this.getCart(userId);
  }

  async addBoxItem(userId: string, boxId: string, quantity: number) {
    if (quantity <= 0) {
      throw new BadRequestException('Quantity must be greater than zero');
    }
    const cart = await this.getOrCreateCart(userId);
    const box = await this.prisma.box.findUnique({ where: { id: boxId } });
    if (!box || !box.isActive) {
      throw new NotFoundException('Box not found');
    }
    await this.prisma.cartItem.upsert({
      where: { cartId_boxId: { cartId: cart.id, boxId } },
      update: { quantity: { increment: quantity } },
      create: { cartId: cart.id, boxId, quantity },
    });
    return this.getCart(userId);
  }

  async removeItem(userId: string, productId: string) {
    const cart = await this.getOrCreateCart(userId);
    const existing = await this.prisma.cartItem.findUnique({
      where: { cartId_productId: { cartId: cart.id, productId } },
    });
    if (!existing) throw new NotFoundException('Cart item not found');
    await this.prisma.cartItem.delete({ where: { id: existing.id } });
    return this.getCart(userId);
  }

  async removeBoxItem(userId: string, boxId: string) {
    const cart = await this.getOrCreateCart(userId);
    const existing = await this.prisma.cartItem.findUnique({
      where: { cartId_boxId: { cartId: cart.id, boxId } },
    });
    if (!existing) throw new NotFoundException('Cart item not found');
    await this.prisma.cartItem.delete({ where: { id: existing.id } });
    return this.getCart(userId);
  }

  async clear(userId: string) {
    const cart = await this.getOrCreateCart(userId);
    await this.prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
  }
}
