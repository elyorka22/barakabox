import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import {
  calculateSellingModeLineTotal,
  deductStockForMode,
  hasEnoughStockForMode,
  resolveSellingMode,
  type SellingMode,
} from '../../common/utils/product-units';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { CartService } from '../cart/cart.service';
import { CustomersService } from '../customers/customers.service';
import { QueueService } from '../../infrastructure/queue/queue.service';
import { EventEmitterService } from '../../infrastructure/events/event-emitter.service';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes } from 'crypto';
import { DeliveryType, OrderStatus, Prisma, UnitType } from '@prisma/client';
import {
  canLinkCustomerFromPhone,
  cashbackPendingForLine,
  normalizeCustomerPhone,
} from '../customers/customers.utils';
import { calculateOrderTotals } from './order-totals.util';
import { CouponsService } from '../coupons/coupons.service';
import { SettingsService } from '../settings/settings.service';
import { CacheService } from '../../infrastructure/cache/cache.service';
import { CACHE_TTL, cacheKeys } from '../../common/cache/cache-keys';
import {
  formatExactScheduleLabel,
  formatSlotLabel,
  getTashkentDateTimeParts,
  getTashkentParts,
  parseDateKey,
  parseDateTimeSlotKey,
  parseSlotKey,
  tashkentLocalToUtc,
} from '../../common/delivery/scheduled-delivery.util';
import { mapPickerOrderItems, pickerOrderItemSelect } from './picker-order.mapper';
import {
  generateUniqueOrderNumber,
  normalizeOrderNumber,
  orderNumberSearchVariants,
} from '../../common/utils/order-number.util';
import { AnalyticsIngestService } from '../analytics/analytics-ingest.service';

const pickerOrderListSelect = {
  id: true,
  orderNumber: true,
  status: true,
  createdAt: true,
  pickingAt: true,
  deliveryFee: true,
  totalAmount: true,
  isScheduled: true,
  scheduledAt: true,
  scheduledSlotEnd: true,
  deliverySlot: true,
  assignedPickerId: true,
  items: { select: pickerOrderItemSelect },
} satisfies Prisma.OrderSelect;

type PickerOrderListRow = Prisma.OrderGetPayload<{ select: typeof pickerOrderListSelect }>;

const ORDER_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING_SCHEDULE: ['NEW', 'PICKING', 'CANCELLED'],
  NEW: ['PICKING', 'CANCELLED'],
  PICKING: ['READY', 'CANCELLED'],
  READY: ['DELIVERING', 'CANCELLED'],
  DELIVERING: ['DELIVERED', 'CANCELLED'],
  DELIVERED: [],
  CANCELLED: [],
};

type PreparedLine = {
  type: 'variant' | 'product' | 'box';
  entityId: string;
  productId: string | null;
  title: string;
  flavor: string | null;
  size: string | null;
  sku: string | null;
  price: number;
  quantity: number;
  unitType: UnitType;
  sellingMode: SellingMode;
  cashbackPendingTiyin: number;
};

