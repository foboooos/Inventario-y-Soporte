import { Type } from 'class-transformer';
import { IsEnum, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { DeviceStatus } from '../device-status.enum.js';

export const INVENTORY_SORT_KEYS = ['code', 'location', 'status'] as const;
export type InventorySortKey = (typeof INVENTORY_SORT_KEYS)[number];

export class QueryInventoryDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @IsOptional()
  @IsEnum(DeviceStatus)
  estado?: DeviceStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 10;

  @IsOptional()
  @IsIn(INVENTORY_SORT_KEYS)
  sortBy: InventorySortKey = 'code';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortDir: 'asc' | 'desc' = 'asc';
}
