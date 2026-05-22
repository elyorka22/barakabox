import { Module } from '@nestjs/common';
import { SettingsController } from './settings.controller';
import { DeliveryController } from './delivery.controller';
import { AdminSettingsController } from './admin-settings.controller';
import { SettingsService } from './settings.service';

@Module({
  controllers: [SettingsController, DeliveryController, AdminSettingsController],
  providers: [SettingsService],
  exports: [SettingsService],
})
export class SettingsModule {}
