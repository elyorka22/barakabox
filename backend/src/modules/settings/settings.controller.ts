import { Controller, Get, Query } from '@nestjs/common';
import { SettingsService } from './settings.service';

@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get('public')
  getPublic() {
    return this.settingsService.getPublicSettings();
  }

  @Get('homepage-banner')
  getHomepageBanner() {
    return this.settingsService.getHomepageBanner();
  }

  @Get('delivery')
  getDelivery() {
    return this.settingsService.getDeliverySettings();
  }

  @Get('delivery-quote')
  getDeliveryQuote(@Query('subtotal') subtotal?: string) {
    return this.settingsService.getDeliveryQuote(Number(subtotal || 0));
  }
}
