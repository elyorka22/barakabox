import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';

const SETTINGS_ID = 'global';

export type PublicSettingsDto = {
  supportTelegramUrl: string | null;
  supportTitle: string | null;
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

  async getPublicSettings(): Promise<PublicSettingsDto> {
    const row = await this.prisma.siteSettings.findUnique({ where: { id: SETTINGS_ID } });
    if (!row) {
      return { supportTelegramUrl: null, supportTitle: null };
    }
    return {
      supportTelegramUrl: row.supportTelegramUrl?.trim() || null,
      supportTitle: row.supportTitle?.trim() || null,
    };
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
    };
  }
}
