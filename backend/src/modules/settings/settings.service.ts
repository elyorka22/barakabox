import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { CacheService } from '../../infrastructure/cache/cache.service';
import { CACHE_TTL, cacheKeys } from '../../common/cache/cache-keys';
import {
  calculateDeliveryQuote,
  defaultDeliverySettings,
  type DeliveryQuote,
  type DeliverySettings,
} from '../../common/delivery/delivery-quote.util';
import {
  generateSlotsForDate,
  getTashkentParts,
  listDatesForPicker,
  mapSchedulingSettings,
  parseDateKey,
  parseSlotKey,
  resolveScheduledSlot,
  tashkentLocalToUtc,
  type DeliverySlotDto,
  type SchedulingSettings,
} from '../../common/delivery/scheduled-delivery.util';

const SETTINGS_ID = 'global';

export type DeliverySettingsDto = DeliverySettings;

export type DeliveryQuoteDto = DeliveryQuote;

export type PublicSchedulingDto = {
  enabled: boolean;
  slotMinutes: number;
  workStartHour: number;
  workEndHour: number;
  minDelayMinutes: number;
};

export type PublicSettingsDto = {
  supportTelegramUrl: string | null;
  supportTitle: string | null;
  delivery: DeliverySettingsDto;
  scheduling: PublicSchedulingDto;
};

export type HomepageBannerDto = {
  title: string;
  subtitle: string | null;
  freeDeliveryAmount: number;
  backgroundColor: string;
  isActive: boolean;
};

function isValidTelegramSupportUrl(raw: string): boolean {
  const value = raw.trim();
  if (!value) return false;
  try {
    const url = new URL(value);
    if (url.protocol === 'tg:') {
      return url.hostname === 'resolve' && Boolean(url.searchParams.get('domain')?.trim());
    }
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return false;
    const host = url.hostname.toLowerCase();
    return host === 't.me' || host === 'telegram.me' || host === 'www.telegram.me';
  } catch {
    return false;
  }
}

