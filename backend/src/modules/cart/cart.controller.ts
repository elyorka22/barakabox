import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpException,
  InternalServerErrorException,
  Logger,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { JwtService } from '@nestjs/jwt';
import { CartService } from './cart.service';
import { UsersService } from '../users/users.service';
import { AddCartBoxDto, AddCartItemDto, RemoveCartBoxDto, RemoveCartItemDto } from './dto/cart.dto';

@SkipThrottle()
@Controller('cart')
export class CartController {
  private readonly logger = new Logger(CartController.name);

  constructor(
    private readonly cartService: CartService,
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  private async resolveActorId(authorization?: string, guestId?: string): Promise<string> {
    const token = authorization?.startsWith('Bearer ')
      ? authorization.slice(7)
      : undefined;
    if (token) {
      try {
        const payload = this.jwtService.verify<{ sub: string }>(token, {
          secret: process.env.JWT_ACCESS_SECRET!,
        });
        return payload.sub;
      } catch (error) {
        this.logger.warn(
          JSON.stringify({
            event: 'cart_auth_token_invalid',
            guestIdPresent: Boolean(guestId),
            tokenPrefix: token.slice(0, 10),
            error: error instanceof Error ? error.message : 'unknown',
          }),
        );
        if (!guestId) {
          throw new UnauthorizedException("Sessiya tokeni yaroqsiz yoki muddati tugagan");
        }
      }
    }

    if (!guestId) {
      throw new BadRequestException('Guest id required for unauthenticated cart');
    }

    const guestUser = await this.usersService.ensureGuestUser(guestId);
    return guestUser.id;
  }

  @Get()
  async getCart(
    @Headers('authorization') authorization?: string,
    @Headers('x-guest-id') guestId?: string,
  ) {
    this.logger.log(
      JSON.stringify({
        event: 'cart_get_requested',
        hasAuthHeader: Boolean(authorization),
        guestId,
      }),
    );
    try {
      const actorId = await this.resolveActorId(authorization, guestId);
      this.logger.log(JSON.stringify({ event: 'cart_get_actor_resolved', actorId, guestId }));
      return this.cartService.getCart(actorId);
    } catch (error) {
      this.logger.error(
        JSON.stringify({
          event: 'cart_get_failed',
          guestId,
          error: error instanceof Error ? error.message : 'unknown',
        }),
      );
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException("Savatni olishda xatolik yuz berdi");
    }
  }

  @Post('items')
  async addItem(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-guest-id') guestId: string | undefined,
    @Body() body: AddCartItemDto,
  ) {
    if (!body.productId && !body.variantId) {
      throw new BadRequestException('productId yoki variantId yuborilishi shart');
    }
    this.logger.log(
      JSON.stringify({
        event: 'cart_item_add_requested',
        payload: body,
        hasAuthHeader: Boolean(authorization),
        guestId,
      }),
    );
    try {
      const actorId = await this.resolveActorId(authorization, guestId);
      this.logger.log(JSON.stringify({ event: 'cart_item_add_actor_resolved', actorId, guestId }));
      return this.cartService.addItem(actorId, body.productId, body.variantId, body.quantity);
    } catch (error) {
      this.logger.error(
        JSON.stringify({
          event: 'cart_item_add_failed',
          payload: body,
          guestId,
          error: error instanceof Error ? error.message : 'unknown',
        }),
      );
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException("Mahsulotni savatga qo'shishda xatolik yuz berdi");
    }
  }

  @Post('boxes')
  async addBoxItem(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-guest-id') guestId: string | undefined,
    @Body() body: AddCartBoxDto,
  ) {
    this.logger.log(
      JSON.stringify({
        event: 'cart_box_add_requested',
        payload: body,
        hasAuthHeader: Boolean(authorization),
        guestId,
      }),
    );
    try {
      const actorId = await this.resolveActorId(authorization, guestId);
      this.logger.log(JSON.stringify({ event: 'cart_box_add_actor_resolved', actorId, guestId }));
      return this.cartService.addBoxItem(actorId, body.boxId, body.quantity);
    } catch (error) {
      this.logger.error(
        JSON.stringify({
          event: 'cart_box_add_failed',
          payload: body,
          guestId,
          error: error instanceof Error ? error.message : 'unknown',
        }),
      );
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException("Boksni savatga qo'shishda xatolik yuz berdi");
    }
  }

  @Delete('items')
  async removeItem(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-guest-id') guestId: string | undefined,
    @Body() body: RemoveCartItemDto,
  ) {
    if (!body.productId && !body.variantId) {
      throw new BadRequestException('productId yoki variantId yuborilishi shart');
    }
    this.logger.log(
      JSON.stringify({
        event: 'cart_item_remove_requested',
        payload: body,
        hasAuthHeader: Boolean(authorization),
        guestId,
      }),
    );
    try {
      const actorId = await this.resolveActorId(authorization, guestId);
      this.logger.log(JSON.stringify({ event: 'cart_item_remove_actor_resolved', actorId, guestId }));
      return this.cartService.removeItem(actorId, body.productId, body.variantId);
    } catch (error) {
      this.logger.error(
        JSON.stringify({
          event: 'cart_item_remove_failed',
          payload: body,
          guestId,
          error: error instanceof Error ? error.message : 'unknown',
        }),
      );
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException("Mahsulotni savatdan o'chirishda xatolik yuz berdi");
    }
  }

  @Delete('boxes')
  async removeBoxItem(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-guest-id') guestId: string | undefined,
    @Body() body: RemoveCartBoxDto,
  ) {
    this.logger.log(
      JSON.stringify({
        event: 'cart_box_remove_requested',
        payload: body,
        hasAuthHeader: Boolean(authorization),
        guestId,
      }),
    );
    try {
      const actorId = await this.resolveActorId(authorization, guestId);
      this.logger.log(JSON.stringify({ event: 'cart_box_remove_actor_resolved', actorId, guestId }));
      return this.cartService.removeBoxItem(actorId, body.boxId);
    } catch (error) {
      this.logger.error(
        JSON.stringify({
          event: 'cart_box_remove_failed',
          payload: body,
          guestId,
          error: error instanceof Error ? error.message : 'unknown',
        }),
      );
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException("Boksni savatdan o'chirishda xatolik yuz berdi");
    }
  }
}
