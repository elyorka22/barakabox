import { Injectable, Logger } from '@nestjs/common';
import { Role } from '@prisma/client';
import webpush from 'web-push';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { isAdminPanelRole, normalizeRole } from '../../common/roles';
import type { PushPayload } from './push-notification.types';

const ORDER_NOTIFY_ROLES: Role[] = [Role.PICKER, Role.ADMIN, Role.MANAGER, Role.SUPER_ADMIN];

function formatMoneyTiyin(tiyin: number): string {
  const som = Math.round(tiyin) / 100;
  return `${som.toLocaleString('uz-UZ')} so'm`;
}

@Injectable()
export class PushNotificationService {
  private readonly logger = new Logger(PushNotificationService.name);
  private vapidReady = false;

  constructor(private readonly prisma: PrismaService) {
    this.initVapid();
  }

  private initVapid(): void {
    const publicKey = process.env.VAPID_PUBLIC_KEY?.trim();
    const privateKey = process.env.VAPID_PRIVATE_KEY?.trim();
    const subject = process.env.VAPID_SUBJECT?.trim() || 'mailto:support@chust-online-bozor.uz';
    if (!publicKey || !privateKey) {
      this.logger.warn('VAPID keys missing — Web Push disabled until configured');
      return;
    }
    webpush.setVapidDetails(subject, publicKey, privateKey);
    this.vapidReady = true;
  }

  isEnabled(): boolean {
    return this.vapidReady;
  }

  getPublicKey(): string | null {
    return process.env.VAPID_PUBLIC_KEY?.trim() || null;
  }

  async upsertSubscription(
    userId: string,
    role: string,
    input: { endpoint: string; p256dh: string; auth: string; userAgent?: string },
  ) {
    const normalized = normalizeRole(role);
    if (!ORDER_NOTIFY_ROLES.some((r) => normalizeRole(r) === normalized)) {
      return null;
    }
    const prismaRole = normalized as Role;
    return this.prisma.pushSubscription.upsert({
      where: { endpoint: input.endpoint },
      create: {
        userId,
        role: prismaRole,
        endpoint: input.endpoint,
        p256dh: input.p256dh,
        auth: input.auth,
        userAgent: input.userAgent ?? null,
      },
      update: {
        userId,
        role: prismaRole,
        p256dh: input.p256dh,
        auth: input.auth,
        userAgent: input.userAgent ?? null,
      },
    });
  }

  async removeSubscription(userId: string, endpoint?: string) {
    if (endpoint) {
      await this.prisma.pushSubscription.deleteMany({
        where: { userId, endpoint },
      });
      return;
    }
    await this.prisma.pushSubscription.deleteMany({ where: { userId } });
  }

  private async shouldNotifyUser(
    userId: string,
    role: Role,
    orderStoreId: string | null,
  ): Promise<boolean> {
    if (isAdminPanelRole(role)) return true;
    if (role !== Role.PICKER) return false;
    if (!orderStoreId) return true;

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { storeScopeId: true },
    });
    if (!user?.storeScopeId) return true;
    return user.storeScopeId === orderStoreId;
  }

  async notifyNewOrder(input: {
    orderId: string;
    orderNumber: string | null;
    totalAmount: number;
    itemCount: number;
    storeId: string | null;
    isScheduled: boolean;
  }): Promise<void> {
    if (!this.vapidReady) return;

    const label = input.orderNumber?.trim() || input.orderId.slice(-6).toUpperCase();
    const title = input.isScheduled
      ? `Rejalashtirilgan buyurtma #${label}`
      : `Yangi buyurtma #${label}`;
    const body = `${input.itemCount} ta mahsulot · ${formatMoneyTiyin(input.totalAmount)}`;

    await this.sendToStaff({
      title,
      body,
      url: '/picker',
      tag: `order-${input.orderId}`,
      orderId: input.orderId,
      storeId: input.storeId,
      adminUrl: '/admin/orders',
    });
  }

  async notifyScheduledOrderActivated(input: {
    orderId: string;
    orderNumber: string | null;
    storeId: string | null;
  }): Promise<void> {
    if (!this.vapidReady) return;

    const label = input.orderNumber?.trim() || input.orderId.slice(-6).toUpperCase();
    await this.sendToStaff({
      title: `Yig‘ish vaqti: #${label}`,
      body: 'Rejalashtirilgan buyurtma navbatga tushdi',
      url: '/picker',
      tag: `order-activate-${input.orderId}`,
      orderId: input.orderId,
      storeId: input.storeId,
      adminUrl: '/admin/orders',
    });
  }

  private async sendToStaff(input: {
    title: string;
    body: string;
    url: string;
    tag: string;
    orderId: string;
    storeId: string | null;
    adminUrl: string;
  }): Promise<void> {
    const subs = await this.prisma.pushSubscription.findMany({
      where: { role: { in: ORDER_NOTIFY_ROLES } },
      select: {
        id: true,
        endpoint: true,
        p256dh: true,
        auth: true,
        userId: true,
        role: true,
      },
    });

    if (subs.length === 0) return;

    const payloadByUrl = new Map<string, string>();
    const getPayload = (url: string) => {
      let cached = payloadByUrl.get(url);
      if (!cached) {
        const data: PushPayload = {
          title: input.title,
          body: input.body,
          url,
          tag: input.tag,
          orderId: input.orderId,
        };
        cached = JSON.stringify(data);
        payloadByUrl.set(url, cached);
      }
      return cached;
    };

    await Promise.all(
      subs.map(async (sub) => {
        const allowed = await this.shouldNotifyUser(sub.userId, sub.role, input.storeId);
        if (!allowed) return;

        const targetUrl = isAdminPanelRole(sub.role) ? input.adminUrl : input.url;
        const payload = getPayload(targetUrl);

        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth },
            },
            payload,
          );
        } catch (err: unknown) {
          const status = (err as { statusCode?: number })?.statusCode;
          if (status === 404 || status === 410) {
            await this.prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => undefined);
            return;
          }
          this.logger.warn(
            `Push failed for ${sub.userId}: ${err instanceof Error ? err.message : 'unknown'}`,
          );
        }
      }),
    );
  }
}
