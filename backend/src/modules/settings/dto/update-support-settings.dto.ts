import { IsOptional, IsString, MaxLength, ValidateIf } from 'class-validator';

export class UpdateSupportSettingsDto {
  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== undefined && String(v).trim() !== '')
  @IsString()
  @MaxLength(500)
  supportTelegramUrl?: string | null;

  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== undefined && String(v).trim() !== '')
  @IsString()
  @MaxLength(120)
  supportTitle?: string | null;
}
