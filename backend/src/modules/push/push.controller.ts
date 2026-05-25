import { Body, Controller, Delete, Get, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { PushSubscribeDto } from './dto/push-subscribe.dto';
import { PushNotificationService } from './push.service';

type AuthRequest = {
  user: { sub: string; role: string };
  headers: { 'user-agent'?: string };
};

@Controller('push')
export class PushController {
  constructor(private readonly push: PushNotificationService) {}

  @Get('vapid-public-key')
  vapidPublicKey() {
    const publicKey = this.push.getPublicKey();
    return { enabled: this.push.isEnabled(), publicKey };
  }

  @Post('subscribe')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('PICKER', 'ADMIN')
  async subscribe(@Req() req: AuthRequest, @Body() body: PushSubscribeDto) {
    const row = await this.push.upsertSubscription(req.user.sub, req.user.role, {
      endpoint: body.endpoint,
      p256dh: body.keys.p256dh,
      auth: body.keys.auth,
      userAgent: req.headers['user-agent'],
    });
    return { ok: Boolean(row), enabled: this.push.isEnabled() };
  }

  @Delete('subscribe')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('PICKER', 'ADMIN')
  async unsubscribe(@Req() req: AuthRequest, @Body() body?: { endpoint?: string }) {
    await this.push.removeSubscription(req.user.sub, body?.endpoint);
    return { ok: true };
  }
}
