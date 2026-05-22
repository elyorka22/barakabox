import { Controller, Get, Query } from '@nestjs/common';
import { getTashkentParts } from '../../common/delivery/scheduled-delivery.util';
import { SettingsService } from './settings.service';

/** Public delivery scheduling API (storefront checkout). */
@Controller('delivery')
export class DeliveryController {
  constructor(private readonly settingsService: SettingsService) {}

  /** @deprecated Use GET /delivery/scheduling-rules + client-side datetime pickers */
  @Get('slots')
  getSlots(@Query('date') date?: string) {
    const dateKey = date?.trim() || getTashkentParts().dateKey;
    return this.settingsService.getAvailableDeliverySlots(dateKey);
  }

  @Get('scheduling-rules')
  getSchedulingRules() {
    return this.settingsService.getSchedulingRulesForStorefront();
  }
}
