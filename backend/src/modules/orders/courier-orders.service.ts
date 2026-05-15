import { BadRequestException, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { OrderStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../infrastructure/database/prisma.service';

const REJECT_COOLDOWN_MS = 45_000;
const REJECT_HIDE_MS = 30 * 60_000;
const VIP_MIN_ORDERS = 10;
const HOT_MAX_AGE_MS = 12 * 60_000;
const DELAYED_MIN_AGE_MS = 25 * 60_000;
const LONG_DISTANCE_KM = 5;

type PeriodBucket = {
  deliveries: number;
  earningsSoM: number;
  deliveryFeeTotalSoM: number;
};

@Injectable()
export class CourierOrdersService {
  constructor(private readonly prisma: PrismaService) {}

  private orderInclude() {
    return {
      items: { include: { product: true, variant: true } },
      user: true,
      assignedPicker: true,
      assignedCourier: true,
      customer: true,
    } satisfies Prisma.OrderInclude;
  }

  async listCourierQueue(courierUserId: string) {
    const hideSince = new Date(Date.now() - REJECT_HIDE_MS);
    const rejectedIds = await this.prisma.courierOrderReject.findMany({
      where: { courierId: courierUserId, createdAt: { gte: hideSince } },
      select: { orderId: true },
    });
    const hiddenSet = new Set(rejectedIds.map((r) => r.orderId));

    const orders = await this.prisma.order.findMany({
      where: {
        OR: [{ status: 'READY' }, { status: 'DELIVERING', assignedCourierId: courierUserId }],
      },
      include: this.orderInclude(),
      orderBy: { createdAt: 'asc' },
    });

    return orders
      .filter((o) => !hiddenSet.has(o.id))
      .map((o) => this.enrichOrderForCourier(o));
  }

  private enrichOrderForCourier(order: {
    id: string;
    status: OrderStatus;
    totalAmount: number;
    subtotalAmount: number;
    deliveryFee: number;
    customerName: string;
    customerPhone: string;
    deliveryAddress: string;
    latitude: number | null;
    longitude: number | null;
    formattedAddress: string | null;
    manualAddress: string | null;
    addressLabel: string | null;
    deliveryNote: string | null;
    createdAt: Date;
    readyAt: Date | null;
    assignedCourierId: string | null;
    customer: { totalOrders: number } | null;
  }) {
    const ageMs = Date.now() - order.createdAt.getTime();
    const distanceKm = this.estimateDistanceKm(order.latitude, order.longitude);
    const priorities: string[] = [];
    if (ageMs <= HOT_MAX_AGE_MS) priorities.push('HOT');
    if (order.readyAt && Date.now() - order.readyAt.getTime() >= DELAYED_MIN_AGE_MS) {
      priorities.push('DELAYED');
    } else if (ageMs >= DELAYED_MIN_AGE_MS && order.status === 'READY') {
      priorities.push('DELAYED');
    }
    if ((order.customer?.totalOrders ?? 0) >= VIP_MIN_ORDERS) priorities.push('VIP');
    if (distanceKm != null && distanceKm >= LONG_DISTANCE_KM) priorities.push('LONG_DISTANCE');

    return {
      ...order,
      distanceKm,
      etaMinutes: this.estimateEtaMinutes(distanceKm),
      priorities,
    };
  }

  private estimateDistanceKm(lat: number | null, lng: number | null): number | null {
    if (lat == null || lng == null) return null;
    const hubLat = 40.9984;
    const hubLng = 71.0722;
    const R = 6371;
    const dLat = ((lat - hubLat) * Math.PI) / 180;
    const dLng = ((lng - hubLng) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((hubLat * Math.PI) / 180) * Math.cos((lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
    return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 10) / 10;
  }

  private estimateEtaMinutes(distanceKm: number | null): number | null {
    if (distanceKm == null) return null;
    return Math.max(8, Math.round(distanceKm * 4 + 6));
  }

  async rejectByCourier(courierId: string, orderId: string, reason?: string) {
    const lastReject = await this.prisma.courierOrderReject.findFirst({
      where: { courierId },
      orderBy: { createdAt: 'desc' },
    });
    if (lastReject && Date.now() - lastReject.createdAt.getTime() < REJECT_COOLDOWN_MS) {
      const waitSec = Math.ceil((REJECT_COOLDOWN_MS - (Date.now() - lastReject.createdAt.getTime())) / 1000);
      throw new HttpException(`Juda tez rad etildi. ${waitSec} soniya kuting.`, HttpStatus.TOO_MANY_REQUESTS);
    }

    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new BadRequestException('Buyurtma topilmadi');

    if (order.status === 'READY') {
      await this.prisma.courierOrderReject.create({
        data: { courierId, orderId, reason: reason?.trim() || null },
      });
      return { ok: true, status: order.status };
    }

    if (order.status === 'DELIVERING' && order.assignedCourierId === courierId) {
      await this.prisma.$transaction([
        this.prisma.courierOrderReject.create({
          data: { courierId, orderId, reason: reason?.trim() || null },
        }),
        this.prisma.order.update({
          where: { id: orderId },
          data: {
            status: 'READY',
            assignedCourierId: null,
            deliveringAt: null,
          },
        }),
      ]);
      return { ok: true, status: 'READY' as const };
    }

    throw new BadRequestException('Bu buyurtmani rad etib bo‘lmaydi');
  }

  async getCourierStats(courierId: string) {
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const startOfWeek = new Date(startOfDay);
    startOfWeek.setDate(startOfWeek.getDate() - 7);
    const startOfMonth = new Date(startOfDay);
    startOfMonth.setDate(startOfMonth.getDate() - 30);

    const delivered = await this.prisma.order.findMany({
      where: {
        assignedCourierId: courierId,
        status: 'DELIVERED',
        deliveredAt: { gte: startOfMonth },
      },
      select: {
        deliveryFee: true,
        deliveredAt: true,
        deliveringAt: true,
        createdAt: true,
      },
    });

    const bucket = (from: Date): PeriodBucket => {
      const rows = delivered.filter((o) => o.deliveredAt && o.deliveredAt >= from);
      const deliveryFeeTotalSoM = rows.reduce((s, o) => s + o.deliveryFee, 0);
      return {
        deliveries: rows.length,
        earningsSoM: deliveryFeeTotalSoM,
        deliveryFeeTotalSoM,
      };
    };

    const rejects = await this.prisma.courierOrderReject.count({
      where: { courierId, createdAt: { gte: startOfMonth } },
    });
    const accepted = await this.prisma.order.count({
      where: {
        assignedCourierId: courierId,
        deliveringAt: { gte: startOfMonth },
      },
    });
    const completed = delivered.length;
    const acceptanceRate = accepted + rejects > 0 ? Math.round((accepted / (accepted + rejects)) * 100) : 100;
    const completionRate =
      accepted > 0 ? Math.round((completed / accepted) * 100) : completed > 0 ? 100 : 0;

    const durations = delivered
      .filter((o) => o.deliveringAt && o.deliveredAt)
      .map((o) => (o.deliveredAt!.getTime() - o.deliveringAt!.getTime()) / 60_000);
    const avgDeliveryMinutes =
      durations.length > 0 ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0;

    const activeShift = await this.prisma.courierShift.findFirst({
      where: { courierId, endedAt: null },
      orderBy: { startedAt: 'desc' },
    });

    const shiftsToday = await this.prisma.courierShift.findMany({
      where: { courierId, startedAt: { gte: startOfDay } },
    });
    let workedSecondsToday = 0;
    for (const shift of shiftsToday) {
      const end = shift.endedAt ?? now;
      workedSecondsToday += Math.max(0, Math.floor((end.getTime() - shift.startedAt.getTime()) / 1000));
    }

    const shiftDelivered = activeShift
      ? delivered.filter((o) => o.deliveredAt && o.deliveredAt >= activeShift.startedAt)
      : [];
    const shiftEarningsSoM = shiftDelivered.reduce((s, o) => s + o.deliveryFee, 0);

    const streakDays = this.calcStreakDays(courierId, delivered);

    return {
      today: bucket(startOfDay),
      week: bucket(startOfWeek),
      month: bucket(startOfMonth),
      performance: {
        acceptanceRate,
        completionRate,
        avgDeliveryMinutes,
        rating: 4.9,
        activeStreakDays: streakDays,
      },
      shift: {
        active: Boolean(activeShift),
        shiftId: activeShift?.id ?? null,
        startedAt: activeShift?.startedAt?.toISOString() ?? null,
        workedSecondsToday,
        shiftEarningsSoM,
      },
    };
  }

  private calcStreakDays(
    courierId: string,
    delivered: { deliveredAt: Date | null }[],
  ): number {
    const days = new Set(
      delivered
        .filter((o) => o.deliveredAt)
        .map((o) => o.deliveredAt!.toISOString().slice(0, 10)),
    );
    let streak = 0;
    const d = new Date();
    for (let i = 0; i < 30; i += 1) {
      const key = d.toISOString().slice(0, 10);
      if (days.has(key)) {
        streak += 1;
        d.setDate(d.getDate() - 1);
      } else if (i === 0) {
        d.setDate(d.getDate() - 1);
      } else {
        break;
      }
    }
    return streak;
  }

  async startShift(courierId: string) {
    const open = await this.prisma.courierShift.findFirst({
      where: { courierId, endedAt: null },
    });
    if (open) return open;
    return this.prisma.courierShift.create({ data: { courierId } });
  }

  async endShift(courierId: string) {
    const open = await this.prisma.courierShift.findFirst({
      where: { courierId, endedAt: null },
      orderBy: { startedAt: 'desc' },
    });
    if (!open) throw new BadRequestException('Faol smena yo‘q');
    return this.prisma.courierShift.update({
      where: { id: open.id },
      data: { endedAt: new Date() },
    });
  }

  async listCourierHistory(courierId: string, limit = 50) {
    return this.prisma.order.findMany({
      where: { assignedCourierId: courierId, status: 'DELIVERED' },
      orderBy: { deliveredAt: 'desc' },
      take: limit,
      select: {
        id: true,
        customerName: true,
        customerPhone: true,
        deliveryAddress: true,
        formattedAddress: true,
        manualAddress: true,
        totalAmount: true,
        deliveryFee: true,
        deliveredAt: true,
      },
    });
  }
}
