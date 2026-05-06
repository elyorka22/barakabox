import { IsIn } from 'class-validator';

export class UpdateOrderStatusDto {
  @IsIn(['NEW', 'PICKING', 'READY', 'DELIVERING', 'DELIVERED', 'CANCELLED'])
  status!: 'NEW' | 'PICKING' | 'READY' | 'DELIVERING' | 'DELIVERED' | 'CANCELLED';
}