@Injectable()
export class SettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  private async ensureRow() {
    return this.prisma.siteSettings.upsert({
      where: { id: SETTINGS_ID },
      create: { id: SETTINGS_ID },
      update: {},
    });
  }

  private mapDeliverySettings(row: {
    deliveryPrice?: number | null;
    freeDeliveryEnabled?: boolean | null;
    freeDeliveryThreshold?: number | null;
  } | null): DeliverySettingsDto {
    const defaults = defaultDeliverySettings();
    if (!row) return defaults;
    return {
      deliveryPrice:
        typeof row.deliveryPrice === 'number' ? row.deliveryPrice : defaults.deliveryPrice,
      freeDeliveryEnabled:
        typeof row.freeDeliveryEnabled === 'boolean'
          ? row.freeDeliveryEnabled
          : defaults.freeDeliveryEnabled,
      freeDeliveryThreshold:
        typeof row.freeDeliveryThreshold === 'number'
          ? row.freeDeliveryThreshold
          : defaults.freeDeliveryThreshold,
    };
  }

  async getDeliverySettings(): Promise<DeliverySettingsDto> {
    return this.cache.getOrSet(cacheKeys.deliverySettings(), CACHE_TTL.deliverySettings, async () => {
      const row = await this.prisma.siteSettings.findUnique({ where: { id: SETTINGS_ID } });
      return this.mapDeliverySettings(row);
    });
  }

  async getDeliveryQuote(subtotalAmount: number): Promise<DeliveryQuoteDto> {
    const settings = await this.getDeliverySettings();
    return calculateDeliveryQuote(subtotalAmount, settings);
  }

  async getPublicSettings(): Promise<PublicSettingsDto> {
    return this.cache.getOrSet(cacheKeys.publicSettings(), CACHE_TTL.publicSettings, async () => {
      const row = await this.prisma.siteSettings.findUnique({ where: { id: SETTINGS_ID } });
      if (!row) {
        const scheduling = mapSchedulingSettings(null);
        return {
          supportTelegramUrl: null,
          supportTitle: null,
          delivery: defaultDeliverySettings(),
          scheduling: this.mapPublicScheduling(scheduling),
        };
      }
      const scheduling = mapSchedulingSettings(row);
      return {
        supportTelegramUrl: row.supportTelegramUrl?.trim() || null,
        supportTitle: row.supportTitle?.trim() || null,
        delivery: this.mapDeliverySettings(row),
        scheduling: this.mapPublicScheduling(scheduling),
      };
    });
  }

  async updateDeliverySettings(input: Partial<DeliverySettingsDto>): Promise<DeliverySettingsDto> {
    await this.ensureRow();
    const data: Record<string, number | boolean> = {};

    if (input.deliveryPrice !== undefined) {
      const price = Math.round(Number(input.deliveryPrice));
      if (!Number.isFinite(price) || price < 0) {
        throw new BadRequestException('Yetkazish narxi noto‘g‘ri');
      }
      data.deliveryPrice = price;
    }

    if (input.freeDeliveryEnabled !== undefined) {
      data.freeDeliveryEnabled = Boolean(input.freeDeliveryEnabled);
    }

    if (input.freeDeliveryThreshold !== undefined) {
      const threshold = Math.round(Number(input.freeDeliveryThreshold));
      if (!Number.isFinite(threshold) || threshold < 0) {
        throw new BadRequestException('Bepul yetkazish chegarasi noto‘g‘ri');
      }
      data.freeDeliveryThreshold = threshold;
    }

    const row = await this.prisma.siteSettings.update({
      where: { id: SETTINGS_ID },
      data,
    });
    await this.cache.del(cacheKeys.deliverySettings());
    await this.cache.del(cacheKeys.publicSettings());
    return this.mapDeliverySettings(row);
  }

  async updateSupportSettings(input: {
    supportTelegramUrl?: string | null;
    supportTitle?: string | null;
  }): Promise<PublicSettingsDto> {
    await this.ensureRow();

    const data: { supportTelegramUrl?: string | null; supportTitle?: string | null } = {};

    if (input.supportTelegramUrl !== undefined) {
      const url = input.supportTelegramUrl === null ? null : String(input.supportTelegramUrl).trim();
      if (url && !isValidTelegramSupportUrl(url)) {
        throw new BadRequestException(
          'Telegram havolasi noto‘g‘ri. Masalan: https://t.me/username yoki tg://resolve?domain=username',
        );
      }
      data.supportTelegramUrl = url || null;
    }

    if (input.supportTitle !== undefined) {
      const title = input.supportTitle === null ? null : String(input.supportTitle).trim();
      data.supportTitle = title || null;
    }

    const row = await this.prisma.siteSettings.update({
      where: { id: SETTINGS_ID },
      data,
    });

    await this.cache.del(cacheKeys.publicSettings());
    const scheduling = mapSchedulingSettings(row);
    return {
      supportTelegramUrl: row.supportTelegramUrl?.trim() || null,
      supportTitle: row.supportTitle?.trim() || null,
      delivery: this.mapDeliverySettings(row),
      scheduling: this.mapPublicScheduling(scheduling),
    };
  }

  private async ensureHomepageBanner() {
    return this.prisma.homepageBanner.upsert({
      where: { id: 'default' },
      create: { id: 'default' },
      update: {},
    });
  }

  async getHomepageBanner(): Promise<HomepageBannerDto> {
    const row = await this.ensureHomepageBanner();
    return {
      title: row.title?.trim() || '',
      subtitle: row.subtitle?.trim() || null,
      freeDeliveryAmount: row.freeDeliveryAmount,
      backgroundColor: row.backgroundColor?.trim() || '#F2E5CC',
      isActive: row.isActive,
    };
  }

  async updateHomepageBanner(input: Partial<HomepageBannerDto>): Promise<HomepageBannerDto> {
    await this.ensureHomepageBanner();
    const data: Record<string, unknown> = {};
    if (input.title !== undefined) data.title = String(input.title).trim();
    if (input.subtitle !== undefined) {
      data.subtitle = input.subtitle === null ? null : String(input.subtitle).trim() || null;
    }
    if (input.freeDeliveryAmount !== undefined) {
      const amount = Math.round(Number(input.freeDeliveryAmount));
      if (!Number.isFinite(amount) || amount < 0) {
        throw new BadRequestException('Bepul yetkazish summasi noto‘g‘ri');
      }
      data.freeDeliveryAmount = amount;
    }
    if (input.backgroundColor !== undefined) {
      const color = String(input.backgroundColor).trim();
      if (!/^#[0-9A-Fa-f]{6}$/.test(color)) {
        throw new BadRequestException('Rang kodi #RRGGBB formatida bo‘lishi kerak');
      }
      data.backgroundColor = color;
    }
    if (input.isActive !== undefined) data.isActive = Boolean(input.isActive);

    const row = await this.prisma.homepageBanner.update({
      where: { id: 'default' },
      data,
    });
    return this.getHomepageBannerFromRow(row);
  }

  private mapPublicScheduling(s: SchedulingSettings): PublicSchedulingDto {
    return {
      enabled: s.scheduledOrdersEnabled,
      slotMinutes: s.slotMinutes,
      workStartHour: s.workStartHour,
      workEndHour: s.workEndHour,
      minDelayMinutes: s.minDelayMinutes,
    };
  }

  async getSchedulingSettings(): Promise<SchedulingSettings> {
    return this.cache.getOrSet(cacheKeys.schedulingSettings(), CACHE_TTL.schedulingSettings, async () => {
      const row = await this.prisma.siteSettings.findUnique({ where: { id: SETTINGS_ID } });
      return mapSchedulingSettings(row);
    });
  }

  async updateSchedulingSettings(input: Partial<SchedulingSettings>): Promise<SchedulingSettings> {
    await this.ensureRow();
    const data: Record<string, number | boolean> = {};

    if (input.scheduledOrdersEnabled !== undefined) {
      data.scheduledOrdersEnabled = Boolean(input.scheduledOrdersEnabled);
    }
    if (input.slotMinutes !== undefined) {
      data.scheduleSlotMinutes = input.slotMinutes <= 30 ? 30 : 60;
    }
    if (input.workStartHour !== undefined) {
      data.scheduleWorkStartHour = Math.max(0, Math.min(23, Math.round(input.workStartHour)));
    }
    if (input.workEndHour !== undefined) {
      const end = Math.max(1, Math.min(24, Math.round(input.workEndHour)));
      data.scheduleWorkEndHour = end;
    }
    if (input.minDelayMinutes !== undefined) {
      data.scheduleMinDelayMinutes = Math.max(15, Math.min(1440, Math.round(input.minDelayMinutes)));
    }
    if (input.maxOrdersPerSlot !== undefined) {
      data.scheduleMaxOrdersPerSlot = Math.max(1, Math.min(500, Math.round(input.maxOrdersPerSlot)));
    }
    if (input.prepLeadMinutes !== undefined) {
      data.schedulePrepLeadMinutes = Math.max(5, Math.min(1440, Math.round(input.prepLeadMinutes)));
    }

    const row = await this.prisma.siteSettings.update({ where: { id: SETTINGS_ID }, data });
    await this.cache.del(cacheKeys.schedulingSettings());
    await this.cache.del(cacheKeys.publicSettings());
    return mapSchedulingSettings(row);
  }

  async resolveSlotForOrder(slotKey: string) {
    const settings = await this.getSchedulingSettings();
    const parsed = parseSlotKey(slotKey);
    if (!parsed) {
      throw new BadRequestException('Yetkazish vaqti noto‘g‘ri');
    }
    const booked = await this.countBookedSlotsForDate(parsed.dateKey);
    try {
      return resolveScheduledSlot(slotKey, settings, booked);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Yetkazish vaqti mavjud emas';
      throw new BadRequestException(message);
    }
  }

  async getAvailableDeliverySlots(dateKey: string): Promise<{
    dateKey: string;
    dates: string[];
    slots: DeliverySlotDto[];
  }> {
    const parsed = parseDateKey(dateKey);
    if (!parsed) {
      throw new BadRequestException('Sana noto‘g‘ri');
    }
    const settings = await this.getSchedulingSettings();
    if (!settings.scheduledOrdersEnabled) {
      return { dateKey, dates: listDatesForPicker(7), slots: [] };
    }

    return this.cache.getOrSet(cacheKeys.deliverySlots(dateKey), CACHE_TTL.deliverySlots, async () => {
      const booked = await this.countBookedSlotsForDate(dateKey);
      const slots = generateSlotsForDate(dateKey, settings, booked);
      return {
        dateKey,
        dates: listDatesForPicker(7),
        slots,
      };
    });
  }

  async countBookedSlotsForDate(dateKey: string): Promise<Map<string, number>> {
    const parsed = parseDateKey(dateKey);
    if (!parsed) return new Map();
    const start = tashkentLocalToUtc(parsed.year, parsed.month, parsed.day, 0, 0);
    const end = tashkentLocalToUtc(parsed.year, parsed.month, parsed.day + 1, 0, 0);
    const rows = await this.prisma.order.groupBy({
      by: ['deliverySlot'],
      where: {
        isScheduled: true,
        deliverySlot: { not: null },
        status: { notIn: ['CANCELLED'] },
        scheduledAt: { gte: start, lt: end },
      },
      _count: { _all: true },
    });
    const map = new Map<string, number>();
    for (const row of rows) {
      if (row.deliverySlot) map.set(row.deliverySlot, row._count._all);
    }
    return map;
  }

  private getHomepageBannerFromRow(row: {
    title: string;
    subtitle: string | null;
    freeDeliveryAmount: number;
    backgroundColor: string;
    isActive: boolean;
  }): HomepageBannerDto {
    return {
      title: row.title?.trim() || '',
      subtitle: row.subtitle?.trim() || null,
      freeDeliveryAmount: row.freeDeliveryAmount,
      backgroundColor: row.backgroundColor?.trim() || '#F2E5CC',
      isActive: row.isActive,
    };
  }
}
