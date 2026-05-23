import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsInt, IsOptional, IsString, Min, ValidateNested } from 'class-validator';

const TOP_BADGE_VALUES = new Set(['TOP', 'Trend', 'Mashhur', 'Tavsiya']);

class TopProductItemDto {
  @IsString()
  id!: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isTopProduct?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  topOrder?: number;

  @IsOptional()
  @IsString()
  topBadge?: string | null;
}

export class UpdateTopProductsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TopProductItemDto)
  items!: TopProductItemDto[];
}

export function normalizeTopBadgeInput(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return TOP_BADGE_VALUES.has(trimmed) ? trimmed : undefined;
}
