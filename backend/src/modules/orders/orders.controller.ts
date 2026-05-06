import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';

@Controller('orders')
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  private async resolveActor(authorization?: string, guestId?: string): Promise<{ userId: string; isGuest: boolean }> {
    const token = authorization?.startsWith('Bearer ')
      ? authorization.slice(7)
      : undefined;
    if (token) {
      const payload = this.jwtService.verify<{ sub: string }>(token, {
        secret: process.env.JWT_ACCESS_SECRET!,
      });
      return { userId: payload.sub, isGuest: false };
    }

    if (!guestId) {
      throw new BadRequestException('Guest id required for unauthenticated order');
    }

    const guestUser = await this.usersService.ensureGuestUser(guestId);
    return { userId: guestUser.id, isGuest: true };
  }

  @Post()
  async create(
    @Headers('authorization') authorization?: string,
    @Headers('x-guest-id') guestId?: string,
    @Body() body?: CreateOrderDto,
  ) {
    const actor = await this.resolveActor(authorization, guestId);
    if (actor.isGuest && (!body?.name || !body?.phone || !body?.address)) {
      throw new BadRequestException('Guest checkout requires name, phone and address');
    }
    return this.ordersService.createFromCart(actor.userId, {
      name: body?.name,
      phone: body?.phone,
      address: body?.address,
    });
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('BUSINESS', 'ADMIN', 'COURIER')
  listAll() {
    return this.ordersService.listAll();
  }

  @Patch(':orderId/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('BUSINESS', 'COURIER')
  updateStatus(
    @CurrentUser() user: { role: 'BUSINESS' | 'COURIER' | 'ADMIN' },
    @Param('orderId') orderId: string,
    @Body() body: UpdateOrderStatusDto,
  ) {
    return this.ordersService.updateStatus(orderId, body.status, user.role as 'BUSINESS' | 'COURIER');
  }
}
