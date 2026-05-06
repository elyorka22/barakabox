import { BadRequestException, Body, Controller, Delete, Get, Headers, Post } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { CartService } from './cart.service';
import { UsersService } from '../users/users.service';

@Controller('cart')
export class CartController {
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
      const payload = this.jwtService.verify<{ sub: string }>(token, {
        secret: process.env.JWT_ACCESS_SECRET ?? 'access-secret',
      });
      return payload.sub;
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
    const actorId = await this.resolveActorId(authorization, guestId);
    return this.cartService.getCart(actorId);
  }

  @Post('items')
  async addItem(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-guest-id') guestId: string | undefined,
    @Body() body: { productId: string; quantity: number },
  ) {
    const actorId = await this.resolveActorId(authorization, guestId);
    return this.cartService.addItem(actorId, body.productId, body.quantity);
  }

  @Post('boxes')
  async addBoxItem(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-guest-id') guestId: string | undefined,
    @Body() body: { boxId: string; quantity: number },
  ) {
    const actorId = await this.resolveActorId(authorization, guestId);
    return this.cartService.addBoxItem(actorId, body.boxId, body.quantity);
  }

  @Delete('items')
  async removeItem(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-guest-id') guestId: string | undefined,
    @Body() body: { productId: string },
  ) {
    const actorId = await this.resolveActorId(authorization, guestId);
    return this.cartService.removeItem(actorId, body.productId);
  }

  @Delete('boxes')
  async removeBoxItem(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-guest-id') guestId: string | undefined,
    @Body() body: { boxId: string },
  ) {
    const actorId = await this.resolveActorId(authorization, guestId);
    return this.cartService.removeBoxItem(actorId, body.boxId);
  }
}
