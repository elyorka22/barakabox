import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { OrderStatus } from '@prisma/client';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { SettingsService } from '../settings/settings.service';
import { EventEmitterService } from '../../infrastructure/events/event-emitter.service';
import { QueueService } from '../../infrastructure/queue/queue.service';
import { PushNotificationService } from '../push/push.service';

@Injectable()
export class ScheduledOrdersCron {
  private readonly logger = new Logger(ScheduledOrdersCron.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly settingsService: SettingsService,
    private readonly events: EventEmitterService,
    private readonly queueService: QueueService,
    private readonly pushNotifications: PushNotificationService,
  ) {}

  /** Every minute: activate scheduled orders entering prep window. */
  @Cron('*/1 * * * *')
  async activateDueScheduledOrders() {
    const settings = await this.settingsService.getSchedulingSettings();
    const leadMs = settings.prepLeadMinutes * 60_000;
    const activateBefore = new Date(Date.now() + leadMs);

    const due = await this.prisma.order.findMany({
      where: {
        status: OrderStatus.PENDING_SCHEDULE,
        isScheduled: true,
        scheduledAt: { lte: activateBefore },
      },
      select: { id: true, orderNumber: true, storeId: true, scheduledAt: true, deliverySlot: true },
      take: 50,
    });

    if (due.length === 0) return;

    const ids = due.map((o) => o.id);
    await this.prisma.order.updateMany({
      where: { id: { in: ids }, status: OrderStatus.PENDING_SCHEDULE },
      data: { status: OrderStatus.NEW },
    });

    for (const order of due) {
      this.events.emit('order.scheduled.activated', {
        orderId: order.id,
        scheduledAt: order.scheduledAt?.toISOString(),
        deliverySlot: order.deliverySlot,
      });
      await this.queueService.enqueue('order.scheduled.activated', { orderId: order.id });
      void this.pushNotifications
        .notifyScheduledOrderActivated({
          orderId: order.id,
          orderNumber: order.orderNumber,
          storeId: order.storeId,
        })
        .catch(() => undefined);
    }

    this.logger.log(`Activated ${due.length} scheduled order(s) for picking`);
  }
}
