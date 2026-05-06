import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
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

  @Get('approved')
  @Roles('ADMIN')
  approved() {
    return this.businessesService.listApproved();
  }

  @Get()
  @Roles('ADMIN')
  listAll() {
    return this.businessesService.listAll();
  }

  @Post()
  @Roles('ADMIN')
  createByAdmin(@Body() body: { userId: string; displayName: string; phone?: string }) {
    return this.businessesService.createByAdmin(body);
  }

  @Post('inline')
  @Roles('ADMIN')
  createInline(@Body() body: { name: string; phone?: string }) {
    return this.businessesService.createInlineByAdmin(body);
  }

  @Patch(':businessId')
  @Roles('ADMIN')
  updateByAdmin(@Param('businessId') businessId: string, @Body() body: { displayName?: string; phone?: string; isActive?: boolean }) {
    return this.businessesService.updateByAdmin(businessId, body);
  }

  @Delete(':businessId')
  @Roles('ADMIN')
  removeByAdmin(@Param('businessId') businessId: string) {
    return this.businessesService.removeByAdmin(businessId);
  }

  @Patch(':businessId/approve')
  @Roles('ADMIN')
  approve(@Param('businessId') businessId: string) {
    return this.businessesService.approve(businessId);
  }

  @Get('my-stats')
  @Roles('BUSINESS')
  myStats(@CurrentUser() user: { sub: string }) {
    return this.businessesService.getMyStats(user.sub);
  }
}
