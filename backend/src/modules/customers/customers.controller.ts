import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { CustomersService } from './customers.service';

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
}
