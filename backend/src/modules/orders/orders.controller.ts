import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CourierOrdersService } from './courier-orders.service';
import { CourierRejectOrderDto } from './dto/courier-reject.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/decorators/current-user.decorator';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';

@Controller('orders')
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly courierOrdersService: CourierOrdersService,
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
      latitude: body?.latitude,
      longitude: body?.longitude,
      formattedAddress: body?.formattedAddress,
      manualAddress: body?.manualAddress,
      deliveryNote: body?.deliveryNote,
      addressLabel: body?.addressLabel,
      deliverySpeed: body?.deliverySpeed ?? 'STANDARD',
      cashbackRedeemTiyin: body?.cashbackRedeemTiyin,
      couponCode: body?.couponCode,
    });
  }

  @Get('track/public')
  trackByToken(@Query('token') token?: string) {
    if (!token?.trim()) {
      throw new BadRequestException('Kuzatish kodi kerak');
    }
    return this.ordersService.getTrackByToken(token);
  }

  @Get(':orderId/track')
  trackOrder(@Param('orderId') orderId: string, @Query('phone') phone?: string) {
    if (!phone?.trim()) {
      throw new BadRequestException('Telefon raqami kerak');
    }
    return this.ordersService.getTrackByPhone(orderId, phone);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('BUSINESS', 'ADMIN')
  listAll(@CurrentUser() user: AuthUser) {
    return this.ordersService.listForActor(user.sub, user.role);
  }

  @Get('picker')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('PICKER')
  listPickerOrders(@CurrentUser() user: AuthUser) {
    return this.ordersService.listPickerQueue(user.sub);
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

  @Get('courier/stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('COURIER')
  courierStats(@CurrentUser() user: AuthUser) {
    return this.courierOrdersService.getCourierStats(user.sub);
  }

  @Get('courier/history')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('COURIER')
  courierHistory(@CurrentUser() user: AuthUser) {
    return this.courierOrdersService.listCourierHistory(user.sub);
  }

  @Get('courier/shift')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('COURIER')
  courierShift(@CurrentUser() user: AuthUser) {
    return this.courierOrdersService.getCourierStats(user.sub).then((s) => s.shift);
  }

  @Post('courier/shift/start')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('COURIER')
  startCourierShift(@CurrentUser() user: AuthUser) {
    return this.courierOrdersService.startShift(user.sub);
  }

  @Patch('courier/shift/end')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('COURIER')
  endCourierShift(@CurrentUser() user: AuthUser) {
    return this.courierOrdersService.endShift(user.sub);
  }

  @Get('courier')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('COURIER')
  listCourierOrders(@CurrentUser() user: AuthUser) {
    return this.courierOrdersService.listCourierQueue(user.sub);
  }

  @Patch(':orderId/reject')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('COURIER')
  rejectCourierOrder(
    @CurrentUser() user: AuthUser,
    @Param('orderId') orderId: string,
    @Body() body: CourierRejectOrderDto,
  ) {
    return this.courierOrdersService.rejectByCourier(user.sub, orderId, body.reason);
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
