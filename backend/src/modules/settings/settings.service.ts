import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import {
  calculateDeliveryQuote,
  defaultDeliverySettings,
  type DeliveryQuote,
  type DeliverySettings,
} from '../../common/delivery/delivery-quote.util';

const SETTINGS_ID = 'global';

export type DeliverySettingsDto = DeliverySettings;

export type DeliveryQuoteDto = DeliveryQuote;

export type PublicSettingsDto = {
  supportTelegramUrl: string | null;
  supportTitle: string | null;
  delivery: DeliverySettingsDto;
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
  constructor(private readonly prisma: PrismaService) {}

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
    const row = await this.prisma.siteSettings.findUnique({ where: { id: SETTINGS_ID } });
    return this.mapDeliverySettings(row);
  }

  async getDeliveryQuote(subtotalAmount: number): Promise<DeliveryQuoteDto> {
    const settings = await this.getDeliverySettings();
    return calculateDeliveryQuote(subtotalAmount, settings);
  }

  async getPublicSettings(): Promise<PublicSettingsDto> {
    const row = await this.prisma.siteSettings.findUnique({ where: { id: SETTINGS_ID } });
    if (!row) {
      return {
        supportTelegramUrl: null,
        supportTitle: null,
        delivery: defaultDeliverySettings(),
      };
    }
    return {
      supportTelegramUrl: row.supportTelegramUrl?.trim() || null,
      supportTitle: row.supportTitle?.trim() || null,
      delivery: this.mapDeliverySettings(row),
    };
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

    return {
      supportTelegramUrl: row.supportTelegramUrl?.trim() || null,
      supportTitle: row.supportTitle?.trim() || null,
      delivery: this.mapDeliverySettings(row),
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
