import { Module } from '@nestjs/common';
import { AdminBannersController, BannersController } from './banners.controller';
import { BannersService } from './banners.service';

@Module({
  controllers: [BannersController, AdminBannersController],
  providers: [BannersService],
  exports: [BannersService],
})
export class BannersModule {}
