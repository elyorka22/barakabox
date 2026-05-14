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
    if (actor.isGuest && (!body?.phone || !body?.address)) {
      throw new BadRequestException('Guest checkout requires phone and address');
    }
    return this.ordersService.createFromCart(actor.userId, {
      name: body?.name,
      phone: body?.phone,
      address: body?.address,
      deliverySpeed: body?.deliverySpeed ?? 'STANDARD',
      cashbackRedeemTiyin: body?.cashbackRedeemTiyin,
    });
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('BUSINESS', 'ADMIN')
  listAll() {
    return this.ordersService.listAll();
  }

  @Get('picker')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('PICKER')
  listPickerOrders() {
    return this.ordersService.listPickerQueue();
  }

  @Patch(':orderId/start-picking')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('PICKER')
  startPicking(@CurrentUser() user: { sub: string }, @Param('orderId') orderId: string) {
    return this.ordersService.startPicking(orderId, user.sub);
  }

  @Patch(':orderId/ready')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('PICKER')
  ready(@CurrentUser() user: { sub: string }, @Param('orderId') orderId: string) {
    return this.ordersService.setReady(orderId, user.sub);
  }

  @Get('courier')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('COURIER')
  listCourierOrders() {
    return this.ordersService.listCourierQueue();
  }

  @Patch(':orderId/start-delivery')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('COURIER')
  startDelivery(@CurrentUser() user: { sub: string }, @Param('orderId') orderId: string) {
    return this.ordersService.startDelivery(orderId, user.sub);
  }

  @Patch(':orderId/delivered')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('COURIER')
  delivered(@CurrentUser() user: { sub: string }, @Param('orderId') orderId: string) {
    return this.ordersService.setDelivered(orderId, user.sub);
  }

  @Patch(':orderId/cancel')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  cancelByAdmin(@CurrentUser() user: { sub: string }, @Param('orderId') orderId: string) {
    return this.ordersService.cancelByAdmin(orderId, user.sub);
  }

  @Patch(':orderId/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  setStatusByAdmin(
    @CurrentUser() user: { sub: string },
    @Param('orderId') orderId: string,
    @Body() body: UpdateOrderStatusDto,
  ) {
    return this.ordersService.setStatusByAdmin(orderId, body.status, user.sub);
  }
}
