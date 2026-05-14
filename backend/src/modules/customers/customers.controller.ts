import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { CustomersService } from './customers.service';
import { CreateCustomerAddressDto } from './dto/customer-address.dto';

@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get('cashback-balance')
  cashbackBalance(@Query('phone') phone?: string) {
    if (!phone?.trim()) {
      throw new BadRequestException('phone query required');
    }
    return this.customersService.getBalanceByPhone(phone);
  }

  @Get('addresses')
  listAddresses(@Query('phone') phone?: string) {
    if (!phone?.trim()) throw new BadRequestException('phone kerak');
    return this.customersService.listAddressesByPhone(phone);
  }

  @Post('addresses')
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  createAddress(@Body() body: CreateCustomerAddressDto) {
    return this.customersService.createCustomerAddress(body);
  }

  @Delete('addresses/:addressId')
  deleteAddress(@Param('addressId') addressId: string, @Query('phone') phone?: string) {
    if (!phone?.trim()) throw new BadRequestException('phone kerak');
    return this.customersService.deleteCustomerAddress(phone, addressId);
  }

  @Patch('addresses/:addressId/default')
  setDefaultAddress(@Param('addressId') addressId: string, @Query('phone') phone?: string) {
    if (!phone?.trim()) throw new BadRequestException('phone kerak');
    return this.customersService.setDefaultCustomerAddress(phone, addressId);
  }
}
