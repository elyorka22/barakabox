import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { BusinessesService } from './businesses.service';

@Controller('businesses')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BusinessesController {
  constructor(private readonly businessesService: BusinessesService) {}

  @Post('register')
  @Roles('BUSINESS')
  register(@CurrentUser() user: { sub: string }, @Body() body: { displayName: string }) {
    return this.businessesService.registerBusiness(user.sub, body.displayName);
  }

  @Get('pending')
  @Roles('ADMIN')
  pending() {
    return this.businessesService.listPending();
  }

  @Patch(':businessId/approve')
  @Roles('ADMIN')
  approve(@Param('businessId') businessId: string) {
    return this.businessesService.approve(businessId);
  }
}
