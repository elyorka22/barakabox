import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Min, ValidateIf } from 'class-validator';

export const TOP_PRODUCT_BADGE_VALUES = ['TOP', 'Trend', 'Mashhur', 'Tavsiya'] as const;

export type TopProductBadgeValue = (typeof TOP_PRODUCT_BADGE_VALUES)[number];

export class ProductTopFieldsDto {
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @Type(() => Boolean)
  @IsBoolean()
  isTopProduct?: boolean;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === '' || value === undefined || value === null) return undefined;
    const n = Number(value);
    return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : undefined;
  })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  topOrder?: number;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined) return undefined;
    if (value === null || value === '') return null;
    const trimmed = String(value).trim();
    return trimmed || null;
  })
  @ValidateIf((o) => o.topBadge !== undefined && o.topBadge !== null && o.topBadge !== '')
  @IsIn([...TOP_PRODUCT_BADGE_VALUES])
  @IsString()
  topBadge?: string | null;
}
