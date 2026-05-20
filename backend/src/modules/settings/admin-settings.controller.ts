import { Body, Controller, Patch, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { SettingsService } from './settings.service';
import { UpdateSupportSettingsDto } from './dto/update-support-settings.dto';
import { UpdateHomepageBannerDto } from './dto/update-homepage-banner.dto';
import { UpdateDeliverySettingsDto } from './dto/update-delivery-settings.dto';

@Controller('admin/settings')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminSettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Patch('support')
  updateSupport(@Body() body: UpdateSupportSettingsDto) {
    return this.settingsService.updateSupportSettings({
      supportTelegramUrl: body.supportTelegramUrl,
      supportTitle: body.supportTitle,
    });
  }

  @Patch('homepage-banner')
  updateHomepageBanner(@Body() body: UpdateHomepageBannerDto) {
    return this.settingsService.updateHomepageBanner(body);
  }

  @Patch('delivery')
  updateDelivery(@Body() body: UpdateDeliverySettingsDto) {
    return this.settingsService.updateDeliverySettings(body);
  }
}
