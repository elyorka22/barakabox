import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/decorators/current-user.decorator';
import { BusinessStoreStaffService } from './business-store-staff.service';
import {
  CreateBusinessStoreStaffDto,
  UpdateBusinessStoreStaffDto,
} from './dto/business-store-staff.dto';

@Controller('businesses/team')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('STORE_OWNER')
export class BusinessStoreStaffController {
  constructor(private readonly teamService: BusinessStoreStaffService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.teamService.listForOwner(user.sub);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateBusinessStoreStaffDto) {
    return this.teamService.createForOwner(user.sub, user.role, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateBusinessStoreStaffDto,
  ) {
    return this.teamService.updateForOwner(user.sub, user.role, id, dto);
  }
}