@Injectable()
export class OrdersService implements OnModuleInit {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cartService: CartService,
    private readonly customersService: CustomersService,
    private readonly queueService: QueueService,
    private readonly events: EventEmitterService,
    private readonly configService: ConfigService,
    private readonly couponsService: CouponsService,
    private readonly settingsService: SettingsService,
    private readonly cache: CacheService,
    private readonly analyticsIngest: AnalyticsIngestService,
  ) {}

  async onModuleInit() {
    void this.backfillMissingOrderNumbers();
  }

  private async backfillMissingOrderNumbers() {
    try {
      let total = 0;
      for (;;) {
        const rows = await this.prisma.order.findMany({
          where: { orderNumber: null },
          select: { id: true },
          take: 50,
        });
        if (rows.length === 0) break;
        for (const row of rows) {
          const orderNumber = await generateUniqueOrderNumber(this.prisma);
          await this.prisma.order.update({
            where: { id: row.id },
            data: { orderNumber },
          });
          total += 1;
        }
      }
      if (total > 0) {
        this.logger.log(`Backfilled orderNumber for ${total} order(s)`);
      }
    } catch (err) {
      this.logger.warn(
        `orderNumber backfill skipped: ${err instanceof Error ? err.message : 'unknown'}`,
      );
    }
  }

  private readonly orderListSelect = {
    id: true,
    orderNumber: true,
    status: true,
    totalAmount: true,
    subtotalAmount: true,
    deliveryFee: true,
    customerName: true,
    customerPhone: true,
    deliveryAddress: true,
    latitude: true,
    longitude: true,
    formattedAddress: true,
    manualAddress: true,
    deliveryNote: true,
    addressLabel: true,
    createdAt: true,
    deliveryType: true,
    isScheduled: true,
    scheduledAt: true,
    scheduledSlotEnd: true,
    deliverySlot: true,
    cashbackRedeemTiyin: true,
    couponDiscountTiyin: true,
    couponCode: true,
    assignedPicker: { select: { fullName: true } },
    assignedCourier: { select: { fullName: true } },
  } satisfies Prisma.OrderSelect;

  async createFromCart(
    userId: string,
    deliveryInfo?: {
      name?: string;
      phone?: string;
      address?: string;
      latitude?: number;
      longitude?: number;
      formattedAddress?: string;
      manualAddress?: string;
      deliveryNote?: string;
      addressLabel?: string;
      cashbackRedeemTiyin?: number;
      couponCode?: string;
      deliveryType?: 'INSTANT' | 'SCHEDULED';
      scheduledAt?: string;
      deliverySlot?: string;
    },
  ) {
    const latRaw = deliveryInfo?.latitude;
    const lngRaw = deliveryInfo?.longitude;
    const hasLat = latRaw !== undefined && latRaw !== null && Number.isFinite(latRaw);
    const hasLng = lngRaw !== undefined && lngRaw !== null && Number.isFinite(lngRaw);
    if (hasLat !== hasLng) {
      throw new BadRequestException('Koordinatalar to‘liq emas');
    }
    let lat: number | null = null;
    let lng: number | null = null;
    if (hasLat && hasLng) {
      const latNum = Number(latRaw);
      const lngNum = Number(lngRaw);
      if (latNum < -90 || latNum > 90 || lngNum < -180 || lngNum > 180) {
        throw new BadRequestException('Koordinatalar noto‘g‘ri');
      }
      lat = latNum;
      lng = lngNum;
    }
    const manualAddress = deliveryInfo?.manualAddress?.trim() || null;
    const addressText = deliveryInfo?.address?.trim() || '';
    if (!addressText) {
      throw new BadRequestException('Manzil majburiy');
    }
    if (!lat && !lng && !manualAddress) {
      throw new BadRequestException('Manzil yoki joylashuv koordinatasi kerak');
    }
    const cart = await this.cartService.getCart(userId);
    if (!cart || cart.items.length === 0) {
      throw new BadRequestException('Cart is empty');
    }

    const preparedLines: PreparedLine[] = [];
    for (const item of cart.items) {
      if (item.variant) {
        const p = item.variant.product;
        const unitType = (p?.unit ?? 'dona') as UnitType;
        const sellingMode = resolveSellingMode(p);
        const price = Number(item.variant.discountPrice ?? item.variant.price);
        const quantity = item.quantity;
        const lineSubtotal = calculateSellingModeLineTotal(price, quantity, sellingMode);
        const pending = p
          ? cashbackPendingForLine(lineSubtotal, p.cashbackType, p.cashbackValue)
          : 0;
        preparedLines.push({
          type: 'variant',
          entityId: item.variant.id,
          productId: item.variant.productId,
          title: item.variant.title || item.product?.name || 'Variant',
          flavor: item.variant.flavor ?? null,
          size: item.variant.size ?? null,
          sku: item.variant.sku ?? null,
          price,
          quantity,
          unitType,
          sellingMode,
          cashbackPendingTiyin: pending,
        });
      } else if (item.product) {
        const p = item.product;
        const unitType = (p.unit ?? 'dona') as UnitType;
        const sellingMode = resolveSellingMode(p);
        const price = Number(p.price);
        const quantity = item.quantity;
        const lineSubtotal = calculateSellingModeLineTotal(price, quantity, sellingMode);
        const pending = cashbackPendingForLine(lineSubtotal, p.cashbackType, p.cashbackValue);
        preparedLines.push({
          type: 'product',
          entityId: item.product.id,
          productId: item.product.id,
          title: item.product.name,
          flavor: null,
          size: null,
          sku: null,
          price,
          quantity,
          unitType,
          sellingMode,
          cashbackPendingTiyin: pending,
        });
      } else if (item.box) {
        preparedLines.push({
          type: 'box',
          entityId: item.box.id,
          productId: null,
          title: item.box.name,
          flavor: null,
          size: null,
          sku: null,
          price: Number(item.box.price),
          quantity: item.quantity,
          unitType: 'dona' as UnitType,
          sellingMode: 'piece',
          cashbackPendingTiyin: 0,
        });
      } else {
        throw new BadRequestException('Invalid cart item');
      }
    }

    const cashbackRedeemRequested = Math.max(0, Math.floor(deliveryInfo?.cashbackRedeemTiyin ?? 0));
    const couponCodeRaw = deliveryInfo?.couponCode?.trim().toUpperCase() ?? '';

    const idempotencyKey = createHash('sha256')
      .update(`${userId}:${cashbackRedeemRequested}:${couponCodeRaw}:${JSON.stringify(preparedLines)}`)
      .digest('hex');

    const duplicateWindowSeconds = Number(
      this.configService.get('ORDER_IDEMPOTENCY_WINDOW_SECONDS') ?? 120,
    );
    const duplicateSince = new Date(Date.now() - duplicateWindowSeconds * 1000);

    const existingOrder = await this.prisma.order.findFirst({
      where: {
        userId,
        idempotencyKey,
        createdAt: { gte: duplicateSince },
      },
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    });
    if (existingOrder) {
      throw new ConflictException('Duplicate order attempt detected');
    }

    const subtotal = preparedLines.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const deliveryQuote = await this.settingsService.getDeliveryQuote(subtotal);
    const deliveryFee = deliveryQuote.deliveryFee;

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new BadRequestException('User not found');
    }

    const customerPhone = deliveryInfo?.phone?.trim() || 'N/A';
    const canLink = canLinkCustomerFromPhone(deliveryInfo?.phone);

    const cashbackEarnedSnapshotTiyin = preparedLines.reduce((s, l) => s + l.cashbackPendingTiyin, 0);

    const stockPlan = await this.buildStockPlan(preparedLines);

    const wantsScheduled = deliveryInfo?.deliveryType === 'SCHEDULED';
    let scheduleMeta: {
      scheduledAt: Date;
      scheduledSlotEnd: Date;
      deliverySlot: string;
      label: string;
    } | null = null;
    if (wantsScheduled) {
      const scheduling = await this.settingsService.getSchedulingSettings();
      if (!scheduling.scheduledOrdersEnabled) {
        throw new BadRequestException('Rejalashtirilgan yetkazish vaqtincha o‘chirilgan');
      }
      if (!deliveryInfo?.scheduledAt?.trim() && !deliveryInfo?.deliverySlot?.trim()) {
        throw new BadRequestException('Rejalashtirilgan yetkazish vaqti tanlanmagan');
      }
      scheduleMeta = await this.settingsService.resolveScheduledForOrder({
        scheduledAt: deliveryInfo?.scheduledAt,
        deliverySlot: deliveryInfo?.deliverySlot,
      });
    }

    const order = await this.prisma.$transaction(async (tx) => {
      let customerId: string | undefined;
      let customerBalance = 0;
      if (canLink && deliveryInfo?.phone) {
        const customer = await this.customersService.upsertByPhoneOnOrder(
          deliveryInfo.phone,
          deliveryInfo.name,
          tx,
        );
        customerId = customer.id;
        customerBalance = customer.cashbackBalance ?? 0;
      } else if (cashbackRedeemRequested > 0) {
        throw new BadRequestException('Keshbek ishlatish uchun telefon raqam kiriting');
      }

      const couponResolved = await this.couponsService.resolveForOrder(tx, {
        code: couponCodeRaw || undefined,
        phone: deliveryInfo?.phone,
        subtotalAmount: subtotal,
        deliveryFee,
      });

      const totals = calculateOrderTotals({
        subtotalAmount: subtotal,
        deliveryFee,
        couponDiscountTiyin: couponResolved?.couponDiscountTiyin ?? 0,
        cashbackBalance: customerBalance,
        cashbackRedeemRequested: cashbackRedeemRequested,
      });
      const redeem = totals.cashbackRedeemTiyin;
      const totalAmount = totals.totalAmount;

      if (redeem > 0 && customerId) {
        const dec = await tx.customer.updateMany({
          where: { id: customerId, cashbackBalance: { gte: redeem } },
          data: { cashbackBalance: { decrement: redeem } },
        });
        if (dec.count !== 1) {
          throw new BadRequestException('Keshbek balansi yetarli emas');
        }
      }
      const trackingToken = randomBytes(24).toString('hex');

      const createdOrder = await tx.order.create({
        data: {
          trackingToken,
          userId,
          customerId,
          customerName: deliveryInfo?.name?.trim() || user.fullName,
          customerPhone,
          deliveryAddress: addressText,
          latitude: lat,
          longitude: lng,
          formattedAddress: deliveryInfo?.formattedAddress?.trim() || null,
          manualAddress,
          deliveryNote: deliveryInfo?.deliveryNote?.trim() || null,
          addressLabel: deliveryInfo?.addressLabel?.trim() || null,
          idempotencyKey,
          subtotalAmount: subtotal,
          deliveryFee,
          totalAmount,
          cashbackRedeemTiyin: redeem,
          cashbackEarnedSnapshotTiyin,
          couponId: couponResolved?.couponId ?? null,
          couponCode: couponResolved?.couponCode ?? null,
          couponDiscountTiyin: couponResolved?.couponDiscountTiyin ?? 0,
          deliveryType: wantsScheduled ? DeliveryType.SCHEDULED : DeliveryType.INSTANT,
          isScheduled: Boolean(wantsScheduled),
          scheduledAt: scheduleMeta?.scheduledAt ?? null,
          scheduledSlotEnd: scheduleMeta?.scheduledSlotEnd ?? null,
          deliverySlot: scheduleMeta?.deliverySlot ?? null,
          status: wantsScheduled ? OrderStatus.PENDING_SCHEDULE : OrderStatus.NEW,
          items: {
            create: preparedLines.map((item) => ({
              productId: item.type === 'product' ? item.entityId : null,
              variantId: item.type === 'variant' ? item.entityId : null,
              boxId: item.type === 'box' ? item.entityId : null,
              unitType: item.unitType,
              sellingMode:
                item.sellingMode === 'piece'
                  ? 'PIECE'
                  : item.sellingMode === 'gram_step'
                    ? 'GRAM_STEP'
                    : 'KILOGRAM_STEP',
              title: item.title,
              variantSnapshotTitle: item.type === 'variant' ? item.title : null,
              variantSnapshotFlavor: item.type === 'variant' ? item.flavor : null,
              variantSnapshotSize: item.type === 'variant' ? item.size : null,
              variantSnapshotSku: item.type === 'variant' ? item.sku : null,
              quantity: item.quantity,
              price: item.price,
              cashbackPendingTiyin: item.cashbackPendingTiyin,
            })),
          },
        },
        include: { items: true },
      });

      if (redeem > 0 && customerId) {
        await tx.cashbackTransaction.create({
          data: {
            customerId,
            orderId: createdOrder.id,
            amount: redeem,
            type: 'SPENT',
            status: 'COMPLETED',
          },
        });
      }

      if (couponResolved) {
        await this.couponsService.attachRedemption(tx, {
          couponId: couponResolved.couponId,
          orderId: createdOrder.id,
          customerId,
          phone: canLink && deliveryInfo?.phone ? normalizeCustomerPhone(deliveryInfo.phone) : undefined,
        });
      }

      for (const item of preparedLines) {
        if (item.type !== 'product' && item.type !== 'variant') {
          continue;
        }
        const productId = item.productId;
        if (!productId) continue;
        if (item.type === 'variant') {
          const variant = await tx.productVariant.findUnique({
            where: { id: item.entityId },
            select: { id: true, stock: true, isActive: true },
          });
          if (!variant || !variant.isActive) {
            throw new BadRequestException('Variant not found');
          }
          if (!hasEnoughStockForMode(variant.stock, item.quantity, item.sellingMode)) {
            throw new BadRequestException(`Insufficient stock for ${item.title}`);
          }
          await tx.productVariant.update({
            where: { id: variant.id },
            data: { stock: deductStockForMode(variant.stock, item.quantity, item.sellingMode) },
          });
        } else {
          const product = await tx.product.findUnique({
            where: { id: item.entityId },
            select: { id: true, stockQuantity: true },
          });
          if (!product) {
            throw new BadRequestException('Product not found');
          }
          if (!hasEnoughStockForMode(product.stockQuantity, item.quantity, item.sellingMode)) {
            throw new BadRequestException(`Insufficient stock for ${item.title}`);
          }
          await tx.product.update({
            where: { id: product.id },
            data: { stockQuantity: deductStockForMode(product.stockQuantity, item.quantity, item.sellingMode) },
          });
        }
        await tx.inventoryLog.create({
          data: {
            productId,
            orderId: createdOrder.id,
            change: -item.quantity,
            reason: 'SALE',
          },
        });
      }

      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
      return createdOrder;
    });

    await this.queueService.enqueue('order.created', {
      orderId: order.id,
      orderNumber: order.orderNumber,
    });
    this.events.emit('order.created', { orderId: order.id, orderNumber: order.orderNumber });
    this.analyticsIngest.trackServerEvent({
      name: 'order_created',
      userId: order.userId ?? undefined,
      properties: {
        orderId: order.id,
        orderNumber: order.orderNumber,
        totalAmount: order.totalAmount,
        isScheduled: order.isScheduled,
        deliveryType: order.deliveryType,
        itemCount: order.items?.length ?? 0,
      },
    });
    if (order.isScheduled) {
      this.events.emit('order.scheduled.created', {
        orderId: order.id,
        orderNumber: order.orderNumber,
        scheduledAt: order.scheduledAt?.toISOString(),
        deliverySlot: order.deliverySlot,
      });
      if (order.deliverySlot) {
        const dateKey = order.deliverySlot.split('|')[0];
        if (dateKey) await this.cache.del(cacheKeys.deliverySlots(dateKey));
      }
    }

    const track = this.toPublicTrackPayload(order, null);
    return {
      ...track,
      id: order.id,
      orderNumber: order.orderNumber ?? track.orderNumber,
      deliveryType: order.deliveryType,
      isScheduled: order.isScheduled,
      scheduledAt: order.scheduledAt?.toISOString() ?? null,
      scheduledSlotEnd: order.scheduledSlotEnd?.toISOString() ?? null,
      deliverySlot: order.deliverySlot,
      deliverySlotLabel: scheduleMeta?.label ?? null,
    };
  }

  async getTrackByPhone(orderId: string, phoneRaw: string) {
    let normalizedPhone: string;
    try {
      normalizedPhone = normalizeCustomerPhone(phoneRaw);
    } catch {
      throw new NotFoundException('Buyurtma topilmadi');
    }

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: {
        orderNumber: true,
        status: true,
        createdAt: true,
        customerPhone: true,
        deliveryAddress: true,
        cashbackEarnedSnapshotTiyin: true,
        cashbackCreditedAt: true,
        trackingToken: true,
        isScheduled: true,
        scheduledAt: true,
        scheduledSlotEnd: true,
        deliverySlot: true,
        deliveryType: true,
        assignedCourier: { select: { fullName: true } },
      },
    });
    if (!order) {
      throw new NotFoundException('Buyurtma topilmadi');
    }

    let orderPhone = '';
    try {
      orderPhone = normalizeCustomerPhone(order.customerPhone);
    } catch {
      throw new NotFoundException('Buyurtma topilmadi');
    }
    if (orderPhone !== normalizedPhone) {
      throw new NotFoundException('Buyurtma topilmadi');
    }
    if (!order.trackingToken) {
      throw new NotFoundException('Buyurtma topilmadi');
    }

    const courierName = order.assignedCourier?.fullName?.trim() || null;
    return this.toPublicTrackPayload(order, courierName, this.deliverySlotLabel(order.deliverySlot, order.scheduledAt));
  }

  async getTrackByToken(tokenRaw: string) {
    const token = tokenRaw?.trim();
    if (!token || token.length < 16 || token.length > 128) {
      throw new NotFoundException('Buyurtma topilmadi');
    }
    if (!/^[a-f0-9]+$/i.test(token)) {
      throw new NotFoundException('Buyurtma topilmadi');
    }

    const payload = await this.cache.getOrSet(
      cacheKeys.orderTrack(token),
      CACHE_TTL.orderTrack,
      async () => {
        const order = await this.prisma.order.findUnique({
          where: { trackingToken: token },
          select: {
            orderNumber: true,
            status: true,
            createdAt: true,
            deliveryAddress: true,
            cashbackEarnedSnapshotTiyin: true,
            cashbackCreditedAt: true,
            trackingToken: true,
            updatedAt: true,
            isScheduled: true,
            scheduledAt: true,
            scheduledSlotEnd: true,
            deliverySlot: true,
            deliveryType: true,
            assignedCourier: { select: { fullName: true } },
          },
        });
        if (!order?.trackingToken) {
          return null;
        }
        const courierName = order.assignedCourier?.fullName?.trim() || null;
        const track = this.toPublicTrackPayload(
          order,
          courierName,
          this.deliverySlotLabel(order.deliverySlot, order.scheduledAt),
        );
        return { ...track, version: order.updatedAt.toISOString() };
      },
    );

    if (!payload) {
      throw new NotFoundException('Buyurtma topilmadi');
    }
    return payload;
  }

  private deliverySlotLabel(
    deliverySlot: string | null | undefined,
    scheduledAt?: Date | null,
  ): string | null {
    if (scheduledAt) {
      const parts = getTashkentDateTimeParts(scheduledAt);
      return formatExactScheduleLabel(parts.dateKey, parts.hour, parts.minute);
    }
    if (!deliverySlot) return null;
    const exact = parseDateTimeSlotKey(deliverySlot);
    if (exact) {
      return formatExactScheduleLabel(exact.dateKey, exact.hour, exact.minute);
    }
    const parsed = parseSlotKey(deliverySlot);
    if (!parsed) return null;
    return formatSlotLabel(parsed.dateKey, parsed.startHm, parsed.endHm);
  }

  private async buildStockPlan(lines: PreparedLine[]) {
    const variantLines = lines.filter((l) => l.type === 'variant');
    const productLines = lines.filter((l) => l.type === 'product');
    const variantIds = variantLines.map((l) => l.entityId);
    const productIds = productLines.map((l) => l.entityId);

    type VariantStockRow = { id: string; stock: number; productId: string };
    type ProductStockRow = { id: string; stockQuantity: number };

    const [variants, products]: [VariantStockRow[], ProductStockRow[]] = await Promise.all([
      variantIds.length
        ? this.prisma.productVariant.findMany({
            where: { id: { in: variantIds }, isActive: true },
            select: { id: true, stock: true, productId: true },
          })
        : Promise.resolve([] as VariantStockRow[]),
      productIds.length
        ? this.prisma.product.findMany({
            where: { id: { in: productIds } },
            select: { id: true, stockQuantity: true },
          })
        : Promise.resolve([] as ProductStockRow[]),
    ]);

    const variantById = new Map(variants.map((v) => [v.id, v]));
    const productById = new Map(products.map((p) => [p.id, p]));

    const variantUpdates: Array<{ id: string; nextStock: number }> = [];
    const productUpdates: Array<{ id: string; nextStock: number }> = [];
    const inventoryLogs: Array<{ productId: string; change: number; reason: 'SALE' }> = [];

    for (const line of variantLines) {
      const variant = variantById.get(line.entityId);
      if (!variant) throw new BadRequestException(`Variant not found: ${line.title}`);
      if (!hasEnoughStockForMode(variant.stock, line.quantity, line.sellingMode)) {
        throw new BadRequestException(`Insufficient stock for ${line.title}`);
      }
      variantUpdates.push({
        id: variant.id,
        nextStock: deductStockForMode(variant.stock, line.quantity, line.sellingMode),
      });
      inventoryLogs.push({ productId: variant.productId, change: -line.quantity, reason: 'SALE' });
    }

    for (const line of productLines) {
      const product = productById.get(line.entityId);
      if (!product) throw new BadRequestException(`Product not found: ${line.title}`);
      if (!hasEnoughStockForMode(product.stockQuantity, line.quantity, line.sellingMode)) {
        throw new BadRequestException(`Insufficient stock for ${line.title}`);
      }
      productUpdates.push({
        id: product.id,
        nextStock: deductStockForMode(product.stockQuantity, line.quantity, line.sellingMode),
      });
      inventoryLogs.push({ productId: product.id, change: -line.quantity, reason: 'SALE' });
    }

    return { variantUpdates, productUpdates, inventoryLogs };
  }

  private toPublicTrackPayload(
    order: {
      orderNumber?: string | null;
      status: OrderStatus;
      createdAt: Date;
      deliveryAddress: string;
      cashbackEarnedSnapshotTiyin: number;
      cashbackCreditedAt: Date | null;
      trackingToken: string | null;
      isScheduled?: boolean;
      scheduledAt?: Date | null;
      scheduledSlotEnd?: Date | null;
      deliverySlot?: string | null;
      deliveryType?: DeliveryType;
    },
    courierName: string | null,
    deliverySlotLabel?: string | null,
  ) {
    const trackingToken = order.trackingToken ?? '';
    const orderNumber = order.orderNumber ?? '';
    return {
      trackingToken,
      orderNumber,
      /** @deprecated Use orderNumber — kept for older clients */
      trackingCode: orderNumber,
      status: order.status,
      createdAt: order.createdAt.toISOString(),
      deliverySpeed: 'STANDARD' as const,
      cashbackEarnedTiyin: order.cashbackEarnedSnapshotTiyin,
      cashbackCredited: Boolean(order.cashbackCreditedAt),
      courierName,
      deliveryType: order.deliveryType ?? DeliveryType.INSTANT,
      isScheduled: Boolean(order.isScheduled),
      scheduledAt: order.scheduledAt?.toISOString() ?? null,
      scheduledSlotEnd: order.scheduledSlotEnd?.toISOString() ?? null,
      deliverySlot: order.deliverySlot ?? null,
      deliverySlotLabel: deliverySlotLabel ?? null,
    };
  }

  private async finalizeDeliveredCashback(tx: Prisma.TransactionClient, orderId: string) {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        customerId: true,
        totalAmount: true,
        cashbackEarnedSnapshotTiyin: true,
        cashbackCreditedAt: true,
      },
    });
    if (!order?.customerId || order.cashbackCreditedAt) {
      return;
    }
    const earned = order.cashbackEarnedSnapshotTiyin;
    if (earned > 0) {
      await tx.customer.update({
        where: { id: order.customerId },
        data: {
          cashbackBalance: { increment: earned },
          totalSpent: { increment: order.totalAmount },
          totalOrders: { increment: 1 },
        },
      });
      await tx.cashbackTransaction.create({
        data: {
          customerId: order.customerId,
          orderId: order.id,
          amount: earned,
          type: 'EARNED',
          status: 'COMPLETED',
        },
      });
    } else {
      await tx.customer.update({
        where: { id: order.customerId },
        data: {
          totalSpent: { increment: order.totalAmount },
          totalOrders: { increment: 1 },
        },
      });
    }
    await tx.order.update({
      where: { id: orderId },
      data: { cashbackCreditedAt: new Date() },
    });
  }

  private async refundOrderCashbackSpend(tx: Prisma.TransactionClient, orderId: string) {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      select: { id: true, customerId: true, cashbackRedeemTiyin: true },
    });
    if (!order?.customerId || !order.cashbackRedeemTiyin || order.cashbackRedeemTiyin <= 0) {
      return;
    }
    const amt = order.cashbackRedeemTiyin;
    await tx.customer.update({
      where: { id: order.customerId },
      data: { cashbackBalance: { increment: amt } },
    });
    await tx.cashbackTransaction.create({
      data: {
        customerId: order.customerId,
        orderId: order.id,
        amount: amt,
        type: 'REFUND',
        status: 'COMPLETED',
      },
    });
  }

  private async applyStatus(
    orderId: string,
    nextStatus: OrderStatus,
    actor: { role: 'PICKER' | 'COURIER' | 'ADMIN'; userId: string },
  ) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, status: true, assignedPickerId: true, assignedCourierId: true },
    });

    if (!order) {
      throw new BadRequestException('Order not found');
    }

    const currentStatus = order.status;
    if (actor.role === 'PICKER' && currentStatus === 'PICKING' && nextStatus === 'READY') {
      if (order.assignedPickerId !== actor.userId) {
        throw new ForbiddenException('Bu buyurtma sizga biriktirilmagan');
      }
    }
    if (actor.role === 'COURIER' && currentStatus === 'DELIVERING' && nextStatus === 'DELIVERED') {
      if (order.assignedCourierId !== actor.userId) {
        throw new ForbiddenException('Bu yetkazuv sizga biriktirilmagan');
      }
    }
    const allowedByRole: Record<'PICKER' | 'COURIER' | 'ADMIN', OrderStatus[]> = {
      PICKER: ['PICKING', 'READY'],
      COURIER: ['DELIVERING', 'DELIVERED'],
      ADMIN: ['PICKING', 'READY', 'DELIVERING', 'DELIVERED', 'CANCELLED'],
    };
    if (!allowedByRole[actor.role].includes(nextStatus)) {
      throw new BadRequestException(`${actor.role} cannot set status to ${nextStatus}`);
    }
    const allowedStatuses = ORDER_STATUS_TRANSITIONS[currentStatus];
    if (!allowedStatuses.includes(nextStatus)) {
      const message = `Invalid order status transition from ${currentStatus} to ${nextStatus}`;
      console.warn(`[OrdersService] ${message}`, { orderId });
      throw new BadRequestException(message);
    }

    const now = new Date();
    const updateData: Prisma.OrderUpdateInput = { status: nextStatus };
    if (nextStatus === 'PICKING') {
      updateData.pickingAt = now;
      updateData.assignedPicker = { connect: { id: actor.userId } };
    } else if (nextStatus === 'READY') {
      updateData.readyAt = now;
    } else if (nextStatus === 'DELIVERING') {
      updateData.deliveringAt = now;
      updateData.assignedCourier = { connect: { id: actor.userId } };
    } else if (nextStatus === 'DELIVERED') {
      updateData.deliveredAt = now;
    } else if (nextStatus === 'CANCELLED') {
      updateData.cancelledAt = now;
    }

    if (nextStatus === 'DELIVERED' || nextStatus === 'CANCELLED') {
      return this.prisma.$transaction(async (tx) => {
        const updated = await tx.order.update({
          where: { id: orderId },
          data: updateData,
        });
        if (nextStatus === 'DELIVERED') {
          await this.finalizeDeliveredCashback(tx, orderId);
        }
        if (nextStatus === 'CANCELLED') {
          await this.refundOrderCashbackSpend(tx, orderId);
          await this.couponsService.refundCouponOnCancel(tx, orderId);
        }
        return updated;
      });
    }

    return this.prisma.order.update({
      where: { id: orderId },
      data: updateData,
    });
  }

  async startPicking(orderId: string, userId: string) {
    return this.applyStatus(orderId, 'PICKING', { role: 'PICKER', userId });
  }

  async setReady(orderId: string, userId: string) {
    return this.applyStatus(orderId, 'READY', { role: 'PICKER', userId });
  }

  async startDelivery(orderId: string, userId: string) {
    return this.applyStatus(orderId, 'DELIVERING', { role: 'COURIER', userId });
  }

  async setDelivered(orderId: string, userId: string) {
    return this.applyStatus(orderId, 'DELIVERED', { role: 'COURIER', userId });
  }

  async cancelByAdmin(orderId: string, userId: string) {
    return this.applyStatus(orderId, 'CANCELLED', { role: 'ADMIN', userId });
  }

  async setStatusByAdmin(orderId: string, status: OrderStatus, userId: string) {
    return this.applyStatus(orderId, status, { role: 'ADMIN', userId });
  }

  listCourierQueue(courierUserId: string) {
    return this.prisma.order.findMany({
      where: {
        OR: [{ status: 'READY' }, { status: 'DELIVERING', assignedCourierId: courierUserId }],
      },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        createdAt: true,
        customerName: true,
        customerPhone: true,
        deliveryAddress: true,
        formattedAddress: true,
        manualAddress: true,
        deliveryFee: true,
        totalAmount: true,
        scheduledAt: true,
        scheduledSlotEnd: true,
        deliverySlot: true,
        isScheduled: true,
        items: {
          select: {
            id: true,
            title: true,
            quantity: true,
            price: true,
            product: { select: { imageUrl: true, name: true } },
            variant: { select: { imageUrl: true, title: true } },
          },
        },
      },
      orderBy: [{ scheduledAt: 'asc' }, { createdAt: 'desc' }],
      take: 60,
    }).then((rows) =>
      rows.map((row) => ({
        ...row,
        deliverySlotLabel: this.deliverySlotLabel(row.deliverySlot, row.scheduledAt),
      })),
    );
  }

  listForBusiness(businessProfileId: string) {
    return this.prisma.order.findMany({
      where: {
        items: {
          some: {
            OR: [
              { product: { businessId: businessProfileId } },
              { variant: { product: { businessId: businessProfileId } } },
            ],
          },
        },
      },
      include: {
        items: { include: { product: true, variant: true } },
        user: true,
        assignedPicker: true,
        assignedCourier: true,
        customer: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async listForActor(
    userId: string,
    role: string,
    opts?: {
      page?: number;
      limit?: number;
      status?: OrderStatus;
      q?: string;
      deliveryType?: 'INSTANT' | 'SCHEDULED';
      scheduledToday?: boolean;
    },
  ) {
    const r = role.toUpperCase();
    if (r === 'ADMIN' || r === 'SUPER_ADMIN') {
      return this.listPaginated(opts);
    }
    if (r === 'BUSINESS') {
      const bp = await this.prisma.businessProfile.findUnique({ where: { userId } });
      if (!bp) {
        return { items: [], page: 1, limit: 30, total: 0, totalPages: 1 };
      }
      return this.listForBusinessPaginated(bp.id, opts);
    }
    throw new ForbiddenException('Buyurtmalar ro‘yxatiga ruxsat yo‘q');
  }

  async listPaginated(opts?: {
    page?: number;
    limit?: number;
    status?: OrderStatus;
    q?: string;
    deliveryType?: 'INSTANT' | 'SCHEDULED';
    scheduledToday?: boolean;
  }) {
    const page = Math.max(1, opts?.page ?? 1);
    const limit = Math.min(100, Math.max(1, opts?.limit ?? 30));
    const skip = (page - 1) * limit;
    const q = opts?.q?.trim();

    const where: Prisma.OrderWhereInput = {};
    if (opts?.status) where.status = opts.status;
    if (opts?.deliveryType === 'INSTANT') {
      where.isScheduled = false;
    } else if (opts?.deliveryType === 'SCHEDULED') {
      where.isScheduled = true;
    }
    if (opts?.scheduledToday) {
      const today = getTashkentParts().dateKey;
      const p = parseDateKey(today);
      if (p) {
        where.isScheduled = true;
        where.scheduledAt = {
          gte: tashkentLocalToUtc(p.year, p.month, p.day, 0, 0),
          lt: tashkentLocalToUtc(p.year, p.month, p.day + 1, 0, 0),
        };
      }
    }
    if (q) {
      const or: Prisma.OrderWhereInput[] = [
        { customerName: { contains: q, mode: 'insensitive' } },
        { customerPhone: { contains: q, mode: 'insensitive' } },
        { deliveryAddress: { contains: q, mode: 'insensitive' } },
      ];
      for (const code of orderNumberSearchVariants(q)) {
        or.push({ orderNumber: { equals: code, mode: 'insensitive' } });
      }
      where.OR = or;
    }

    const [items, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip,
        take: limit,
        select: this.orderListSelect,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.order.count({ where }),
    ]);

    return {
      items: items.map((order) => ({
        ...order,
        deliverySlotLabel: this.deliverySlotLabel(order.deliverySlot, order.scheduledAt),
      })),
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  async listForBusinessPaginated(
    businessProfileId: string,
    opts?: { page?: number; limit?: number; status?: OrderStatus; q?: string },
  ) {
    const page = Math.max(1, opts?.page ?? 1);
    const limit = Math.min(100, Math.max(1, opts?.limit ?? 30));
    const skip = (page - 1) * limit;

    const where: Prisma.OrderWhereInput = {
      items: {
        some: {
          OR: [
            { product: { businessId: businessProfileId } },
            { variant: { product: { businessId: businessProfileId } } },
          ],
        },
      },
    };
    if (opts?.status) where.status = opts.status;

    const [items, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip,
        take: limit,
        select: this.orderListSelect,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.order.count({ where }),
    ]);

    return {
      items: items.map((order) => ({
        ...order,
        deliverySlotLabel: this.deliverySlotLabel(order.deliverySlot, order.scheduledAt),
      })),
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  private mapPickerOrderRow(order: PickerOrderListRow) {
    return {
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      createdAt: order.createdAt,
      pickingAt: order.pickingAt,
      deliveryFee: order.deliveryFee,
      totalAmount: order.totalAmount,
      isScheduled: order.isScheduled,
      scheduledAt: order.scheduledAt,
      scheduledSlotEnd: order.scheduledSlotEnd,
      deliverySlot: order.deliverySlot,
      assignedPickerId: order.assignedPickerId,
      deliverySlotLabel: this.deliverySlotLabel(order.deliverySlot, order.scheduledAt),
      items: mapPickerOrderItems(order.items),
    };
  }

  private pickerQueueSortPriority(
    order: { status: OrderStatus; createdAt: Date; scheduledAt: Date | null },
    prepLeadMs: number,
    nowMs: number,
  ): number {
    if (order.status === OrderStatus.PICKING) return 0;
    if (order.status === OrderStatus.PENDING_SCHEDULE) {
      const startMs = order.scheduledAt?.getTime() ?? nowMs + 86_400_000;
      const untilMs = startMs - nowMs;
      if (untilMs <= prepLeadMs) return 20 + untilMs / 60_000;
      return 300 + untilMs / 60_000;
    }
    if (order.status === OrderStatus.NEW) {
      return 120 + (nowMs - order.createdAt.getTime()) / 60_000;
    }
    return 900;
  }

  private sortPickerQueue<T extends { status: OrderStatus; createdAt: Date; scheduledAt: Date | null; id: string }>(
    orders: T[],
    prepLeadMinutes: number,
  ): T[] {
    const prepLeadMs = prepLeadMinutes * 60_000;
    const nowMs = Date.now();
    return [...orders].sort((a, b) => {
      const pa = this.pickerQueueSortPriority(a, prepLeadMs, nowMs);
      const pb = this.pickerQueueSortPriority(b, prepLeadMs, nowMs);
      if (pa !== pb) return pa - pb;
      if (a.status === OrderStatus.PENDING_SCHEDULE && b.status === OrderStatus.PENDING_SCHEDULE) {
        const sa = a.scheduledAt?.getTime() ?? 0;
        const sb = b.scheduledAt?.getTime() ?? 0;
        if (sa !== sb) return sa - sb;
      }
      return a.createdAt.getTime() - b.createdAt.getTime();
    });
  }

  async getPickerDashboard(pickerUserId: string) {
    const scheduling = await this.settingsService.getSchedulingSettings();
    const prepLeadMinutes = scheduling.prepLeadMinutes;

    const [immediateRows, scheduledRows, pickingMineRows] = await Promise.all([
      this.prisma.order.findMany({
        where: { status: OrderStatus.NEW },
        select: pickerOrderListSelect,
        take: 80,
      }),
      this.prisma.order.findMany({
        where: { status: OrderStatus.PENDING_SCHEDULE, isScheduled: true },
        select: pickerOrderListSelect,
        take: 80,
      }),
      this.prisma.order.findMany({
        where: { status: OrderStatus.PICKING, assignedPickerId: pickerUserId },
        select: pickerOrderListSelect,
        take: 40,
      }),
    ]);

    const byId = new Map<string, ReturnType<typeof this.mapPickerOrderRow>>();
    for (const row of [...immediateRows, ...scheduledRows, ...pickingMineRows]) {
      byId.set(row.id, this.mapPickerOrderRow(row));
    }

    const all = this.sortPickerQueue([...byId.values()], prepLeadMinutes);
    const scheduledOrders = all.filter((o) => o.status === OrderStatus.PENDING_SCHEDULE);
    const activeOrders = all;

    return {
      activeOrders,
      scheduledOrders,
      stats: {
        queueCount: all.length,
        newCount: all.filter((o) => o.status === OrderStatus.NEW).length,
        pickingCount: all.filter((o) => o.status === OrderStatus.PICKING).length,
        scheduledCount: scheduledOrders.length,
        prepLeadMinutes,
      },
    };
  }

  listPickerQueue(pickerUserId: string) {
    return this.getPickerDashboard(pickerUserId).then((d) => d.activeOrders);
  }

  listPickerScheduledQueue() {
    return this.prisma.order
      .findMany({
        where: { status: OrderStatus.PENDING_SCHEDULE, isScheduled: true },
        select: pickerOrderListSelect,
        orderBy: { scheduledAt: 'asc' },
        take: 80,
      })
      .then((rows) => rows.map((row) => this.mapPickerOrderRow(row)));
  }

  /** @deprecated Use listPaginated */
  listAll() {
    return this.listPaginated({ page: 1, limit: 100 }).then((r) => r.items);
  }
}
