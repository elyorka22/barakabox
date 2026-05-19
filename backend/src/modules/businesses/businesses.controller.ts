import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { BusinessesService } from './businesses.service';
import { CreateBusinessStoreDto } from './dto/create-business-store.dto';
import { UpdateBusinessByAdminDto, UpdateBusinessProfileDto } from './dto/update-business-profile.dto';

@Controller('businesses')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BusinessesController {
  constructor(private readonly businessesService: BusinessesService) {}

  @Post('register')
  @Roles('BUSINESS')
  register(@CurrentUser() user: { sub: string }, @Body() body: { displayName: string }) {
    return this.businessesService.registerBusiness(user.sub, body.displayName);
  }

  @Get('dashboard')
  @Roles('BUSINESS')
  dashboard(@CurrentUser() user: { sub: string }) {
    return this.businessesService.getDashboard(user.sub);
  }

  @Get('me')
  @Roles('BUSINESS')
  me(@CurrentUser() user: { sub: string }) {
    return this.businessesService.getMyProfile(user.sub);
  }

  @Patch('me')
  @Roles('BUSINESS')
  updateMe(@CurrentUser() user: { sub: string }, @Body() body: UpdateBusinessProfileDto) {
    return this.businessesService.updateMyProfile(user.sub, body);
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

  @Post('store')
  @Roles('ADMIN')
  createStore(@Body() body: CreateBusinessStoreDto) {
    return this.businessesService.createStoreByAdmin(body);
  }

  @Post('inline')
  @Roles('ADMIN')
  createInline(@Body() body: { name: string; phone?: string }) {
    return this.businessesService.createInlineByAdmin(body);
  }

  @Patch(':businessId')
  @Roles('ADMIN')
  updateByAdmin(@Param('businessId') businessId: string, @Body() body: UpdateBusinessByAdminDto) {
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

  @Patch(':businessId/reject')
  @Roles('ADMIN')
  reject(@Param('businessId') businessId: string) {
    return this.businessesService.reject(businessId);
  }

  @Get('my-stats')
  @Roles('BUSINESS')
  myStats(@CurrentUser() user: { sub: string }) {
    return this.businessesService.getMyStats(user.sub);
  }
}
