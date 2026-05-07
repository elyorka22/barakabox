import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../infrastructure/database/prisma.service';

@Injectable()
export class CartService {
  private readonly logger = new Logger(CartService.name);

  constructor(private readonly prisma: PrismaService) {}

  private handlePrismaError(error: unknown, context: Record<string, unknown>): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      this.logger.error(
        JSON.stringify({
          event: 'cart_prisma_known_error',
          code: error.code,
          meta: error.meta,
          context,
        }),
      );
      if (error.code === 'P2002') {
        throw new BadRequestException('Savat elementi allaqachon mavjud');
      }
      if (error.code === 'P2003') {
        throw new BadRequestException("Bog'liq ma'lumot topilmadi");
      }
      if (error.code === 'P2025') {
        throw new NotFoundException("Savat elementi topilmadi");
      }
      throw new BadRequestException("Savat so'rovini bajarishda xatolik");
    }

    if (error instanceof Prisma.PrismaClientValidationError) {
      this.logger.error(
        JSON.stringify({
          event: 'cart_prisma_validation_error',
          message: error.message,
          context,
        }),
      );
      throw new BadRequestException("Noto'g'ri savat so'rovi");
    }

    this.logger.error(
      JSON.stringify({
        event: 'cart_unknown_error',
        context,
        error: error instanceof Error ? error.message : 'unknown',
      }),
    );
    throw new InternalServerErrorException("Savat amaliyotida ichki xatolik yuz berdi");
  }

  private async getOrCreateCart(userId: string) {
    try {
      const existing = await this.prisma.cart.findUnique({ where: { userId } });
      if (existing) return existing;
      return this.prisma.cart.create({ data: { userId } });
    } catch (error) {
      this.handlePrismaError(error, { action: 'getOrCreateCart', userId });
    }
  }

  async getCart(userId: string) {
    try {
      const cart = await this.getOrCreateCart(userId);
      return this.prisma.cart.findUnique({
        where: { id: cart.id },
        include: {
          items: {
            include: {
              product: true,
              variant: true,
              box: { include: { items: { include: { product: true } } } },
            },
          },
        },
      });
    } catch (error) {
      this.handlePrismaError(error, { action: 'getCart', userId });
    }
  }

  async addItem(userId: string, productId: string | undefined, variantId: string | undefined, quantity: number) {
    if (quantity === 0) {
      throw new BadRequestException('Quantity cannot be zero');
    }
    if (!productId && !variantId) {
      throw new BadRequestException('productId yoki variantId yuborilishi shart');
    }
    try {
      const cart = await this.getOrCreateCart(userId);
      const variant = variantId
        ? await this.prisma.productVariant.findUnique({
            where: { id: variantId },
            include: { product: true },
          })
        : null;
      const resolvedProductId = variant?.productId ?? productId;
      const product = await this.prisma.product.findUnique({ where: { id: resolvedProductId } });
      if (!product || !product.isActive || (variant && !variant.isActive)) {
        throw new NotFoundException('Product/variant not found');
      }
      const existing = variantId
        ? await this.prisma.cartItem.findUnique({
            where: { cartId_variantId: { cartId: cart.id, variantId } },
          })
        : await this.prisma.cartItem.findUnique({
            where: { cartId_productId: { cartId: cart.id, productId: resolvedProductId! } },
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
          data: {
            cartId: cart.id,
            productId: resolvedProductId,
            variantId: variantId ?? null,
            quantity,
          },
        });
      }
      return this.getCart(userId);
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      this.handlePrismaError(error, { action: 'addItem', userId, productId, variantId, quantity });
    }
  }

  async addBoxItem(userId: string, boxId: string, quantity: number) {
    if (quantity <= 0) {
      throw new BadRequestException('Quantity must be greater than zero');
    }
    try {
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
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      this.handlePrismaError(error, { action: 'addBoxItem', userId, boxId, quantity });
    }
  }

  async removeItem(userId: string, productId?: string, variantId?: string) {
    try {
      const cart = await this.getOrCreateCart(userId);
      const existing = variantId
        ? await this.prisma.cartItem.findUnique({
            where: { cartId_variantId: { cartId: cart.id, variantId } },
          })
        : productId
        ? await this.prisma.cartItem.findUnique({
            where: { cartId_productId: { cartId: cart.id, productId } },
          })
        : null;
      if (!existing) throw new NotFoundException('Cart item not found');
      await this.prisma.cartItem.delete({ where: { id: existing.id } });
      return this.getCart(userId);
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.handlePrismaError(error, { action: 'removeItem', userId, productId, variantId });
    }
  }

  async removeBoxItem(userId: string, boxId: string) {
    try {
      const cart = await this.getOrCreateCart(userId);
      const existing = await this.prisma.cartItem.findUnique({
        where: { cartId_boxId: { cartId: cart.id, boxId } },
      });
      if (!existing) throw new NotFoundException('Cart item not found');
      await this.prisma.cartItem.delete({ where: { id: existing.id } });
      return this.getCart(userId);
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.handlePrismaError(error, { action: 'removeBoxItem', userId, boxId });
    }
  }

  async clear(userId: string) {
    try {
      const cart = await this.getOrCreateCart(userId);
      await this.prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
    } catch (error) {
      this.handlePrismaError(error, { action: 'clear', userId });
    }
  }
}
