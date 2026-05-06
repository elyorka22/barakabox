import { IsIn } from 'class-validator';

export class UpdateOrderStatusDto {
  @IsIn(['ACCEPTED', 'REJECTED', 'DELIVERING', 'COMPLETED'])
  status!: 'ACCEPTED' | 'REJECTED' | 'DELIVERING' | 'COMPLETED';
}
