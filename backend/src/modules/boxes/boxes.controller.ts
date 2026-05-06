import { Controller, Get, Param } from '@nestjs/common';
import { BoxesService } from './boxes.service';

@Controller('boxes')
export class BoxesController {
  constructor(private readonly boxesService: BoxesService) {}

  @Get()
  list() {
    return this.boxesService.list();
  }

  @Get(':id')
  getById(@Param('id') id: string) {
    return this.boxesService.getById(id);
  }
}
